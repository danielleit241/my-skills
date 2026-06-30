#!/usr/bin/env python3
"""
PreToolUse hook - one lightweight tool-time entrypoint.

Combines privacy blocking and tool-call counting so hot-path tools spawn one
Python process instead of two.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import find_project_root, get_safety_section
from privacy_checker import check_bash, check_file, load_allow_list
from utf8_stdio import configure_utf8_stdio

PRIVACY_TOOLS = {"Read", "Write", "Edit", "Glob", "Grep", "Bash"}
COUNT_TOOLS = {"Write", "Edit", "Bash", "Agent"}
configure_utf8_stdio()


def _session_id() -> str:
    return os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("PPID", "default")


def _counter_file(session_id: str) -> Path:
    tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", "/tmp")))
    return tmp_dir / f"claude-tool-count-{session_id}"


def _increment_counter(tool_name: str) -> None:
    if tool_name not in COUNT_TOOLS:
        return
    if os.environ.get("CLAUDE_PARENT_SESSION_ID"):
        return
    counter_file = _counter_file(_session_id())
    try:
        count = int(counter_file.read_text(encoding="utf-8").strip()) + 1 if counter_file.exists() else 1
        counter_file.write_text(str(count), encoding="utf-8")
    except Exception:
        pass


def _block(message: str) -> None:
    sys.stderr.write(message)
    sys.exit(2)


def _privacy_check(payload: dict) -> None:
    tool_name = payload.get("tool_name", "")
    if tool_name not in PRIVACY_TOOLS:
        return
    cwd = payload.get("cwd") or os.getcwd()
    root = find_project_root(cwd)
    if get_safety_section("privacyBlock", root=root).get("enabled", True) is False:
        return
    allow_list = load_allow_list(cwd)
    tool_input = payload.get("tool_input", {}) or {}

    if tool_name in {"Read", "Write", "Edit"}:
        file_path = tool_input.get("file_path", "")
        match = check_file(file_path, allow_list)
        if match:
            _block(
                f"[privacy-block] Blocked: {Path(file_path).name!r} matches pattern '{match}'.\n"
                "To allow, add the filename to safety.privacyBlock.allowList in .ck.json "
                "or ask the user for explicit permission."
            )

    elif tool_name in {"Glob", "Grep"}:
        file_path = tool_input.get("path", "")
        if tool_name == "Glob" and not file_path:
            file_path = tool_input.get("pattern", "")
        match = check_file(file_path, allow_list)
        if match:
            _block(
                f"[privacy-block] Blocked: {Path(file_path).name!r} matches pattern '{match}'.\n"
                "To allow, add the filename to safety.privacyBlock.allowList in .ck.json "
                "or ask the user for explicit permission."
            )

    elif tool_name == "Bash":
        command = tool_input.get("command", "")
        match = check_bash(command, allow_list)
        if match:
            _block(
                f"[privacy-block] Blocked: Bash command references sensitive file ({match!r}).\n"
                "To allow, add the filename to safety.privacyBlock.allowList in .ck.json "
                "or ask the user for explicit permission."
            )


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return
    tool_name = payload.get("tool_name", "")
    _privacy_check(payload)
    _increment_counter(tool_name)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        sys.exit(0)
