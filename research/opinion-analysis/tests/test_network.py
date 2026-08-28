from pathlib import Path

from opinion_analysis.network import build_graph, centrality_table, export_gexf
from opinion_analysis.sample_data import build_sample


def test_centrality_for_leaders(tmp_path: Path):
    sample = build_sample()
    graph = build_graph(sample["edges"], "source_id", "target_id", "relation")
    leaders = sorted(sample["corpus"]["leader_id"].unique())
    table = centrality_table(graph, leaders)
    assert set(table.columns) >= {
        "node_id",
        "degree_centrality",
        "betweenness_centrality",
        "closeness_centrality",
    }
    assert len(table) == len(leaders)
    assert table["degree_centrality"].max() > 0
    assert table["betweenness_centrality"].max() > 0
    assert table["closeness_centrality"].max() > 0
    gexf = export_gexf(graph, tmp_path / "network.gexf")
    assert gexf.exists()
    assert "<graph" in gexf.read_text(encoding="utf-8")
