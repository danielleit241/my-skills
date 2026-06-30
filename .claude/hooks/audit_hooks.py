#!/usr/bin/env python3
"""
Hook audit - run manually, DO NOT wire to settings.json.

List: which hooks have been wired (settings.json) at which event, the enabled status
(.ck.json), and which hooks exist in hooks/ but have not been wired.

Perform a DYNAMIC health check (not just checking for file existence): for each blocking hook, run
a dummy input test and verify the REAL exit code - detect a "silent bypass hook"
(exit 0 due to a bug instead of exit 2 when it should have been blocked).

    python .claude/hooks/audit_hooks.py
"""

import json
import subprocess
import sys
from pathlib import Path

HOOKS_DIR = Path(__file__).parent
ROOT = HOOKS_DIR.parent.parent
sys.path.insert(0, str(HOOKS_DIR / "lib"))
from ck_config_utils import get_hook_section, get_safety_section


def _load_json(p: Path) -> dict:
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}


def _wired_hooks(settings: dict) -> dict[str, list[str]]:
    """Map each hook name to the events it is wired to."""
    out: dict[str, list[str]] = {}
    for event, groups in settings.get("hooks", {}).items():
        for g in groups:
            for h in g.get("hooks", []):
                cmd = h.get("command", "")
                name = Path(cmd.split()[-1]).name if cmd else ""
                if name:
                    out.setdefault(name, []).append(event)
    return out


def _run_hook(name: str, stdin: str) -> int:
    """Run hook with dummy stdin, return real exit code."""
    try:
        r = subprocess.run(
            [sys.executable, str(HOOKS_DIR / name)],
            input=stdin, capture_output=True, text=True, timeout=15,
            cwd=str(ROOT),
        )
        return r.returncode
    except Exception as e:
        print(f"    health check failed: {e}")
        return -1


def main() -> None:
    settings = _load_json(ROOT / ".claude" / "settings.json")
    wired = _wired_hooks(settings)

    print("=== Hook Audit ===\n")

    print("-- Already wired in settings.json --")
    for name, events in sorted(wired.items()):
        print(f"  {name:32s} -> {', '.join(events)}")

    print("\n-- Exist in hooks/ but NOT wired --")
    on_disk = {p.name for p in HOOKS_DIR.glob("*.py") if p.name != Path(__file__).name}
    unwired = sorted(on_disk - set(wired))
    for name in unwired:
        print(f"  {name}")
    if not unwired:
        print("  (none)")

    print("\n-- Enabled status (.ck.json) --")
    statuses = {
        "safety.privacyBlock": get_safety_section("privacyBlock", root=ROOT).get("enabled", "(default true)"),
        "hooks.simplifyGate": get_hook_section("simplifyGate", root=ROOT).get("enabled", "(default false)"),
        "hooks.caveman": get_hook_section("caveman", root=ROOT).get("enabled", "(default true)"),
    }
    for key, enabled in statuses.items():
        print(f"  {key:16s} enabled = {enabled}")

    print("\n-- Health check DYNAMIC (exit code real) --")
    # fail-open: malformed JSON must make every hook exit 0
    for name in ("prompt_context.py", "tool_guard.py"):
        if (HOOKS_DIR / name).exists():
            rc = _run_hook(name, "BAD JSON NOT PARSEABLE")
            print(f"  {name} (malformed JSON -> fail-open): exit={rc} "
                  f"[{'OK' if rc == 0 else 'ERROR: did not fail open'}]")

    if (HOOKS_DIR / "tool_guard.py").exists():
        payload = json.dumps({
            "cwd": str(ROOT),
            "tool_name": "Read",
            "tool_input": {"file_path": ".env"},
        })
        rc = _run_hook("tool_guard.py", payload)
        print(f"  tool_guard.py (privacy block .env): exit={rc} "
              f"[{'OK' if rc == 2 else 'ERROR: did not block'}]")


if __name__ == "__main__":
    main()
