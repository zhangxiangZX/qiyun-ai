"""Run only the highlighted methodology clauses."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from .config import Columns, N_BOOTSTRAP, OUTPUT_DIR
from .descriptives import descriptives
from .expert_validity import write_expert_form
from .network import build_graph, centrality_table, export_gexf
from .process import run_process
from .reliability import cronbach_alpha, draw_kappa_sample, kappa_report
from .sentiment import SENTIMENT_COL, score_frame, summarize_sentiment
from .text_mining import cluster_by_source


def _dump_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run(
    data_dir: Path,
    output_dir: Path = OUTPUT_DIR,
    n_boot: int = N_BOOTSTRAP,
    columns: Columns | None = None,
) -> dict[str, Path]:
    cols = columns or Columns()
    output_dir.mkdir(parents=True, exist_ok=True)
    written: dict[str, Path] = {}

    corpus = pd.read_csv(data_dir / "corpus.csv")
    topics = cluster_by_source(corpus, cols.text, cols.source)
    for source, table in topics.items():
        path = output_dir / f"lda_topics_{source}.csv"
        table.to_csv(path, index=False)
        written[f"lda_{source}"] = path

    scored = score_frame(corpus, cols.text)
    scored_path = output_dir / "sentiment_scores.csv"
    scored.to_csv(scored_path, index=False)
    written["sentiment_scores"] = scored_path

    comments = scored[scored[cols.source].astype(str).str.contains("comment|评论", regex=True)]
    summary = summarize_sentiment(
        comments if not comments.empty else scored,
        group_cols=[cols.stage, cols.leader_id],
    )
    summary_path = output_dir / "sentiment_summary.csv"
    summary.to_csv(summary_path, index=False)
    written["sentiment_summary"] = summary_path

    kappa_coded = data_dir / "kappa_coded.csv"
    if kappa_coded.exists():
        kappa_df = pd.read_csv(kappa_coded)
    else:
        kappa_df = draw_kappa_sample(corpus)
        kappa_df[cols.coder1] = ""
        kappa_df[cols.coder2] = ""
    kappa_sample_path = output_dir / "kappa_sample.csv"
    kappa_df.to_csv(kappa_sample_path, index=False)
    written["kappa_sample"] = kappa_sample_path
    if cols.coder1 in kappa_df.columns and kappa_df[cols.coder1].astype(str).str.len().gt(0).any():
        report = kappa_report(kappa_df[cols.coder1], kappa_df[cols.coder2])
    else:
        report = {"kappa": None, "threshold": 0.8, "pass": False, "note": "awaiting dual coding"}
    kappa_path = output_dir / "kappa_report.json"
    _dump_json(kappa_path, report)
    written["kappa_report"] = kappa_path

    edges = pd.read_csv(data_dir / "edges.csv")
    graph = build_graph(edges, cols.edge_src, cols.edge_dst, cols.edge_type)
    leaders = sorted(corpus[cols.leader_id].dropna().astype(str).unique())
    central = centrality_table(graph, leaders)
    central_path = output_dir / "centrality.csv"
    central.to_csv(central_path, index=False)
    written["centrality"] = central_path
    gexf_path = export_gexf(graph, output_dir / "network.gexf")
    written["gexf"] = gexf_path

    panel = pd.read_csv(data_dir / "panel.csv")
    model4, model8 = run_process(panel, cols.trait, cols.contact, cols.sentiment, cols.stage, n_boot=n_boot)
    p4 = output_dir / "process_model4.json"
    p8 = output_dir / "moderated_mediation.json"
    _dump_json(p4, model4)
    _dump_json(p8, model8)
    written["process_model4"] = p4
    written["moderated_mediation"] = p8

    desc = descriptives(panel, [cols.trait, cols.contact, cols.sentiment])
    desc_path = output_dir / "descriptives.csv"
    desc.to_csv(desc_path, index=False)
    written["descriptives"] = desc_path

    scale = pd.read_csv(data_dir / "scale.csv")
    item_cols = [c for c in cols.scale_items if c in scale.columns]
    alpha = cronbach_alpha(scale[item_cols])
    alpha_path = output_dir / "cronbach.json"
    _dump_json(alpha_path, alpha)
    written["cronbach"] = alpha_path

    form_md = output_dir / "expert_validity_form.md"
    form_csv = output_dir / "expert_validity_form.csv"
    write_expert_form(form_md, form_csv)
    written["expert_form_md"] = form_md
    written["expert_form_csv"] = form_csv
    return written
