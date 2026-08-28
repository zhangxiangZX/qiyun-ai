import numpy as np

from opinion_analysis.process import bootstrap_model4, model4_point, run_process
from opinion_analysis.sample_data import build_sample


def test_model4_recovers_positive_indirect():
    rng = np.random.default_rng(0)
    x = rng.normal(size=200)
    m = 0.8 * x + rng.normal(scale=0.3, size=200)
    y = 0.7 * m + rng.normal(scale=0.3, size=200)
    point = model4_point(x, m, y)
    assert point["indirect_ab"] > 0.3
    boot = bootstrap_model4(x, m, y, n_boot=80, random_state=0)
    assert boot["indirect_significant"] is True
    assert boot["indirect_ci_low"] > 0


def test_stage_moderation_on_sample():
    panel = build_sample()["panel"]
    model4, model8 = run_process(
        panel,
        "trait",
        "contact_freq",
        "sentiment",
        "stage",
        n_boot=60,
        random_state=0,
    )
    assert "indirect_ab" in model4
    assert model4["n_boot"] == 60
    assert model8["conditional"]
    stages = {row["stage"] for row in model8["conditional"]}
    assert "爆发期" in stages
    stratified = model8["stage_stratified_model4"]
    assert len(stratified) >= 1
