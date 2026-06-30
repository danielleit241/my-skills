#!/usr/bin/env python3
"""
Session State — persist and restore session context.

State file: session-data/.last-state.md
Archives:   session-data/archive/*.md  (max 10)

Usage as script:
  python session-state.py save   # reads stdin JSON for transcript_path
  python session-state.py load   # outputs SessionStart additionalContext payload
"""
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import find_project_root as get_project_root, get_project_name, get_sessions_dir
from hook_logger import HookLogger, strip_ansi
from session_utils import ensure_dir, get_datetime_string
from utf8_stdio import configure_utf8_stdio, read_stdin, write_json

_log = HookLogger("session-state")
configure_utf8_stdio()

STATE_FILENAME = ".last-state.md"
ARCHIVE_DIR_NAME = "archive"
PROMPT_LOG_FILENAME = "user-prompts.jsonl"
MAX_ARCHIVES = 10
MAX_STDIN = 1024 * 1024


# ── git helpers ────────────────────────────────────────────────────────────────

def _git(*args: str) -> str:
    try:
        r = subprocess.run(["git"] + list(args), capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def _get_git_info() -> dict:
    return {
        "branch": _git("rev-parse", "--abbrev-ref", "HEAD") or "unknown",
        "commit": _git("log", "-1", "--format=%h %s"),
        "status": _git("status", "--short"),
    }


# ── plan detection ─────────────────────────────────────────────────────────────

def _read_active_plan() -> str:
    root = get_project_root()
    if not root:
        return ""
    for name in ("plan.md", "PLAN.md", ".claude/plan.md"):
        try:
            text = (root / name).read_text(encoding="utf-8").strip()
            if len(text) > 1200:
                text = text[:1200] + "\n... (truncated)"
            return text
        except Exception:
            pass
    return ""


# ── transcript extraction ──────────────────────────────────────────────────────

def _extract_from_transcript(path: str) -> dict:
    result = {
        "userMessages": [],
        "toolsUsed": set(),
        "filesModified": set(),
        "totalMessages": 0,
    }
    try:
        fh = open(path, encoding="utf-8", errors="replace")
    except Exception:
        return result

    with fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                role = (
                    entry.get("role")
                    or entry.get("type")
                    or (entry.get("message") or {}).get("role")
                )

                if role == "user":
                    raw = (entry.get("message") or {}).get("content") or entry.get("content")
                    if isinstance(raw, str):
                        text = raw
                    elif isinstance(raw, list):
                        text = " ".join((c or {}).get("text", "") for c in raw)
                    else:
                        text = ""
                    cleaned = strip_ansi(text).strip()
                    if cleaned and not cleaned.startswith("<") and not cleaned.startswith("["):
                        result["userMessages"].append(cleaned[:200])

                if entry.get("type") == "tool_use" or entry.get("tool_name"):
                    tool = entry.get("tool_name") or entry.get("name", "")
                    if tool:
                        result["toolsUsed"].add(tool)
                    fp = (
                        (entry.get("tool_input") or {}).get("file_path")
                        or (entry.get("input") or {}).get("file_path", "")
                    )
                    if fp and tool in ("Edit", "Write"):
                        result["filesModified"].add(fp)

                if entry.get("type") == "assistant":
                    for block in ((entry.get("message") or {}).get("content") or []):
                        if (block or {}).get("type") == "tool_use":
                            tool = block.get("name", "")
                            if tool:
                                result["toolsUsed"].add(tool)
                            fp = (block.get("input") or {}).get("file_path", "")
                            if fp and tool in ("Edit", "Write"):
                                result["filesModified"].add(fp)

            except Exception:
                pass

    result["totalMessages"] = len(result["userMessages"])
    result["toolsUsed"] = sorted(result["toolsUsed"])[:20]
    result["filesModified"] = list(result["filesModified"])[:30]
    result["userMessages"] = result["userMessages"][-10:]
    return result


def _empty_transcript() -> dict:
    return {"userMessages": [], "toolsUsed": set(), "filesModified": set(), "totalMessages": 0}


def _detect_agent(payload: dict | None = None) -> str:
    explicit = (
        os.environ.get("CK_AGENT")
        or os.environ.get("FORGE_AGENT")
        or (payload or {}).get("agent")
        or (payload or {}).get("agentName")
        or (payload or {}).get("source")
    )
    if explicit:
        return str(explicit)
    script_path = str(Path(__file__).as_posix())
    if "/.codex/" in script_path or os.environ.get("CODEX_HOME") or os.environ.get("CODEX_SANDBOX"):
        return "codex"
    if "/.claude/" in script_path or any(key.startswith("CLAUDE_") for key in os.environ):
        return "claude-code"
    return "unknown"


def _extract_text(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = strip_ansi(value).strip()
        return [text] if text else []
    if isinstance(value, list):
        output: list[str] = []
        for item in value:
            output.extend(_extract_text(item))
        return output
    if isinstance(value, dict):
        for key in ("text", "prompt", "user_prompt", "message", "content", "input"):
            if key in value:
                return _extract_text(value.get(key))
    return []


def _extract_from_payload(payload: dict | None) -> dict:
    result = _empty_transcript()
    if not payload:
        return result

    messages: list[str] = []
    for key in ("prompt", "user_prompt", "userPrompt", "input", "message", "content"):
        messages.extend(_extract_text(payload.get(key)))
    message = payload.get("message")
    if isinstance(message, dict) and message.get("role") == "user":
        messages.extend(_extract_text(message.get("content")))

    for message_text in messages:
        cleaned = message_text.strip()
        if cleaned and not cleaned.startswith("<"):
            result["userMessages"].append(cleaned[:200])

    for key in ("tool_name", "name"):
        if payload.get(key):
            result["toolsUsed"].add(str(payload[key]))

    for container_key in ("tool_input", "input", "changes", "files", "diff"):
        value = payload.get(container_key)
        if isinstance(value, dict):
            for file_key in ("file_path", "path", "filename"):
                if value.get(file_key):
                    result["filesModified"].add(str(value[file_key]))
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    for file_key in ("file_path", "path", "filename"):
                        if item.get(file_key):
                            result["filesModified"].add(str(item[file_key]))

    result["totalMessages"] = len(result["userMessages"])
    result["toolsUsed"] = sorted(result["toolsUsed"])[:20]
    result["filesModified"] = list(result["filesModified"])[:30]
    result["userMessages"] = result["userMessages"][-10:]
    return result


def _merge_transcripts(primary: dict, secondary: dict) -> dict:
    return {
        "userMessages": (primary.get("userMessages") or secondary.get("userMessages") or [])[-10:],
        "toolsUsed": sorted(set(primary.get("toolsUsed") or []) | set(secondary.get("toolsUsed") or []))[:20],
        "filesModified": list(dict.fromkeys((primary.get("filesModified") or []) + (secondary.get("filesModified") or [])))[:30],
        "totalMessages": max(primary.get("totalMessages") or 0, secondary.get("totalMessages") or 0),
    }


def _record_prompt(state_dir: Path, payload: dict | None, agent: str) -> None:
    extracted = _extract_from_payload(payload)
    if not extracted["userMessages"]:
        return
    log_file = state_dir / PROMPT_LOG_FILENAME
    timestamp = get_datetime_string()
    with open(log_file, "a", encoding="utf-8") as fh:
        for message in extracted["userMessages"]:
            fh.write(json.dumps({"at": timestamp, "agent": agent, "message": message}, ensure_ascii=False) + "\n")


def _read_prompt_log(state_dir: Path, limit: int = 10) -> dict:
    log_file = state_dir / PROMPT_LOG_FILENAME
    result = _empty_transcript()
    if not log_file.exists():
        return result
    messages: list[str] = []
    try:
        for line in log_file.read_text(encoding="utf-8", errors="replace").splitlines()[-limit:]:
            entry = json.loads(line)
            agent = entry.get("agent", "unknown")
            message = str(entry.get("message", "")).strip()
            if message:
                messages.append(f"[{agent}] {message}")
    except Exception:
        return result
    result["userMessages"] = messages[-limit:]
    result["totalMessages"] = len(result["userMessages"])
    return result


# ── state file builder ─────────────────────────────────────────────────────────

def _build_state(transcript: dict, git: dict, plan: str, timestamp: str, project_name: str, agent: str) -> str:
    lines = [
        "# Session State",
        f"**Updated:** {timestamp}",
        f"**Agent:** [{agent}]",
        f"**Project:** {project_name}",
        f"**Branch:** {git['branch']}",
        f"**Worktree:** {os.getcwd()}",
    ]
    if git["commit"]:
        lines.append(f"**Last Commit:** {git['commit']}")
    lines.append("")

    if git["status"]:
        lines += ["## Git Changes", "```", git["status"][:500], "```", ""]

    if plan:
        lines += ["## Active Plan", plan, ""]

    if transcript["userMessages"] or transcript["filesModified"]:
        lines.append(f"## Session Summary [{agent}]")
        if transcript["userMessages"]:
            lines.append("### Tasks")
            for msg in transcript["userMessages"]:
                safe_msg = msg.replace("\n", " ")
                lines.append(f"- {safe_msg}")
            lines.append("")
        if transcript["filesModified"]:
            lines.append("### Files Modified")
            for f in transcript["filesModified"]:
                lines.append(f"- {f}")
            lines.append("")
        if transcript["toolsUsed"]:
            lines += ["### Tools", ", ".join(transcript["toolsUsed"]), ""]
        lines += ["### Stats", f"- {transcript['totalMessages']} user messages", ""]

    return "\n".join(lines).rstrip() + "\n"


# ── archive rotation ───────────────────────────────────────────────────────────

def _rotate(state_dir: Path) -> None:
    """Archive .last-state.md and prune to MAX_ARCHIVES."""
    current = state_dir / STATE_FILENAME
    if not current.exists():
        return
    archive_dir = state_dir / ARCHIVE_DIR_NAME
    ensure_dir(archive_dir)
    ts = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    try:
        current.rename(archive_dir / f"{ts}.md")
    except Exception as e:
        _log.warn(f"Archive failed: {e}")
        return
    try:
        archives = sorted(archive_dir.glob("*.md"), key=lambda p: p.name)
        for old in archives[:max(0, len(archives) - MAX_ARCHIVES)]:
            old.unlink(missing_ok=True)
            _log.info(f"Pruned archive: {old.name}")
    except Exception:
        pass


# ── public API ─────────────────────────────────────────────────────────────────

def save_state(transcript_path: str | None = None, payload: dict | None = None) -> None:
    state_dir = get_sessions_dir()
    ensure_dir(state_dir)
    agent = _detect_agent(payload)
    _record_prompt(state_dir, payload, agent)

    transcript = (
        _extract_from_transcript(transcript_path)
        if transcript_path and Path(transcript_path).exists()
        else _empty_transcript()
    )
    payload_transcript = _extract_from_payload(payload)
    if not transcript["userMessages"]:
        payload_transcript = _merge_transcripts(payload_transcript, _read_prompt_log(state_dir))
    transcript = _merge_transcripts(transcript, payload_transcript)
    git = _get_git_info()
    plan = _read_active_plan()
    timestamp = get_datetime_string()
    project_name = get_project_name() or "unknown"

    _rotate(state_dir)
    content = _build_state(transcript, git, plan, timestamp, project_name, agent)
    (state_dir / STATE_FILENAME).write_text(content, encoding="utf-8")
    _log.info(f"Saved → {STATE_FILENAME}")


def load_state() -> str:
    state_file = get_sessions_dir() / STATE_FILENAME
    if not state_file.exists():
        return ""
    try:
        return strip_ansi(state_file.read_text(encoding="utf-8").strip())
    except Exception:
        return ""


# ── CLI entry point ────────────────────────────────────────────────────────────

def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "save"

    if mode == "load":
        content = load_state()
        if content:
            write_json({
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": f"Previous session state:\n{content}",
                }
            })
    else:
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
        _log.error(str(e))
        sys.exit(0)
