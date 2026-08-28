from __future__ import annotations

import argparse
from pathlib import Path
import sys

# allow `python -m opinion_analysis` after `pip install -e .` or PYTHONPATH=src
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from opinion_analysis.config import DATA_DIR, N_BOOTSTRAP, OUTPUT_DIR
from opinion_analysis.pipeline import run
from opinion_analysis.sample_data import write_sample


def main() -> None:
    parser = argparse.ArgumentParser(description="Run highlighted public-opinion analysis clauses")
    sub = parser.add_subparsers(dest="cmd", required=True)
    gen = sub.add_parser("generate-sample", help="write synthetic CSVs under data/sample")
    gen.add_argument("--data-dir", type=Path, default=DATA_DIR)
    run_p = sub.add_parser("run", help="run LDA, SnowNLP, SNA, PROCESS, descriptives")
    run_p.add_argument("--data-dir", type=Path, default=DATA_DIR)
    run_p.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    run_p.add_argument("--n-boot", type=int, default=N_BOOTSTRAP)
    args = parser.parse_args()
    if args.cmd == "generate-sample":
        write_sample(args.data_dir)
        print(f"wrote sample data to {args.data_dir}")
        return
    written = run(args.data_dir, args.output_dir, n_boot=args.n_boot)
    for key, path in written.items():
        print(f"{key}: {path}")


if __name__ == "__main__":
    main()
