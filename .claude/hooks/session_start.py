#!/usr/bin/env python3
"""
SessionStart Hook — load previous context on new session.
Ports session-start.js to Python.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "lib"))
from utils import (
    ensure_dir, find_files, get_claude_dir, get_homunculus_dir,
    get_learned_skills_dir, get_project_name, get_project_root,
    get_sessions_dir, log, sanitize_session_id, strip_ansi,
)

INSTINCT_CONFIDENCE_THRESHOLD = 0.7
MAX_INJECTED_INSTINCTS = 6


# ── observer session lease ─────────────────────────────────────────────────────

def _compute_project_id(project_root: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "-C", str(project_root), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        )
        url = r.stdout.strip() if r.returncode == 0 else ""
        url = re.sub(r"://[^@]+@", "://", url)
        source = url or str(project_root)
    except Exception:
        source = str(project_root)
    return hashlib.sha256(source.encode()).hexdigest()[:12]


def resolve_project_context() -> dict:
    root = get_project_root()
    hom = get_homunculus_dir()
    if not root:
        ensure_dir(hom)
        return {"project_id": "global", "project_root": "", "project_dir": hom, "is_global": True}
    project_id = _compute_project_id(root)
    project_dir = hom / "projects" / project_id
    ensure_dir(project_dir)
    return {"project_id": project_id, "project_root": str(root), "project_dir": project_dir, "is_global": False}


def resolve_session_id() -> str:
    return sanitize_session_id(os.environ.get("CLAUDE_SESSION_ID", "")) or ""


def write_session_lease(context: dict, extra: dict | None = None) -> None:
    session_id = resolve_session_id()
    if not session_id:
        return
    lease_dir = context["project_dir"] / ".observer-sessions"
    ensure_dir(lease_dir)
    payload = {
        "sessionId": session_id,
        "cwd": os.getcwd(),
        "pid": os.getpid(),
        "updatedAt": datetime.now().isoformat(),
        **(extra or {}),
    }
    (lease_dir / f"{session_id}.json").write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )


# ── instinct loading ───────────────────────────────────────────────────────────

def parse_instinct_file(content: str) -> list[dict]:
    instincts: list[dict] = []
    current: dict | None = None
    in_frontmatter = False
    body_lines: list[str] = []

    for line in str(content).splitlines():
        if line.strip() == "---":
            if in_frontmatter:
                in_frontmatter = False
            else:
                if current and current.get("id"):
                    current["content"] = "\n".join(body_lines).strip()
                    instincts.append(current)
                current = {}
                body_lines = []
                in_frontmatter = True
            continue

        if in_frontmatter and current is not None:
            sep = line.find(":")
            if sep == -1:
                continue
            key = line[:sep].strip()
            value = line[sep + 1:].strip().strip("\"'")
            if key == "confidence":
                try:
                    current[key] = float(value)
                except ValueError:
                    current[key] = 0.5
            else:
                current[key] = value
        elif current is not None:
            body_lines.append(line)

    if current and current.get("id"):
        current["content"] = "\n".join(body_lines).strip()
        instincts.append(current)

    return instincts


def read_instincts_from_dir(directory: Path, scope: str) -> list[dict]:
    if not directory.exists():
        return []
    instincts: list[dict] = []
    try:
        entries = sorted(
            [e for e in directory.iterdir() if e.is_file() and e.suffix.lower() in (".yaml", ".yml", ".md")],
            key=lambda e: e.name,
        )
        for entry in entries:
            try:
                for inst in parse_instinct_file(entry.read_text(encoding="utf-8")):
                    instincts.append({**inst, "_scope_label": scope, "_source_file": str(entry)})
            except Exception as err:
                log(f"[SessionStart] Warning: failed to parse {entry.name}: {err}")
    except Exception:
        pass
    return instincts


def extract_instinct_action(content: str) -> str:
    m = re.search(r"## Action\s*\n+([\s\S]+?)(?:\n## |\n---|$)", str(content or ""))
    block = (m.group(1) if m else str(content or "")).strip()
    for line in block.splitlines():
        line = line.strip()
        if line:
            return line
    return ""


def summarize_active_instincts(observer_context: dict) -> str:
    hom = get_homunculus_dir()
    dirs = []
    if not observer_context.get("is_global"):
        pd = observer_context["project_dir"]
        dirs += [(pd / "instincts" / "personal", "project"), (pd / "instincts" / "inherited", "project")]
    dirs += [(hom / "instincts" / "personal", "global"), (hom / "instincts" / "inherited", "global")]

    all_instincts: list[dict] = []
    for d, scope in dirs:
        all_instincts.extend(read_instincts_from_dir(d, scope))

    deduped: dict[str, dict] = {}
    for inst in all_instincts:
        if not inst.get("id") or inst.get("confidence", 0) < INSTINCT_CONFIDENCE_THRESHOLD:
            continue
        existing = deduped.get(inst["id"])
        if not existing or (existing.get("_scope_label") != "project" and inst.get("_scope_label") == "project"):
            deduped[inst["id"]] = inst

    ranked = sorted(
        [
            {**inst, "action": extract_instinct_action(inst.get("content", ""))}
            for inst in deduped.values()
            if extract_instinct_action(inst.get("content", ""))
        ],
        key=lambda x: (
            -x.get("confidence", 0),
            0 if x.get("_scope_label") == "project" else 1,
            str(x.get("id", "")),
        ),
    )[:MAX_INJECTED_INSTINCTS]

    if not ranked:
        return ""

    log(f"[SessionStart] Injecting {len(ranked)} instinct(s) into session context")
    lines = [
        f"- [{inst['_scope_label']} {round(inst.get('confidence', 0) * 100)}%] {inst['action']}"
        for inst in ranked
    ]
    return "Active instincts:\n" + "\n".join(lines)


# ── project type detection ─────────────────────────────────────────────────────

_LANGUAGE_MARKERS: list[tuple[str, list[str], set[str]]] = [
    ("python",     ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile"], {".py"}),
    ("typescript", ["tsconfig.json", "tsconfig.build.json"],                                   {".ts", ".tsx"}),
    ("javascript", ["package.json", "jsconfig.json"],                                          {".js", ".jsx", ".mjs"}),
    ("golang",     ["go.mod", "go.sum"],                                                       {".go"}),
    ("rust",       ["Cargo.toml"],                                                             {".rs"}),
    ("ruby",       ["Gemfile", "Rakefile"],                                                    {".rb"}),
    ("java",       ["pom.xml", "build.gradle"],                                                {".java"}),
    ("csharp",     [],                                                                         {".cs", ".csproj", ".sln"}),
    ("elixir",     ["mix.exs"],                                                                {".ex", ".exs"}),
    ("php",        ["composer.json"],                                                          {".php"}),
]


def detect_project_type(project_dir: Path | None = None) -> dict:
    d = project_dir or Path(os.getcwd())
    try:
        entries = list(d.iterdir())
        root_files = {e.name for e in entries if e.is_file()}
        root_exts = {Path(n).suffix for n in root_files}
    except Exception:
        return {"languages": [], "frameworks": [], "primary": "unknown", "projectDir": str(d)}

    languages: list[str] = []
    for lang, markers, exts in _LANGUAGE_MARKERS:
        if any(m in root_files for m in markers) or bool(exts & root_exts):
            languages.append(lang)

    if "typescript" in languages and "javascript" in languages:
        languages.remove("javascript")

    return {
        "languages": languages,
        "frameworks": [],
        "primary": languages[0] if languages else "unknown",
        "projectDir": str(d),
    }


# ── package manager detection ──────────────────────────────────────────────────

def get_package_manager(project_dir: Path | None = None) -> dict:
    d = project_dir or Path(os.getcwd())
    env_pm = os.environ.get("CLAUDE_PACKAGE_MANAGER")
    if env_pm in ("npm", "pnpm", "yarn", "bun"):
        return {"name": env_pm, "source": "environment"}
    for lock, name in [("pnpm-lock.yaml", "pnpm"), ("bun.lockb", "bun"), ("yarn.lock", "yarn"), ("package-lock.json", "npm")]:
        if (d / lock).exists():
            return {"name": name, "source": "lock-file"}
    global_cfg = get_claude_dir() / "package-manager.json"
    if global_cfg.exists():
        try:
            cfg = json.loads(global_cfg.read_text(encoding="utf-8"))
            if cfg.get("packageManager") in ("npm", "pnpm", "yarn", "bun"):
                return {"name": cfg["packageManager"], "source": "global-config"}
        except Exception:
            pass
    return {"name": "npm", "source": "default"}


# ── session aliases ────────────────────────────────────────────────────────────

def list_aliases(limit: int = 5) -> list[dict]:
    try:
        data = json.loads((get_claude_dir() / "session-aliases.json").read_text(encoding="utf-8"))
        aliases = [{"name": n, **info} for n, info in (data.get("aliases") or {}).items()]
        aliases.sort(key=lambda a: a.get("updatedAt") or a.get("createdAt") or "", reverse=True)
        return aliases[:limit]
    except Exception:
        return []


# ── coding level ──────────────────────────────────────────────────────────────

_LEVEL_NAMES = {-1: "Default", 0: "ELI5", 1: "Junior", 2: "Mid-level", 3: "Senior", 4: "Tech Lead", 5: "God Mode"}
_LEVEL_FILES = {0: "0-eli5.md", 1: "1-junior.md", 2: "2-midlevel.md", 3: "3-senior.md", 4: "4-techlead.md", 5: "5-godmode.md"}


def read_coding_level() -> str | None:
    root = get_project_root()
    if not root:
        return None
    ck_path = root / ".ck.json"
    if not ck_path.exists():
        return None
    try:
        cfg = json.loads(ck_path.read_text(encoding="utf-8"))
        level = int(cfg.get("codingLevel", 5))
        if level not in _LEVEL_NAMES:
            return None
        log(f"[SessionStart] Coding level: {level} ({_LEVEL_NAMES[level]})")
        if level == -1:
            return None  # explicit default — no style injection
        style_file = root / ".claude" / "coding-levels" / _LEVEL_FILES[level]
        try:
            return style_file.read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            raise FileNotFoundError(f"Level file not found: {style_file}") from None
    except Exception as err:
        log(f"[SessionStart] Warning: failed to read .ck.json: {err}")
        return None


# ── helpers ───────────────────────────────────────────────────────────────────

_CODING_LEVEL_RE = re.compile(r"coding.?level|codingLevel", re.IGNORECASE)


def _strip_coding_level_lines(text: str) -> str:
    """Remove lines mentioning coding level from injected session state.

    The active level is already set authoritatively by the hook above;
    historical mentions in session state would create conflicting context.
    """
    lines = [ln for ln in text.splitlines() if not _CODING_LEVEL_RE.search(ln)]
    return "\n".join(lines)


# ── main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    sessions_dir = get_sessions_dir()
    learned_dir = get_learned_skills_dir()
    context_parts: list[str] = []
    observer_context = resolve_project_context()

    ensure_dir(sessions_dir)
    ensure_dir(learned_dir)

    # Register observer session lease
    session_id = resolve_session_id()
    if session_id:
        write_session_lease(observer_context, {"hook": "SessionStart", "projectRoot": observer_context["project_root"]})
        log(f"[SessionStart] Registered observer lease for {session_id}")
    else:
        log("[SessionStart] No CLAUDE_SESSION_ID available; skipping observer lease registration")

    # Coding level
    coding_level = read_coding_level()
    if coding_level:
        context_parts.append(coding_level)

    # Active instincts
    instinct_summary = summarize_active_instincts(observer_context)
    if instinct_summary:
        context_parts.append(instinct_summary)

    # Previous session state (skip in benchmark mode to avoid context bleed)
    if os.environ.get("BENCHMARK_MODE") == "1":
        log("[SessionStart] BENCHMARK_MODE — skipping session state injection")
    else:
        state_file = sessions_dir / ".last-state.md"
        if state_file.exists():
            try:
                state_content = strip_ansi(state_file.read_text(encoding="utf-8").strip())
                if state_content:
                    state_content = _strip_coding_level_lines(state_content)
                    context_parts.append(f"Previous session state:\n{state_content}")
                    log(f"[SessionStart] Loaded session state from .last-state.md")
            except Exception as e:
                log(f"[SessionStart] Warning: could not read session state: {e}")
        else:
            log("[SessionStart] No previous session state found")

    # Learned skills count (log only)
    learned = find_files(learned_dir, "*.md")
    if learned:
        log(f"[SessionStart] {len(learned)} learned skill(s) available in {learned_dir}")

    # Session aliases (log only)
    aliases = list_aliases(limit=5)
    if aliases:
        log(f"[SessionStart] {len(aliases)} session alias(es) available: {', '.join(a['name'] for a in aliases)}")
        log("[SessionStart] Use /sessions load <alias> to continue a previous session")

    # Package manager (log only)
    pm = get_package_manager()
    log(f"[SessionStart] Package manager: {pm['name']} ({pm['source']})")
    if pm["source"] == "default":
        log("[SessionStart] No package manager preference found.")

    # Project type detection
    project_info = detect_project_type()
    if project_info["languages"] or project_info["frameworks"]:
        parts = []
        if project_info["languages"]:
            parts.append(f"languages: {', '.join(project_info['languages'])}")
        if project_info["frameworks"]:
            parts.append(f"frameworks: {', '.join(project_info['frameworks'])}")
        log(f"[SessionStart] Project detected — {'; '.join(parts)}")
        context_parts.append(f"Project type: {json.dumps(project_info)}")
    else:
        log("[SessionStart] No specific project type detected")

    # Output payload to stdout
    payload = json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": "\n\n".join(context_parts),
        }
    })
    sys.stdout.write(payload)
    sys.stdout.flush()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"[SessionStart] Error: {e}")
        sys.exit(0)
