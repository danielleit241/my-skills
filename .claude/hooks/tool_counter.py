#!/usr/bin/env python3
"""
PreToolUse hook — increment tool-call counter per session.

Silent: no output. Counter is read by suggest_compact.py (UserPromptSubmit)
and caveman_watch.py (UserPromptSubmit) to drive suggestions and mode changes.
Resets to 0 after /compact via pre_compact.py.
"""

import os
import sys
from pathlib import Path

# Subagent tool calls are counted independently — don't mix with parent counter.
if os.environ.get("CLAUDE_PARENT_SESSION_ID"):
    sys.exit(0)

session_id = os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("PPID", "default")

tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", "/tmp")))
counter_file = tmp_dir / f"claude-tool-count-{session_id}"

try:
    count = int(counter_file.read_text().strip()) + 1 if counter_file.exists() else 1
    counter_file.write_text(str(count))
except Exception:
    pass
