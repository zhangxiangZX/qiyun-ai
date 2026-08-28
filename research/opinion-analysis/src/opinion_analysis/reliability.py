"""Dual-coder Kappa (10% sample) and Cronbach's alpha for scale items."""

from __future__ import annotations

import pandas as pd
from sklearn.metrics import cohen_kappa_score

from .config import CRONBACH_PASS, KAPPA_PASS, KAPPA_SAMPLE_FRAC, RANDOM_STATE


def draw_kappa_sample(
    df: pd.DataFrame,
    frac: float = KAPPA_SAMPLE_FRAC,
    random_state: int = RANDOM_STATE,
) -> pd.DataFrame:
    if df.empty:
        raise ValueError("cannot sample an empty corpus")
    n = max(1, int(round(len(df) * frac)))
    n = min(n, len(df))
    return df.sample(n=n, random_state=random_state).copy()


def cohen_kappa(coder1: pd.Series, coder2: pd.Series) -> float:
    a = coder1.astype(str)
    b = coder2.astype(str)
    mask = a.notna() & b.notna() & (a != "") & (b != "") & (a != "nan") & (b != "nan")
    if mask.sum() < 2:
        raise ValueError("need at least 2 paired codes to compute Kappa")
    return float(cohen_kappa_score(a[mask], b[mask]))


def kappa_report(coder1: pd.Series, coder2: pd.Series, threshold: float = KAPPA_PASS) -> dict:
    value = cohen_kappa(coder1, coder2)
    return {
        "kappa": value,
        "threshold": threshold,
        "pass": bool(value >= threshold),
        "n_paired": int(coder1.notna().sum()),
    }


def cronbach_alpha(items: pd.DataFrame) -> dict:
    """Cronbach's α for scale items; pass if α ≥ 0.7."""
    data = items.apply(pd.to_numeric, errors="coerce").dropna()
    k = data.shape[1]
    if k < 2 or data.shape[0] < 2:
        raise ValueError("Cronbach's alpha needs ≥2 items and ≥2 complete rows")
    item_vars = data.var(axis=0, ddof=1)
    total_var = data.sum(axis=1).var(ddof=1)
    if total_var == 0:
        alpha = 0.0
    else:
        alpha = float((k / (k - 1.0)) * (1.0 - item_vars.sum() / total_var))
    return {
        "alpha": alpha,
        "n_items": int(k),
        "n_rows": int(data.shape[0]),
        "threshold": CRONBACH_PASS,
        "pass": bool(alpha >= CRONBACH_PASS),
    }
