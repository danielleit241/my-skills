#!/usr/bin/env python3
"""Stop Hook — persist session state after each response."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
sys.path.insert(0, str(Path(__file__).parent))
from hook_logger import HookLogger
from session_state import save_state
from utf8_stdio import configure_utf8_stdio, read_stdin

MAX_STDIN = 1024 * 1024
configure_utf8_stdio()


def main() -> None:
    stdin_data = read_stdin(MAX_STDIN)
    transcript_path = None
    payload = None
    try:
        payload = json.loads(stdin_data)
        transcript_path = payload.get("transcript_path")
    except Exception:
        transcript_path = os.environ.get("CLAUDE_TRANSCRIPT_PATH")
    save_state(transcript_path, payload if isinstance(payload, dict) else None)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        HookLogger("session-end").error(str(e))
        sys.exit(0)
