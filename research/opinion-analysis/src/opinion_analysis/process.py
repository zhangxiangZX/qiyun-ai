"""Hayes PROCESS-style Model 4 and mediated moderation with bootstrap."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .config import N_BOOTSTRAP, RANDOM_STATE, STAGE_ORDER


def _design(*cols: np.ndarray) -> np.ndarray:
    n = len(cols[0])
    return np.column_stack([np.ones(n), *cols])


def _ols(y: np.ndarray, x: np.ndarray) -> np.ndarray:
    beta, _, _, _ = np.linalg.lstsq(x, y, rcond=None)
    return beta


def _as_float(series: pd.Series) -> np.ndarray:
    return pd.to_numeric(series, errors="coerce").to_numpy(dtype=float)


def model4_point(x: np.ndarray, m: np.ndarray, y: np.ndarray) -> dict[str, float]:
    """X → M → Y (Hayes Model 4)."""
    mask = np.isfinite(x) & np.isfinite(m) & np.isfinite(y)
    x, m, y = x[mask], m[mask], y[mask]
    a = _ols(m, _design(x))
    b_c = _ols(y, _design(x, m))
    a_path = float(a[1])
    direct = float(b_c[1])
    b_path = float(b_c[2])
    indirect = a_path * b_path
    return {
        "a_x_to_m": a_path,
        "b_m_to_y": b_path,
        "direct_c_prime": direct,
        "indirect_ab": indirect,
        "total": direct + indirect,
        "n": float(len(x)),
    }


def bootstrap_model4(
    x: np.ndarray,
    m: np.ndarray,
    y: np.ndarray,
    n_boot: int = N_BOOTSTRAP,
    random_state: int = RANDOM_STATE,
    alpha: float = 0.05,
) -> dict:
    rng = np.random.default_rng(random_state)
    point = model4_point(x, m, y)
    n = int(point["n"])
    draws = np.empty(n_boot)
    x_m, m_m, y_m = x[:], m[:], y[:]
    finite = np.isfinite(x_m) & np.isfinite(m_m) & np.isfinite(y_m)
    x_m, m_m, y_m = x_m[finite], m_m[finite], y_m[finite]
    n = len(x_m)
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        draws[i] = model4_point(x_m[idx], m_m[idx], y_m[idx])["indirect_ab"]
    lo, hi = np.quantile(draws, [alpha / 2, 1 - alpha / 2])
    return {
        **point,
        "n_boot": n_boot,
        "indirect_ci_low": float(lo),
        "indirect_ci_high": float(hi),
        "indirect_significant": bool(lo > 0 or hi < 0),
    }


def _stage_numeric(stage: pd.Series) -> np.ndarray:
    mapping = {name: i for i, name in enumerate(STAGE_ORDER)}
    if stage.dtype == object or str(stage.dtype).startswith("string"):
        return stage.map(lambda v: mapping.get(str(v), np.nan)).to_numpy(dtype=float)
    return _as_float(stage)


def model8_point(x: np.ndarray, m: np.ndarray, y: np.ndarray, w: np.ndarray) -> dict[str, float]:
    """Mediated moderation (Hayes Model 8): W moderates X→M and X→Y, M→Y."""
    mask = np.isfinite(x) & np.isfinite(m) & np.isfinite(y) & np.isfinite(w)
    x, m, y, w = x[mask], m[mask], y[mask], w[mask]
    xw = x * w
    a = _ols(m, _design(x, w, xw))
    by = _ols(y, _design(x, w, xw, m))
    a1, a2, a3 = float(a[1]), float(a[2]), float(a[3])
    c1, c2, c3, b = float(by[1]), float(by[2]), float(by[3]), float(by[4])
    return {
        "a1_x_to_m": a1,
        "a2_w_to_m": a2,
        "a3_xw_to_m": a3,
        "c1_direct": c1,
        "c2_w_to_y": c2,
        "c3_xw_to_y": c3,
        "b_m_to_y": b,
        "n": float(len(x)),
    }


def conditional_effects(point: dict[str, float], w_values: dict[str, float]) -> list[dict]:
    rows = []
    for label, w in w_values.items():
        a_cond = point["a1_x_to_m"] + point["a3_xw_to_m"] * w
        indirect = a_cond * point["b_m_to_y"]
        direct = point["c1_direct"] + point["c3_xw_to_y"] * w
        rows.append(
            {
                "stage": label,
                "w": w,
                "conditional_a": a_cond,
                "conditional_indirect": indirect,
                "conditional_direct": direct,
            }
        )
    return rows


def bootstrap_model8(
    x: np.ndarray,
    m: np.ndarray,
    y: np.ndarray,
    w: np.ndarray,
    stage_labels: dict[str, float],
    n_boot: int = N_BOOTSTRAP,
    random_state: int = RANDOM_STATE,
    alpha: float = 0.05,
) -> dict:
    rng = np.random.default_rng(random_state)
    point = model8_point(x, m, y, w)
    mask = np.isfinite(x) & np.isfinite(m) & np.isfinite(y) & np.isfinite(w)
    x, m, y, w = x[mask], m[mask], y[mask], w[mask]
    n = len(x)
    keys = list(stage_labels.keys())
    indirect_draws = {k: np.empty(n_boot) for k in keys}
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        boot_point = model8_point(x[idx], m[idx], y[idx], w[idx])
        for row in conditional_effects(boot_point, stage_labels):
            indirect_draws[row["stage"]][i] = row["conditional_indirect"]
    cond = []
    for row in conditional_effects(point, stage_labels):
        draws = indirect_draws[row["stage"]]
        lo, hi = np.quantile(draws, [alpha / 2, 1 - alpha / 2])
        cond.append(
            {
                **row,
                "indirect_ci_low": float(lo),
                "indirect_ci_high": float(hi),
                "indirect_significant": bool(lo > 0 or hi < 0),
            }
        )
    return {**point, "n_boot": n_boot, "conditional": cond}


def stage_stratified_model4(
    frame: pd.DataFrame,
    x_col: str,
    m_col: str,
    y_col: str,
    stage_col: str,
    n_boot: int,
    random_state: int,
) -> list[dict]:
    """Compare X→M and X→Y style coefficients across lifecycle stages via Model 4."""
    rows = []
    for stage, group in frame.groupby(stage_col):
        if len(group) < 8:
            continue
        result = bootstrap_model4(
            _as_float(group[x_col]),
            _as_float(group[m_col]),
            _as_float(group[y_col]),
            n_boot=n_boot,
            random_state=random_state,
        )
        result["stage"] = str(stage)
        rows.append(result)
    return rows


def run_process(
    frame: pd.DataFrame,
    x_col: str,
    m_col: str,
    y_col: str,
    stage_col: str,
    n_boot: int = N_BOOTSTRAP,
    random_state: int = RANDOM_STATE,
) -> tuple[dict, dict]:
    x = _as_float(frame[x_col])
    m = _as_float(frame[m_col])
    y = _as_float(frame[y_col])
    w = _stage_numeric(frame[stage_col])
    model4 = bootstrap_model4(x, m, y, n_boot=n_boot, random_state=random_state)
    labels = {name: float(i) for i, name in enumerate(STAGE_ORDER)}
    present = set(frame[stage_col].astype(str))
    labels = {k: v for k, v in labels.items() if k in present} or {"all": 0.0}
    model8 = bootstrap_model8(x, m, y, w, labels, n_boot=n_boot, random_state=random_state)
    model8["stage_stratified_model4"] = stage_stratified_model4(
        frame, x_col, m_col, y_col, stage_col, n_boot, random_state
    )
    return model4, model8
