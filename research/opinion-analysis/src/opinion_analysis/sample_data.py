"""Deterministic sample data so highlighted modules can run without a live crawl."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .config import RANDOM_STATE, STAGE_ORDER

LEADER_TEMPLATES = [
    "针对此次公共事件，我认为关键在于信息公开和责任落实，必须及时回应社会关切。",
    "从行业经验看，应急处置流程需要更透明，意见领袖应少情绪化、多提供可核验事实。",
    "网传说法缺少证据，建议对照官方通报和一线记录再判断，避免二次伤害。",
    "这件事暴露了协同机制不足，后续应补齐问责与救济，而不是互相推诿。",
    "我持续跟踪进展：目前核心争议仍是责任归属、处置时效和公众知情权。",
]

COMMENT_POS = [
    "讲得很清楚，支持这种理性分析，希望更多人看到。",
    "感谢分享，内容扎实，对我理解这件事很有帮助。",
    "说得对，信息公开才能减少恐慌，点赞。",
]
COMMENT_NEG = [
    "这完全是带节奏，内容很差，误导公众。",
    "失望，全是空话，没有新信息还煽动情绪。",
    "不认同，逻辑混乱，看着就烦。",
]
COMMENT_NEU = [
    "先看看后续通报再评论，现在信息还不完整。",
    "记录一下时间线，细节还需要核实。",
    "围观，等更多材料。",
]


def build_sample(n_leaders: int = 12, n_comments: int = 96, seed: int = RANDOM_STATE) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    leaders = [f"L{i:02d}" for i in range(n_leaders)]
    posts = []
    text_id = 0
    for i, leader in enumerate(leaders):
        stage = STAGE_ORDER[i % len(STAGE_ORDER)]
        for k in range(3):
            text_id += 1
            posts.append(
                {
                    "text_id": f"P{text_id:04d}",
                    "source": "leader_post",
                    "leader_id": leader,
                    "user_id": leader,
                    "time": f"2024-0{(i % 9) + 1}-0{(k % 9) + 1}",
                    "stage": stage,
                    "text": LEADER_TEMPLATES[(i + k) % len(LEADER_TEMPLATES)],
                }
            )
    comments = []
    pools = COMMENT_POS + COMMENT_NEG + COMMENT_NEU
    for j in range(n_comments):
        leader = leaders[j % n_leaders]
        stage = STAGE_ORDER[j % len(STAGE_ORDER)]
        text_id += 1
        comments.append(
            {
                "text_id": f"C{text_id:04d}",
                "source": "comment",
                "leader_id": leader,
                "user_id": f"U{j:03d}",
                "time": f"2024-0{(j % 9) + 1}-10",
                "stage": stage,
                "text": pools[j % len(pools)],
            }
        )
    corpus = pd.DataFrame(posts + comments)

    edges = []
    users = leaders + [f"U{j:03d}" for j in range(min(40, n_comments))]
    for j, src in enumerate(users):
        dst = leaders[j % n_leaders]
        rel = "retweet" if j % 2 == 0 else "mention"
        if src != dst:
            edges.append({"source_id": src, "target_id": dst, "relation": rel})
        # a few bridges through mid leaders
        if j % 4 == 0:
            mid = leaders[(j + 3) % n_leaders]
            edges.append({"source_id": src, "target_id": mid, "relation": "mention"})
    edges_df = pd.DataFrame(edges)

    n = 180
    stage = np.array([STAGE_ORDER[i % 3] for i in range(n)])
    w = np.array([i % 3 for i in range(n)], dtype=float)
    e1 = rng.normal(0, 0.4, n)
    e2 = rng.normal(0, 0.5, n)
    trait = rng.normal(0, 1, n)
    # contact (M) depends on trait and is stronger in 爆发期 (w=1)
    contact = 0.5 * trait + 0.6 * trait * (w == 1) + e1
    sentiment = 0.2 * trait + 0.55 * contact + 0.15 * (w == 1) + e2
    panel = pd.DataFrame(
        {
            "leader_id": [leaders[i % n_leaders] for i in range(n)],
            "stage": stage,
            "trait": trait,
            "contact_freq": contact,
            "sentiment": sentiment,
        }
    )

    # 5-item scale with shared factor for Cronbach's α
    factor = rng.normal(0, 1, 80)
    scale = pd.DataFrame(
        {
            f"item{k}": factor + rng.normal(0, 0.35, 80) + 3.0
            for k in range(1, 6)
        }
    )

    # 10% dual coding on comments: mostly agree
    sample_n = max(1, int(round(len(comments) * 0.10)))
    comment_df = pd.DataFrame(comments)
    kappa_rows = comment_df.sample(n=sample_n, random_state=seed).copy()
    polar = []
    for text in kappa_rows["text"]:
        if any(k in text for k in ("支持", "感谢", "点赞", "有帮助")):
            polar.append("positive")
        elif any(k in text for k in ("失望", "误导", "很差", "不认同")):
            polar.append("negative")
        else:
            polar.append("neutral")
    kappa_rows["coder1"] = polar
    kappa_rows["coder2"] = polar
    # one intentional disagreement if sample is large enough
    if len(kappa_rows) >= 8:
        kappa_rows.iloc[0, kappa_rows.columns.get_loc("coder2")] = (
            "neutral" if kappa_rows.iloc[0]["coder1"] != "neutral" else "positive"
        )

    return {
        "corpus": corpus,
        "edges": edges_df,
        "panel": panel,
        "scale": scale,
        "kappa": kappa_rows.reset_index(drop=True),
    }


def write_sample(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    tables = build_sample()
    tables["corpus"].to_csv(data_dir / "corpus.csv", index=False)
    tables["edges"].to_csv(data_dir / "edges.csv", index=False)
    tables["panel"].to_csv(data_dir / "panel.csv", index=False)
    tables["scale"].to_csv(data_dir / "scale.csv", index=False)
    tables["kappa"].to_csv(data_dir / "kappa_coded.csv", index=False)
