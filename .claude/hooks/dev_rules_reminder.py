#!/usr/bin/env python3
"""
UserPromptSubmit hook — inject project rules, session info, and plan context.

Injection is limited to once every five minutes for each
(session_id, project root) pair to avoid repeated token cost.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import find_project_root

PLANS_DIR = "plans"
STATUS_ACTIVE = "🟡"
STATUS_COMPLETE = "✅"
MAX_ACTIVE_PLANS = 3
FALLBACK_RULES = "YAGNI · KISS · DRY · Brutal honesty · Challenge assumptions"
INJECTION_TTL_SECONDS = 5 * 60


def _git(*args: str) -> str:
    try:
        r = subprocess.run(["git"] + list(args), capture_output=True, text=True, timeout=3)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def get_session_header(root: Path) -> str:
    project = root.name
    branch = _git("-C", str(root), "rev-parse", "--abbrev-ref", "HEAD")
    parts = [f"Project: {project}"]
    if branch:
        parts.append(f"Branch: {branch}")
    return " | ".join(parts)


def should_inject(
    session_id: str,
    root: Path,
    now: float | None = None,
) -> bool:
    """Return true at most once per TTL for a session and project."""
    timestamp = time.time() if now is None else now
    key = hashlib.sha256(
        f"{session_id}\0{root.resolve()}".encode("utf-8", errors="replace")
    ).hexdigest()[:24]
    state_dir = Path(tempfile.gettempdir()) / "ck-dev-rules-reminder"
    state_file = state_dir / f"{key}.json"

    try:
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            last_injected = float(state.get("last_injected", 0))
            if timestamp - last_injected < INJECTION_TTL_SECONDS:
                return False

        state_dir.mkdir(parents=True, exist_ok=True)
        state_file.write_text(
            json.dumps({"last_injected": timestamp}),
            encoding="utf-8",
        )
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        # Fail open: context injection is more important than token deduplication.
        return True

    return True


def load_project_rules(root: Path) -> str:
    """Load the concise Core Principles section from CLAUDE.md."""
    claude_md = root / "CLAUDE.md"
    if claude_md.exists():
        content = claude_md.read_text(encoding="utf-8", errors="replace")
        match = re.search(
            r"^## Core Principles\s*\n+(.*?)(?=^## |\Z)",
            content,
            re.MULTILINE | re.DOTALL,
        )
        if match and match.group(1).strip():
            return match.group(1).strip()
    return FALLBACK_RULES


def find_active_plans(root: Path) -> list[dict]:
    plans_root = root / PLANS_DIR
    if not plans_root.exists():
        return []

    active = []
    for plan_dir in sorted(plans_root.iterdir()):
        if not plan_dir.is_dir():
            continue
        plan_file = plan_dir / "plan.md"
        if not plan_file.exists():
            continue

        content = plan_file.read_text(encoding="utf-8", errors="replace")
        if STATUS_COMPLETE in content:
            continue
        if STATUS_ACTIVE not in content:
            continue

        info = _parse_plan(plan_file, content)
        if info:
            active.append(info)

    active.sort(key=lambda p: p["mtime"], reverse=True)
    return active[:MAX_ACTIVE_PLANS]


def _parse_plan(plan_file: Path, content: str) -> dict | None:
    name_match = re.search(r"^#\s+Plan:\s+(.+)$", content, re.MULTILINE)
    mode_match = re.search(r"^Mode:\s+(.+)$", content, re.MULTILINE)

    name = name_match.group(1).strip() if name_match else plan_file.parent.name
    mode = mode_match.group(1).strip() if mode_match else "Unknown"

    phases = re.findall(r"- \[([ x])\] Phase \d+: (.+)", content)
    next_phase = None
    completed = sum(1 for done, _ in phases if done == "x")
    total = len(phases)
    for done, phase_name in phases:
        if done != "x" and next_phase is None:
            next_phase = phase_name.split("—")[0].strip()

    return {
        "name": name,
        "mode": mode,
        "path": str(plan_file),
        "next_phase": next_phase,
        "progress": f"{completed}/{total}",
        "mtime": plan_file.stat().st_mtime,
    }


def build_context(header: str, rules: str, active_plans: list[dict]) -> str:
    lines = [
        header,
        f"Development rules: {rules}",
        "Modularization: keep source files near 200 lines; split by responsibility when practical.",
    ]

    if active_plans:
        lines.append("")
        for plan in active_plans:
            next_info = f"next → {plan['next_phase']}" if plan["next_phase"] else "all phases complete"
            lines.append(f"Active plan: [{plan['mode']}] {plan['name']} ({plan['progress']} phases) — {next_info}")
            lines.append(f"  Plan file: {plan['path']}")

    return "\n".join(lines)


def main():
    payload = {}
    try:
        payload = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError, AttributeError):
        pass

    cwd = payload.get("cwd") or os.getcwd()
    root = find_project_root(cwd) or Path(cwd)
    session_id = (
        payload.get("session_id")
        or os.environ.get("CLAUDE_SESSION_ID")
        or str(os.getppid())
    )

    if not should_inject(str(session_id), root):
        return

    header = get_session_header(root)
    rules = load_project_rules(root)
    active_plans = find_active_plans(root)
    output = build_context(header, rules, active_plans)

    sys.stdout.write(json.dumps({"hookSpecificOutput": {"additionalContext": output}}))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
