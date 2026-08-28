from opinion_analysis.sample_data import build_sample
from opinion_analysis.text_mining import cluster_by_source, fit_lda


def test_lda_returns_topics():
    topics = fit_lda(
        [
            "信息公开责任落实及时回应社会关切",
            "应急处置流程需要透明提供可核验事实",
            "网传说法缺少证据对照官方通报判断",
            "协同机制不足应补齐问责与救济",
            "持续跟踪进展核心争议是责任归属",
            "网民评论支持理性分析减少恐慌",
        ],
        n_topics=2,
        n_top_words=4,
    )
    assert len(topics) == 2
    assert topics["top_words"].str.len().gt(0).all()


def test_lda_splits_leader_and_comment():
    corpus = build_sample()["corpus"]
    result = cluster_by_source(corpus, "text", "source")
    assert "leader_post" in result
    assert "comment" in result
    assert not result["leader_post"].empty
    assert not result["comment"].empty
