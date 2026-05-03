#!/usr/bin/env python3
"""
Hook: PostToolUse Read|Grep|Bash
Detects large tool responses and emits ARTIFACT_FOLD_TRIGGERED, instructing
Claude to save the full output to .claude/artifacts/ and use a path reference.

Design: signal-only. PostToolUse hooks cannot prevent a large response from
entering context — this signals Claude to fold it in its next reply.

Thresholds from .ck.json artifactFolding.threshold.
"""

import sys
import json
import os
import tempfile
from pathlib import Path
from datetime import datetime, timezone


def find_repo_root(cwd: str) -> Path | None:
    for p in [Path(cwd), *Path(cwd).parents]:
        if (p / ".git").exists():
            return p
    return None


def extract_response_text(tool_response) -> str:
    """Handle both bare string and {"output": ...} / {"content": ...} dict shapes."""
    if tool_response is None:
        return ""
    if isinstance(tool_response, str):
        return tool_response
    if isinstance(tool_response, dict):
        return tool_response.get("output") or tool_response.get("content") or ""
    return ""


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return

    # Skip sub-agents
    if payload.get("agent_id"):
        return

    response_text = extract_response_text(payload.get("tool_response"))
    if not response_text:
        return

    cwd = payload.get("cwd", os.getcwd())
    root = find_repo_root(cwd)
    if not root:
        return

    # Read .ck.json config (utf-8-sig handles BOM on Windows)
    try:
        ck = json.loads((root / ".ck.json").read_text(encoding="utf-8-sig"))
        af = ck.get("artifactFolding", {})
        enabled = af.get("enabled", True)
        thresh = af.get("threshold", {})
        max_chars = int(thresh.get("maxChars", 4000))
        max_lines = int(thresh.get("maxLines", 120))
        preview_lines = int(thresh.get("previewLines", 10))
    except Exception:
        enabled, max_chars, max_lines, preview_lines = True, 4000, 120, 10

    if not enabled:
        return

    chars = len(response_text)
    lines = response_text.count("\n") + 1

    if chars <= max_chars and lines <= max_lines:
        return

    tool_name = payload.get("tool_name", "unknown").lower()
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    artifact_path = f".claude/artifacts/artifact-{ts}-{tool_name}.md"

    preview = "\n".join(response_text.splitlines()[:preview_lines])

    msg = (
        f"ARTIFACT_FOLD_TRIGGERED: {tool_name} output is {chars} chars / {lines} lines "
        f"(threshold: {max_chars} chars / {max_lines} lines). "
        f"Save full output to `{artifact_path}` and reference that path instead.\n"
        f"Preview (first {preview_lines} lines):\n{preview}\n..."
    )

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": msg
        }
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # Never block Claude on hook errors
