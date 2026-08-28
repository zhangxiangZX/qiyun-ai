"""Highlighted-clause defaults. Column names can be overridden via CLI."""

from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "sample"
OUTPUT_DIR = ROOT / "output"

KAPPA_SAMPLE_FRAC = 0.10
KAPPA_PASS = 0.80
CRONBACH_PASS = 0.70
N_BOOTSTRAP = 5000
LDA_TOPICS = 4
LDA_MAX_FEATURES = 800
RANDOM_STATE = 42

STAGE_ORDER = ("潜伏期", "爆发期", "消退期")


@dataclass
class Columns:
    text_id: str = "text_id"
    source: str = "source"  # leader_post | comment
    leader_id: str = "leader_id"
    time: str = "time"
    stage: str = "stage"
    text: str = "text"
    user_id: str = "user_id"
    edge_src: str = "source_id"
    edge_dst: str = "target_id"
    edge_type: str = "relation"  # retweet | mention
    trait: str = "trait"
    contact: str = "contact_freq"
    sentiment: str = "sentiment"
    coder1: str = "coder1"
    coder2: str = "coder2"
    scale_items: tuple[str, ...] = field(
        default_factory=lambda: ("item1", "item2", "item3", "item4", "item5")
    )
