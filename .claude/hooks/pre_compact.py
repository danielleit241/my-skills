#!/usr/bin/env python3
"""
PreCompact Hook — save state before context compaction.

Flow:
  1. Read stdin → extract transcript_path
  2. save_state() → flush .last-state.md with latest transcript (before context is wiped)
  3. Annotate active session.tmp with compaction marker (ECC pattern)
  4. Log to compaction-log.txt
  5. Purge old session/memory files
  6. Reset caveman + tool-counter so they restart from 0 post-compaction
"""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import get_retention_config, get_sessions_dir
from hook_logger import HookLogger
from session_state import save_state
from session_utils import append_file, ensure_dir, find_files, get_datetime_string, get_time_string
from utf8_stdio import configure_utf8_stdio, read_stdin

MAX_STDIN = 1024 * 1024
configure_utf8_stdio()


def _project_slug() -> str:
    cwd = os.getcwd()
    import re
    return re.sub(r"[:\\/]+", "-", cwd).strip("-")


def purge_outdated(target_dir: Path, max_age_days: int, label: str, log: "HookLogger") -> None:
    import time
    now = time.time()
    cutoff = max_age_days * 86400
    removed = 0
    try:
        for entry in target_dir.iterdir():
            if not entry.is_file():
                continue
            try:
                age = now - entry.stat().st_mtime
            except OSError:
                continue
            if age > cutoff:
                entry.unlink(missing_ok=True)
                removed += 1
    except Exception:
        pass
    if removed:
        log.info(f"Purged {removed} {label} file(s) older than {max_age_days}d")


def main() -> None:
    log = HookLogger("pre-compact")
    sessions_dir = get_sessions_dir()
    ensure_dir(sessions_dir)

    # 1. Read stdin — same pattern as session_end.py
    stdin_data = read_stdin(MAX_STDIN)
    transcript_path = None
    payload = None
    try:
        payload = json.loads(stdin_data)
        transcript_path = payload.get("transcript_path")
    except Exception:
        transcript_path = os.environ.get("CLAUDE_TRANSCRIPT_PATH")

    # 2. Save full session state NOW, before compaction wipes context.
    #    This ensures .last-state.md reflects the current transcript, not
    #    just the state from the last Stop hook.
    try:
        save_state(transcript_path, payload if isinstance(payload, dict) else None)
        log.info("Session state flushed before compaction")
    except Exception as e:
        log.warn(f"save_state failed: {e}")

    # 3. Log compaction event
    timestamp = get_datetime_string()
    append_file(sessions_dir / "compaction-log.txt", f"[{timestamp}] Context compaction triggered\n")

    # 4. Purge old files
    retention = get_retention_config()
    compact_day: int = retention["compactDays"]
    memory_day: int = retention["memoryDays"]

    purge_outdated(sessions_dir, compact_day, "session-data", log)

    memory_dir = Path.home() / ".claude" / "projects" / _project_slug() / "memory"
    if memory_dir.exists():
        purge_outdated(memory_dir, memory_day, "memory", log)

    # 5. Annotate active session.tmp with compaction marker (ECC pattern)
    active = find_files(sessions_dir, "*-session.tmp")
    if active:
        time_str = get_time_string()
        append_file(
            active[0]["path"],
            f"\n---\n**[Compaction occurred at {time_str}]** - Context was summarized\n",
        )

    # 6. Reset caveman + tool-counter so thresholds restart from 0
    session_id = os.environ.get("CLAUDE_SESSION_ID")
    if session_id:
        caveman_state = sessions_dir / f"caveman-{session_id}.json"
        if caveman_state.exists():
            caveman_state.write_text('{"active": false}', encoding="utf-8")
        tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", tempfile.gettempdir())))
        counter = tmp_dir / f"claude-tool-count-{session_id}"
        if counter.exists():
            counter.write_text("0", encoding="utf-8")

    log.perf()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        HookLogger("pre-compact").error(str(e))
