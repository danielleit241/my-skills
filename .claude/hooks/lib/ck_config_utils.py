"""
Project root detection, .ck.json config access, and common path helpers.

Usage:
    from ck_config_utils import (
        find_project_root, get_project_name, get_claude_dir, get_sessions_dir,
        load_ck_config, get_section, is_enabled,
        get_coding_level, get_language_config, get_retention_config,
        get_hook_section, get_safety_section, get_workspace_config,
    )
"""
import json
import os
import subprocess
from pathlib import Path

SESSION_DATA_DIR = "session-data"


# ── project root ──────────────────────────────────────────────────────────────

def find_project_root(cwd: str | None = None) -> Path | None:
    """Locate the git project root. Uses git CLI for worktree support,
    falls back to .git-directory walk, then CLAUDE_PROJECT_DIR env var."""
    work_dir = cwd or os.getcwd()
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            capture_output=True, text=True, timeout=5, cwd=work_dir,
        )
        if r.returncode == 0 and r.stdout.strip():
            p = Path(r.stdout.strip())
            if p.name == ".git":
                return p.parent
            s = str(p)
            marker = os.sep + ".git"
            idx = s.lower().rfind(marker.lower())
            if idx > 0:
                return Path(s[:idx])
    except Exception:
        pass

    # Fallback: walk up for .git directory
    start = Path(work_dir)
    for p in [start, *start.parents]:
        if (p / ".git").exists():
            return p

    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and Path(env).exists():
        return Path(env)

    return None


# ── path helpers ──────────────────────────────────────────────────────────────

def get_home_dir() -> Path:
    explicit = os.environ.get("HOME") or os.environ.get("USERPROFILE")
    return Path(explicit) if explicit else Path.home()


def get_claude_dir() -> Path:
    return get_home_dir() / ".claude"


def get_sessions_dir(cwd: str | None = None) -> Path:
    root = find_project_root(cwd)
    if root:
        return root / SESSION_DATA_DIR
    return get_claude_dir() / SESSION_DATA_DIR


def get_project_name(cwd: str | None = None) -> str | None:
    work_dir = cwd or os.getcwd()
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5, cwd=work_dir,
        )
        if r.returncode == 0 and r.stdout.strip():
            return Path(r.stdout.strip()).name
    except Exception:
        pass
    return Path(work_dir).name or None


# ── .ck.json config ───────────────────────────────────────────────────────────

def load_ck_config(root: Path | None = None) -> dict:
    """Load .ck.json from project root. Returns empty dict on any failure."""
    r = root or find_project_root()
    if not r:
        return {}
    ck = r / ".ck.json"
    if not ck.exists():
        return {}
    try:
        return json.loads(ck.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}


def _nested(config: dict, dotted_path: str):
    value = config
    for key in dotted_path.split("."):
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return value


def get_config_value(
    paths: list[str],
    default=None,
    root: Path | None = None,
):
    """Return the first non-null config value from dotted paths."""
    config = load_ck_config(root)
    for dotted_path in paths:
        value = _nested(config, dotted_path)
        if value is not None:
            return value
    return default


def get_section(key: str, default: dict | None = None, root: Path | None = None) -> dict:
    """Return a top-level config section, or default if missing."""
    return load_ck_config(root).get(key, default if default is not None else {})


def is_enabled(key: str, root: Path | None = None) -> bool:
    """Return True if the config section exists and has enabled != false."""
    return get_section(key, root=root).get("enabled", True)


def get_coding_level(root: Path | None = None, default: int = 5) -> int:
    """Return schema v2 profile.codingLevel, falling back to v1 codingLevel."""
    try:
        return int(get_config_value(["profile.codingLevel", "codingLevel"], default, root))
    except Exception:
        return default


def get_language_config(root: Path | None = None) -> dict:
    """Return conversation/artifact language preferences with v1 fallback."""
    return {
        "conversation": get_config_value(
            ["profile.language.conversation", "conversation"],
            None,
            root,
        ),
        "artifacts": get_config_value(
            ["profile.language.artifacts", "spec.language"],
            None,
            root,
        ),
    }


def get_workspace_config(root: Path | None = None) -> dict:
    """Return workflow artifact workspace defaults with v1 spec fallback."""
    return {
        "root": get_config_value(["workspace.root", "spec.directory"], "plans", root),
        "dateFormat": get_config_value(["workspace.dateFormat", "spec.dateFormat"], "YYMMDD", root),
    }


def get_retention_config(root: Path | None = None) -> dict:
    """Return session/memory retention defaults with v1 fallback."""
    return {
        "compactDays": int(get_config_value(["retention.compactDays", "compactDay"], 3, root)),
        "memoryDays": int(get_config_value(["retention.memoryDays", "memoryDay"], 30, root)),
    }


def get_hook_section(name: str, root: Path | None = None) -> dict:
    """Return hook config by v2 name with backward-compatible v1 fallback."""
    config = load_ck_config(root)
    section = _nested(config, f"hooks.{name}")
    if isinstance(section, dict):
        return section

    if name == "caveman":
        legacy = config.get("cavemanMode")
        return legacy if isinstance(legacy, dict) else {}

    if name == "simplifyGate":
        legacy = config.get("simplify")
        if isinstance(legacy, dict):
            gate = legacy.get("gate", {}) if isinstance(legacy.get("gate"), dict) else {}
            threshold = legacy.get("threshold", {}) if isinstance(legacy.get("threshold"), dict) else {}
            return {
                "enabled": gate.get("enabled", False),
                "threshold": threshold,
            }

    return {}


def get_safety_section(name: str, root: Path | None = None) -> dict:
    """Return safety config by v2 name with backward-compatible v1 fallback."""
    config = load_ck_config(root)
    section = _nested(config, f"safety.{name}")
    if isinstance(section, dict):
        return section
    legacy = config.get(name)
    return legacy if isinstance(legacy, dict) else {}
