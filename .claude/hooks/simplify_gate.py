#!/usr/bin/env python3
"""
UserPromptSubmit hook — block ship intent when the current diff is too large.

The hook only enforces thresholds when simplify.gate.enabled=true. It inspects
git diff HEAD for ship/merge/PR/deploy/publish prompts and exits 2 when total
changed lines, changed files, or additions in one file reach the configured
threshold.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import find_project_root, get_section
from hook_logger import HookLogger

_log = HookLogger("simplify-gate")
SHIP_INTENT_RE = re.compile(r"\b(ship|merge|pr|deploy|publish)\b", re.IGNORECASE)
NEGATED_SHIP_RE = re.compile(
    r"\b(don't|do not|not ready to|avoid|skip)\s+(ship|merge|deploy|publish)\b",
    re.IGNORECASE,
)


def _git_numstat(root: Path) -> list[tuple[int, int, str]]:
    result = subprocess.run(
        ["git", "-C", str(root), "diff", "HEAD", "--numstat"],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        return []

    rows = []
    for line in result.stdout.splitlines():
        parts = line.split("\t", 2)
        if len(parts) != 3:
            continue
        added, deleted, path = parts
        if not added.isdigit() or not deleted.isdigit():
            continue
        rows.append((int(added), int(deleted), path))
    return rows


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception as exc:
        _log.error(f"stdin parse failed -> fail-open: {exc}")
        return

    prompt = payload.get("prompt", "") or payload.get("message", "") or ""
    if not SHIP_INTENT_RE.search(prompt) or NEGATED_SHIP_RE.search(prompt):
        return

    root = find_project_root(payload.get("cwd") or os.getcwd())
    if not root:
        return

    simplify = get_section("simplify", root=root)
    gate = simplify.get("gate", {})
    if not gate.get("enabled", False):
        return

    threshold = simplify.get("threshold", {})
    total_limit = int(threshold.get("totalLoc", 400))
    file_limit = int(threshold.get("fileCount", 8))
    single_limit = int(threshold.get("singleFileLoc", 200))

    rows = _git_numstat(root)
    total_loc = sum(added + deleted for added, deleted, _ in rows)
    file_count = len(rows)
    max_added, max_path = max(
        ((added, path) for added, _, path in rows),
        default=(0, ""),
    )

    breached = []
    if total_loc >= total_limit:
        breached.append(f"total diff {total_loc} >= {total_limit} lines")
    if file_count >= file_limit:
        breached.append(f"{file_count} files >= {file_limit}")
    if max_added >= single_limit:
        breached.append(
            f"{max_added} additions >= {single_limit} in {max_path}"
        )

    if not breached:
        return

    sys.stderr.write(
        "[simplify-gate] Blocked ship intent: "
        + "; ".join(breached)
        + ". Simplify the diff or set simplify.gate.enabled=false in .ck.json.\n"
    )
    sys.exit(2)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        _log.error(f"unhandled -> fail-open: {exc}")
        sys.exit(0)
