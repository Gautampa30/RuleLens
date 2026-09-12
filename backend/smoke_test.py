"""
Submission Smoke Tests wrapper in backend directory.
"""

from pathlib import Path
import sys

root_smoke = Path(__file__).resolve().parent.parent / "smoke_test.py"
if root_smoke.exists():
    import runpy
    runpy.run_path(str(root_smoke), run_name="__main__")
else:
    raise FileNotFoundError(f"Could not find {root_smoke}")
