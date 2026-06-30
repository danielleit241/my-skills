#!/usr/bin/env python3
"""
SubagentStart hook — inject minimal context into subagents (~200 tokens).

Only fires for subagent sessions (detected via CLAUDE_PARENT_SESSION_ID).
Reads session-context.json written by session_init.py to get project, branch,
and active workflow context without repeating the heavy init logic.
"""

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from utf8_stdio import configure_utf8_stdio, write_json

SESSION_CONTEXT_FILE = "session-data/session-context.json"
PLANS_DIR = "plans"
STATUS_ACTIVE = "🟡"
STATUS_COMPLETE = "✅"
configure_utf8_stdio()


def _find_active_plan(root: Path) -> dict | None:
    """Return the most recently modified active plan, or None."""
    plans_root = root / PLANS_DIR
    if not plans_root.exists():
        return None

    best = None
    for plan_dir in plans_root.iterdir():
        if not plan_dir.is_dir():
            continue
        plan_file = plan_dir / "plan.md"
        if not plan_file.exists():
            continue
        content = plan_file.read_text(encoding="utf-8", errors="replace")
        if STATUS_COMPLETE in content or STATUS_ACTIVE not in content:
            continue
        mtime = plan_file.stat().st_mtime
        if best is None or mtime > best["mtime"]:
            name_m = re.search(r"^#\s+Plan:\s+(.+)$", content, re.MULTILINE)
            phases = re.findall(r"- \[([ x])\] Phase \d+: (.+)", content)
            next_phase = next(
                (
                    re.split(r"\s[-\u2013\u2014]\s", p, maxsplit=1)[0].strip()
                    for done, p in phases
                    if done != "x"
                ),
                None,
            )
            best = {
                "name": name_m.group(1).strip() if name_m else plan_dir.name,
                "next_phase": next_phase,
                "mtime": mtime,
            }
    return best


def main() -> None:
    # Only run for subagents
    if not os.environ.get("CLAUDE_PARENT_SESSION_ID"):
        sys.exit(0)

    root = Path(os.getcwd())
    context_file = root / SESSION_CONTEXT_FILE

    project = ""
    branch = ""

    if context_file.exists():
        try:
            ctx = json.loads(context_file.read_text(encoding="utf-8"))
            project = ctx.get("project", "")
            branch = ctx.get("branch", "")
        except Exception:
            pass

    parts: list[str] = []

    header_parts = []
    if project:
        header_parts.append(f"Project: {project}")
    if branch:
        header_parts.append(f"Branch: {branch}")
    if header_parts:
        parts.append(" | ".join(header_parts))

    plan = _find_active_plan(root)
    if plan:
        next_info = f"next → {plan['next_phase']}" if plan["next_phase"] else "all phases done"
        parts.append(f"Active: {plan['name']} — {next_info}")

    # Propagate caveman mode from parent session: if parent is in caveman,
    # inject a terse instruction so subagent output is also compact.
    parent_session_id = os.environ.get("CLAUDE_PARENT_SESSION_ID")
    if parent_session_id:
        sessions_dir = root / "session-data"
        caveman_file = sessions_dir / f"caveman-{parent_session_id}.json"
        try:
            if caveman_file.exists():
                state = json.loads(caveman_file.read_text(encoding="utf-8"))
                if state.get("active"):
                    parts.append(
                        "Mode: TERSE — parent session in caveman mode. "
                        "Minimize response tokens: drop filler, hedging, and explanatory prose. "
                        "Return only the essential result."
                    )
        except Exception:
            pass

    if not parts:
        sys.exit(0)

    write_json({
        "hookSpecificOutput": {
            "hookEventName": "SubagentStart",
            "additionalContext": "\n".join(parts),
        }
    })


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)
