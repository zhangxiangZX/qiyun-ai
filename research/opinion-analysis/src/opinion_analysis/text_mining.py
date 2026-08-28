"""LDA topic clustering for opinion-leader posts and netizen comments."""

from __future__ import annotations

from typing import Iterable

import jieba
import pandas as pd
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer

from .config import LDA_MAX_FEATURES, LDA_TOPICS, RANDOM_STATE

_STOPWORDS = {
    "的",
    "了",
    "是",
    "在",
    "我",
    "有",
    "和",
    "就",
    "不",
    "人",
    "都",
    "一",
    "一个",
    "上",
    "也",
    "很",
    "到",
    "说",
    "要",
    "去",
    "你",
    "会",
    "着",
    "没有",
    "看",
    "好",
    "自己",
    "这",
    "那",
    "什么",
    "能",
    "这个",
    "就是",
    "还是",
    "因为",
    "所以",
    "如果",
    "但是",
    "可以",
    "不是",
    "我们",
    "他们",
    "以及",
    "进行",
    "通过",
}


def _tokenize(text: str) -> list[str]:
    return [
        tok.strip()
        for tok in jieba.lcut(str(text))
        if tok.strip() and tok.strip() not in _STOPWORDS and len(tok.strip()) > 1
    ]


def fit_lda(
    texts: Iterable[str],
    n_topics: int = LDA_TOPICS,
    max_features: int = LDA_MAX_FEATURES,
    random_state: int = RANDOM_STATE,
    n_top_words: int = 8,
) -> pd.DataFrame:
    docs = [str(t) for t in texts if str(t).strip()]
    if len(docs) < n_topics:
        raise ValueError(f"need at least {n_topics} non-empty documents, got {len(docs)}")

    vectorizer = CountVectorizer(
        tokenizer=_tokenize,
        token_pattern=None,
        max_features=max_features,
        min_df=1,
    )
    matrix = vectorizer.fit_transform(docs)
    if matrix.shape[1] == 0:
        raise ValueError("LDA vocabulary is empty after tokenization")

    n_topics = min(n_topics, matrix.shape[0], matrix.shape[1])
    model = LatentDirichletAllocation(
        n_components=n_topics,
        random_state=random_state,
        learning_method="batch",
        max_iter=20,
    )
    model.fit(matrix)
    vocab = vectorizer.get_feature_names_out()
    rows = []
    for idx, topic in enumerate(model.components_):
        top_idx = topic.argsort()[::-1][:n_top_words]
        rows.append(
            {
                "topic_id": idx,
                "top_words": " ".join(vocab[i] for i in top_idx),
                "weight_sum": float(topic.sum()),
            }
        )
    return pd.DataFrame(rows)


def cluster_by_source(corpus: pd.DataFrame, text_col: str, source_col: str) -> dict[str, pd.DataFrame]:
    """Fit separate LDA models for leader posts and comments."""
    out: dict[str, pd.DataFrame] = {}
    for source, group in corpus.groupby(source_col):
        out[str(source)] = fit_lda(group[text_col].tolist())
    return out
