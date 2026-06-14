#!/usr/bin/env python3
"""
UserPromptSubmit hook — emit compact suggestion when tool-call count crosses threshold.

Fires only when the user submits a message (not mid-pipeline). This ensures
suggestions never interrupt an active cook/plan/fix pipeline.

Counter is incremented by tool_counter.py (PreToolUse). Resets after /compact.

Environment:
  CLAUDE_SESSION_ID        Session identifier
  CLAUDE_PARENT_SESSION_ID Set for subagent sessions — skip there
  COMPACT_THRESHOLD        Tool calls before first suggestion (default 50)
"""

import os
import sys
import json
from pathlib import Path

# Subagents can't trigger /compact and don't need suggestions.
if os.environ.get("CLAUDE_PARENT_SESSION_ID"):
    sys.exit(0)

session_id = os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("PPID", "default")
threshold = int(os.environ.get("COMPACT_THRESHOLD", "50"))

tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", "/tmp")))
counter_file = tmp_dir / f"claude-tool-count-{session_id}"

try:
    count = int(counter_file.read_text().strip()) if counter_file.exists() else 0
except Exception:
    sys.exit(0)

if count < threshold:
    sys.exit(0)


def _active_phase() -> str:
    """Read the current phase from session-context.json if available."""
    try:
        ctx_file = Path(os.getcwd()) / ".claude" / "session-data" / "session-context.json"
        if ctx_file.exists():
            ctx = json.loads(ctx_file.read_text(encoding="utf-8"))
            return ctx.get("phase", "")
    except Exception:
        pass
    return ""


phase = _active_phase()
phase_hint = f" (phase: {phase})" if phase else ""

if count == threshold or count - threshold < 5:
    print(
        f"[StrategicCompact] {count} tool calls{phase_hint} — /compact nếu vừa xong một phase "
        f"(research→plan, plan→implement, debug→next). Bỏ qua nếu đang giữa implementation.",
        file=sys.stderr,
    )
elif (count - threshold) % 25 == 0:
    print(
        f"[StrategicCompact] {count} tool calls — context đang lớn. "
        f"/compact nếu sắp đổi task hoặc vừa xong bước lớn.",
        file=sys.stderr,
    )
