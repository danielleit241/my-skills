#!/usr/bin/env python3
"""
PreCompact Hook — save state before context compaction.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from ck_config_utils import get_sessions_dir, load_ck_config
from hook_logger import HookLogger
from session_utils import append_file, ensure_dir, find_files, get_datetime_string, get_time_string


def _project_slug() -> str:
    """Derive the project slug Claude uses for the memory directory."""
    import os, re
    cwd = os.getcwd()
    # Claude converts the path to a slug: drive letter + path separators → hyphens
    slug = re.sub(r"[:\\/]+", "-", cwd).strip("-")
    return slug


def purge_outdated(target_dir: Path, max_age_days: int, label: str, log: "HookLogger") -> None:
    """Remove files in target_dir older than max_age_days days."""
    now = __import__("time").time()
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
    import os
    log = HookLogger("pre-compact")
    sessions_dir = get_sessions_dir()
    ensure_dir(sessions_dir)

    config = load_ck_config()
    compact_day: int = int(config.get("compactDay", 3))
    memory_day: int = int(config.get("memoryDay", 30))

    timestamp = get_datetime_string()
    append_file(sessions_dir / "compaction-log.txt", f"[{timestamp}] Context compaction triggered\n")

    purge_outdated(sessions_dir, compact_day, "session-data", log)

    # Purge stale memory files (longer TTL than session data)
    memory_dir = Path.home() / ".claude" / "projects" / _project_slug() / "memory"
    if memory_dir.exists():
        purge_outdated(memory_dir, memory_day, "memory", log)

    active = find_files(sessions_dir, "*-session.tmp")
    if active:
        time_str = get_time_string()
        append_file(
            active[0]["path"],
            f"\n---\n**[Compaction occurred at {time_str}]** - Context was summarized\n",
        )

    log.info("State saved before compaction")

    # Reset caveman state so threshold recalculates from 0 after /compact
    import tempfile
    session_id = os.environ.get("CLAUDE_SESSION_ID")
    if session_id:
        caveman_state = sessions_dir / f"caveman-{session_id}.json"
        if caveman_state.exists():
            caveman_state.write_text('{"active": false}', encoding="utf-8")
        tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", tempfile.gettempdir())))
        counter = tmp_dir / f"claude-tool-count-{session_id}"
        if counter.exists():
            counter.write_text("0", encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        HookLogger("pre-compact").error(str(e))
