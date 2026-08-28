"""SnowNLP sentiment scores, orientation (mean) and polarization (std)."""

from __future__ import annotations

import pandas as pd
from snownlp import SnowNLP

SENTIMENT_COL = "sentiment_score"


def score_text(text: str) -> float:
    raw = str(text).strip()
    if not raw:
        return float("nan")
    return float(SnowNLP(raw).sentiments)


def score_frame(df: pd.DataFrame, text_col: str, score_col: str = SENTIMENT_COL) -> pd.DataFrame:
    out = df.copy()
    out[score_col] = out[text_col].map(score_text)
    return out


def summarize_sentiment(
    df: pd.DataFrame,
    score_col: str = SENTIMENT_COL,
    group_cols: list[str] | None = None,
) -> pd.DataFrame:
    """Mean = sentiment orientation; std = sentiment polarization."""
    cols = group_cols or []
    if cols:
        grouped = df.groupby(cols, dropna=False)[score_col]
        summary = grouped.agg(sentiment_mean="mean", sentiment_std="std", n="count")
        return summary.reset_index()
    return pd.DataFrame(
        [
            {
                "sentiment_mean": float(df[score_col].mean()),
                "sentiment_std": float(df[score_col].std(ddof=1)) if len(df) > 1 else 0.0,
                "n": int(df[score_col].notna().sum()),
            }
        ]
    )
