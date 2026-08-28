"""Descriptive statistics: mean, std, extrema (SPSS-equivalent)."""

from __future__ import annotations

import pandas as pd


def descriptives(df: pd.DataFrame, columns: list[str] | None = None) -> pd.DataFrame:
    cols = columns or [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    rows = []
    for col in cols:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        rows.append(
            {
                "variable": col,
                "n": int(series.shape[0]),
                "mean": float(series.mean()),
                "std": float(series.std(ddof=1)) if series.shape[0] > 1 else 0.0,
                "min": float(series.min()),
                "max": float(series.max()),
            }
        )
    return pd.DataFrame(rows)
