#!/usr/bin/env python3
"""
UserPromptSubmit hook - one lightweight prompt-time entrypoint.

Combines the old prompt hooks so each user prompt starts one Python process,
not four. It stays fail-open except for the optional simplify ship gate.
Static instructions belong in CLAUDE.md or user-owned config; this hook emits only
runtime workflow state and pressure signals.
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
from ck_config_utils import find_project_root, get_hook_section, get_workspace_config
from utf8_stdio import configure_utf8_stdio, write_json

STATUS_ACTIVE = "\U0001f7e1"
STATUS_COMPLETE = "\u2705"
MAX_ACTIVE_PLANS = 3
INJECTION_TTL_SECONDS = 5 * 60
configure_utf8_stdio()
SHIP_INTENT_RE = re.compile(r"\b(ship|merge|pr|deploy|publish)\b", re.IGNORECASE)
NEGATED_SHIP_RE = re.compile(
    r"\b(don't|do not|not ready to|avoid|skip)\s+(ship|merge|deploy|publish)\b",
    re.IGNORECASE,
)


def _git(root: Path, *args: str, timeout: int = 3) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def _session_id(payload: dict) -> str:
    return (
        str(payload.get("session_id") or "")
        or os.environ.get("CLAUDE_SESSION_ID")
        or os.environ.get("PPID")
        or str(os.getppid())
    )


def _counter_file(session_id: str) -> Path:
    tmp_dir = Path(os.environ.get("TEMP", os.environ.get("TMPDIR", tempfile.gettempdir())))
    return tmp_dir / f"claude-tool-count-{session_id}"


def _read_counter(session_id: str) -> int:
    try:
        return int(_counter_file(session_id).read_text(encoding="utf-8").strip())
    except Exception:
        return 0


def _should_inject(session_id: str, root: Path, now: float | None = None) -> bool:
    timestamp = time.time() if now is None else now
    key = hashlib.sha256(
        f"{session_id}\0{root.resolve()}".encode("utf-8", errors="replace")
    ).hexdigest()[:24]
    state_dir = Path(tempfile.gettempdir()) / "ck-prompt-context"
    state_file = state_dir / f"{key}.json"

    try:
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            last = float(state.get("last_injected", 0))
            if timestamp - last < INJECTION_TTL_SECONDS:
                return False
        state_dir.mkdir(parents=True, exist_ok=True)
        state_file.write_text(json.dumps({"last_injected": timestamp}), encoding="utf-8")
    except Exception:
        return True
    return True


def _parse_plan(plan_file: Path, content: str) -> dict | None:
    name_match = re.search(r"^#\s+Plan:\s+(.+)$", content, re.MULTILINE)
    mode_match = re.search(r"^Mode:\s+(.+)$", content, re.MULTILINE)
    phases = re.findall(r"- \[([ x])\] Phase \d+: (.+)", content)
    completed = sum(1 for done, _ in phases if done == "x")
    total = len(phases)
    next_phase = None
    for done, phase_name in phases:
        if done != "x" and next_phase is None:
            next_phase = re.split(r"\s[-\u2013\u2014]\s", phase_name, maxsplit=1)[0].strip()
    return {
        "name": name_match.group(1).strip() if name_match else plan_file.parent.name,
        "mode": mode_match.group(1).strip() if mode_match else "Unknown",
        "path": str(plan_file),
        "next_phase": next_phase,
        "progress": f"{completed}/{total}",
        "mtime": plan_file.stat().st_mtime,
    }


def _find_active_plans(root: Path) -> list[dict]:
    plans_root = root / str(get_workspace_config(root).get("root", "plans"))
    if not plans_root.exists():
        return []
    active = []
    try:
        plan_dirs = sorted(plans_root.iterdir())
    except Exception:
        return []
    for plan_dir in plan_dirs:
        if not plan_dir.is_dir():
            continue
        plan_file = plan_dir / "plan.md"
        if not plan_file.exists():
            continue
        try:
            content = plan_file.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if STATUS_COMPLETE in content or STATUS_ACTIVE not in content:
            continue
        parsed = _parse_plan(plan_file, content)
        if parsed:
            active.append(parsed)
    active.sort(key=lambda item: item["mtime"], reverse=True)
    return active[:MAX_ACTIVE_PLANS]


def _workflow_context(root: Path, session_id: str) -> str | None:
    active_plans = _find_active_plans(root)
    if not active_plans or not _should_inject(session_id, root):
        return None
    branch = _git(root, "rev-parse", "--abbrev-ref", "HEAD")
    header = f"Project: {root.name}" + (f" | Branch: {branch}" if branch else "")
    lines = [header]
    for plan in active_plans:
        next_info = f"next: {plan['next_phase']}" if plan["next_phase"] else "all phases complete"
        lines.append(f"Active plan: [{plan['mode']}] {plan['name']} ({plan['progress']} phases) - {next_info}")
        lines.append(f"  Plan file: {plan['path']}")
    return "\n".join(lines)


def _prompt_text(payload: dict) -> str:
    return str(payload.get("prompt") or payload.get("message") or payload.get("user_prompt") or "")


def _git_numstat(root: Path) -> list[tuple[int, int, str]]:
    output = _git(root, "diff", "HEAD", "--numstat", timeout=10)
    rows = []
    for line in output.splitlines():
        parts = line.split("\t", 2)
        if len(parts) != 3:
            continue
        added, deleted, path = parts
        if added.isdigit() and deleted.isdigit():
            rows.append((int(added), int(deleted), path))
    return rows


def _simplify_gate(payload: dict, root: Path) -> None:
    prompt = _prompt_text(payload)
    if not SHIP_INTENT_RE.search(prompt) or NEGATED_SHIP_RE.search(prompt):
        return
    simplify = get_hook_section("simplifyGate", root=root)
    if not simplify.get("enabled", False):
        return
    threshold = simplify.get("threshold", {})
    total_limit = int(threshold.get("totalLoc", 400))
    file_limit = int(threshold.get("fileCount", 8))
    single_limit = int(threshold.get("singleFileLoc", 200))
    rows = _git_numstat(root)
    total_loc = sum(added + deleted for added, deleted, _ in rows)
    file_count = len(rows)
    max_added, max_path = max(((added, path) for added, _, path in rows), default=(0, ""))
    breached = []
    if total_loc >= total_limit:
        breached.append(f"total diff {total_loc} >= {total_limit} lines")
    if file_count >= file_limit:
        breached.append(f"{file_count} files >= {file_limit}")
    if max_added >= single_limit:
        breached.append(f"{max_added} additions >= {single_limit} in {max_path}")
    if breached:
        sys.stderr.write(
            "[simplify-gate] Blocked ship intent: "
            + "; ".join(breached)
            + ". Simplify the diff or set hooks.simplifyGate.enabled=false in .ck.json.\n"
        )
        sys.exit(2)


def _caveman_context(root: Path, session_id: str) -> str | None:
    section = get_hook_section("caveman", root=root)
    if section.get("enabled", True) is False:
        return None
    threshold = section.get("threshold", {})
    try:
        orange = int(threshold.get("orange", 50))
        red = int(threshold.get("red", 100))
    except Exception:
        orange, red = 50, 100
    count = _read_counter(session_id)
    sessions_dir = root / "session-data"
    sessions_dir.mkdir(parents=True, exist_ok=True)
    state_file = sessions_dir / f"caveman-{session_id}.json"
    try:
        current = bool(json.loads(state_file.read_text(encoding="utf-8")).get("active", False))
    except Exception:
        current = False
    if count >= red:
        desired = True
        msg = f"CAVEMAN_TRIGGERED: {count} tool calls (>={red}, red zone). Activate caveman skill; compact at the next boundary."
    elif count >= orange:
        desired = True
        msg = f"CAVEMAN_TRIGGERED: {count} tool calls (>={orange}). Use terse output until compact."
    else:
        desired = False
        msg = "CAVEMAN_RELEASED: tool call count below threshold; normal output mode."
    if desired == current:
        return None
    state_file.write_text(json.dumps({"active": desired}), encoding="utf-8")
    return msg


def _compact_context(root: Path, session_id: str) -> str | None:
    try:
        threshold = int(os.environ.get("COMPACT_THRESHOLD", "50"))
    except Exception:
        threshold = 50
    count = _read_counter(session_id)
    if count < threshold:
        return None
    phase = ""
    try:
        ctx_file = root / "session-data" / "session-context.json"
        if ctx_file.exists():
            phase = json.loads(ctx_file.read_text(encoding="utf-8")).get("phase", "")
    except Exception:
        phase = ""
    phase_hint = f" (phase: {phase})" if phase else ""
    if count == threshold or count - threshold < 5:
        return (
            f"StrategicCompact: {count} tool calls{phase_hint}. "
            "Compact only at a phase boundary; skip while editing tightly coupled code."
        )
    if (count - threshold) % 25 == 0:
        return (
            f"StrategicCompact: {count} tool calls. "
            "Compact if switching task or finishing a major step."
        )
    return None


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    if payload.get("agent_id") or os.environ.get("CLAUDE_PARENT_SESSION_ID"):
        return
    cwd = payload.get("cwd") or os.getcwd()
    root = find_project_root(cwd) or Path(cwd)
    session_id = _session_id(payload)

    _simplify_gate(payload, root)

    contexts = [
        _workflow_context(root, session_id),
        _caveman_context(root, session_id),
        _compact_context(root, session_id),
    ]
    output = "\n\n".join(item for item in contexts if item)
    if not output:
        return
    write_json({"hookSpecificOutput": {"additionalContext": output}})


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        sys.exit(0)
