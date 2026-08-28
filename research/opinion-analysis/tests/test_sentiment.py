from opinion_analysis.sample_data import build_sample
from opinion_analysis.sentiment import score_frame, score_text, summarize_sentiment


def test_positive_outscores_negative():
    pos = score_text("讲得很清楚，支持这种理性分析，希望更多人看到，非常感谢。")
    neg = score_text("这完全是误导，内容很差，太失望了，看着就烦。")
    assert 0.0 <= neg <= 1.0
    assert 0.0 <= pos <= 1.0
    assert pos > neg


def test_mean_and_std_by_stage():
    corpus = build_sample()["corpus"]
    comments = corpus[corpus["source"] == "comment"]
    scored = score_frame(comments, "text")
    summary = summarize_sentiment(scored, group_cols=["stage"])
    assert {"sentiment_mean", "sentiment_std", "n"} <= set(summary.columns)
    assert summary["n"].sum() == len(comments)
