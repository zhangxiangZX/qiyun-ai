import pandas as pd

from opinion_analysis.reliability import cohen_kappa, cronbach_alpha, draw_kappa_sample, kappa_report
from opinion_analysis.sample_data import build_sample


def test_kappa_sample_is_ten_percent():
    corpus = build_sample()["corpus"]
    sample = draw_kappa_sample(corpus, frac=0.10)
    expected = max(1, int(round(len(corpus) * 0.10)))
    assert len(sample) == expected


def test_kappa_passes_on_coded_sample():
    coded = build_sample()["kappa"]
    report = kappa_report(coded["coder1"], coded["coder2"])
    assert report["kappa"] >= 0.8
    assert report["pass"] is True


def test_identical_labels_kappa_is_one():
    labels = pd.Series(["positive"] * 10 + ["negative"] * 10)
    assert cohen_kappa(labels, labels) == 1.0


def test_cronbach_passes_on_coherent_scale():
    scale = build_sample()["scale"]
    result = cronbach_alpha(scale)
    assert result["alpha"] >= 0.7
    assert result["pass"] is True
