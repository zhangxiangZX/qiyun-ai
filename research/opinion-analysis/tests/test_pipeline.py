from pathlib import Path

from opinion_analysis.descriptives import descriptives
from opinion_analysis.pipeline import run
from opinion_analysis.sample_data import build_sample, write_sample


def test_descriptives_has_mean_std_extrema():
    panel = build_sample()["panel"]
    table = descriptives(panel, ["trait", "contact_freq", "sentiment"])
    assert list(table.columns) == ["variable", "n", "mean", "std", "min", "max"]
    assert set(table["variable"]) == {"trait", "contact_freq", "sentiment"}
    assert (table["max"] >= table["min"]).all()


def test_pipeline_highlighted_outputs(tmp_path: Path):
    data_dir = tmp_path / "data"
    out_dir = tmp_path / "out"
    write_sample(data_dir)
    written = run(data_dir, out_dir, n_boot=40)
    expected = {
        "sentiment_scores",
        "sentiment_summary",
        "kappa_sample",
        "kappa_report",
        "centrality",
        "gexf",
        "process_model4",
        "moderated_mediation",
        "descriptives",
        "cronbach",
        "expert_form_md",
        "expert_form_csv",
    }
    assert expected <= set(written)
    assert any(k.startswith("lda_") for k in written)
    for path in written.values():
        assert path.exists()
        assert path.stat().st_size > 0
