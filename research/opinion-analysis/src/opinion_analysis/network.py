"""Retweet / mention network and structural-influence centralities."""

from __future__ import annotations

from pathlib import Path

import networkx as nx
import pandas as pd


def build_graph(edges: pd.DataFrame, src_col: str, dst_col: str, type_col: str | None = None) -> nx.DiGraph:
    allowed = {"retweet", "mention", "转发", "@", "at"}
    frame = edges.copy()
    if type_col:
        rel = frame[type_col].astype(str).str.lower()
        frame = frame[rel.isin(allowed) | rel.str.contains("转发|mention|retweet|@", regex=True)]
    graph = nx.DiGraph()
    for src_raw, dst_raw in zip(frame[src_col], frame[dst_col], strict=True):
        src = str(src_raw)
        dst = str(dst_raw)
        if not src or not dst or src == "nan" or dst == "nan":
            continue
        if graph.has_edge(src, dst):
            graph[src][dst]["weight"] = graph[src][dst].get("weight", 1) + 1
        else:
            graph.add_edge(src, dst, weight=1)
    return graph


def centrality_table(graph: nx.DiGraph, leaders: list[str] | None = None) -> pd.DataFrame:
    if graph.number_of_nodes() == 0:
        return pd.DataFrame(columns=["node_id", "degree_centrality", "betweenness_centrality", "closeness_centrality"])

    degree = nx.degree_centrality(graph)
    betweenness = nx.betweenness_centrality(graph, normalized=True, weight="weight")
    # closeness on the weakly connected view so isolates get 0 instead of crashing
    closeness = {}
    for node in graph.nodes:
        try:
            closeness[node] = nx.closeness_centrality(graph, u=node)
        except Exception:
            closeness[node] = 0.0

    nodes = leaders if leaders else list(graph.nodes)
    rows = []
    for node in nodes:
        rows.append(
            {
                "node_id": node,
                "degree_centrality": float(degree.get(node, 0.0)),
                "betweenness_centrality": float(betweenness.get(node, 0.0)),
                "closeness_centrality": float(closeness.get(node, 0.0)),
            }
        )
    return pd.DataFrame(rows)


def export_gexf(graph: nx.DiGraph, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    nx.write_gexf(graph, path)
    return path
