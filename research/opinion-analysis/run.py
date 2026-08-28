"""Entry point when the package is not installed: python run.py generate-sample|run"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from opinion_analysis.__main__ import main

if __name__ == "__main__":
    main()
