---
description: Bootstrap .claude/ configuration for another project — interactive wizard covering bundles, skills, hooks, CLAUDE.md, and .ck.json. Also: --show to print current config, --reset to wipe it.
---

# /ck:init — Bootstrap a Project or Reconfigure

## Usage

```
/ck:init [target-path]   # full bootstrap wizard for a target project
/ck:init --show          # print current project's .ck.json
/ck:init --reset         # wipe current project's .ck.json
```

---

## How to execute this command

Read `$ARGUMENTS`. Dispatch on the first token:

- `--show` → run **Show mode** below
- `--reset` → run **Reset mode** below
- anything else (or empty) → treat as optional target path, run **Wizard mode**

Wizard mode uses `AskUserQuestion` select boxes for all choices. Whenever the user selects `Abort`: output `Aborted. No files written.` and stop immediately.

The source directory is always `$CLAUDE_PROJECT_DIR/.claude/` (this repo).

---

## Show mode

Read `.ck.json` at the current project root. Print a formatted summary of all fields. If the file does not exist, say so and suggest running `/ck:init`.

---

## Reset mode

Delete `.ck.json` at the current project root if it exists. Confirm: `Config reset. Run /ck:init to reconfigure.`

---

## Wizard mode

### Step 0 — Target path + preflight

If no path in `$ARGUMENTS`, ask with plain text:

```
Target project path (absolute or relative to current dir):
```

Resolve to absolute path. Validate:
- Does not exist → `AskUserQuestion`: "Path does not exist. Create it?" / `Create it` / `Abort`
- Exists but not a directory → abort with error.

Once the path is validated, run both checks and present any triggered ones in a **single `AskUserQuestion` with 2 questions** (omit a question if its condition is false):

**Q: Python** — only if Python 3 is not found in PATH:
"⚠ Python 3 not found. Hooks require Python 3.x. Continue anyway?"
Options: `Continue anyway` / `Abort`

**Q: Conflict** — only if `<target>/.claude/` already exists:
"`.claude/` already exists in that project. How should we proceed?"
Options: `Merge` (copy only missing files — Recommended) / `Overwrite` / `Abort`

Use the conflict answer directly in Step 5 execution — Merge skips existing files, Overwrite replaces all.

---

### Step 1 — Bundles, tools + hooks

**Single `AskUserQuestion` with 3 questions:**

**Q1** header: `Dev bundles` | multiSelect: true
"Which dev workflow bundles do you want?"
Options:
- `plan / cook / fix` — Full guided dev workflow
- `code-review` — Standalone /ck:code-review command
- `learn` — Extract session patterns → skill files
- `docs-fe` — Frontend endpoint handoff doc

**Q2** header: `Extra tools` | multiSelect: true
"Any additional tools?"
Options:
- `show-off` — HTML presentation generator + Playwright

**Q3** header: `Auto-hooks` | multiSelect: true
"Optional automation hooks:"
Options:
- `build-check` — Auto type-check after Write/Edit (Recommended)
- `code-simplifier` — Trigger /simplify when edit volume exceeds threshold (Recommended)

Bundle label → files mapping used in Step 5:

| Label | Commands | Agents |
|-------|----------|--------|
| plan / cook / fix | plan.md, cook.md, fix.md | scout, debugger, tester, code-reviewer, planner, plan-researcher, plan-reviewer, project-manager, docs-manager, git-manager |
| code-review | code-review.md | code-reviewer (skip if already copied) |
| learn | learn.md | — |
| show-off | show-off.md | playwright-capture |
| docs-fe | docs-fe.md | — |

---

### Step 2 — Skills

**Single `AskUserQuestion` with 3 questions:**

**Q1** header: `Core skills` | multiSelect: true
"Which core dev skills do you want?"
Options:
- `code-review` — Code review guidance (Recommended; auto-included with code-review bundle)
- `backend-mindset` — Architecture, API design, security principles (Recommended)
- `strategic-compact` — Context compaction timing guidance (Recommended)
- `problem-solving` — Creative problem-solving techniques

**Q2** header: `Domain skills` | multiSelect: true
"Any domain-specific skills?"
Options:
- `dotnet` — .NET / C# / ASP.NET Core
- `frontend-slides` — HTML presentation generator (auto-included with show-off bundle)
- `mermaidjs-v11` — Diagrams (Mermaid.js v11)
- `threejs` — 3D web graphics (Three.js / WebGPU)

**Q3** header: `Meta skills` | multiSelect: true
"Meta / automation skills?"
Options:
- `skill-creator` — Create and improve skill files
- `sequential-thinking` — Systematic step-by-step reasoning
- `playwright-skill` — Browser automation (auto-included with show-off bundle)

For each selected skill, copy `skills/<name>/` recursively to `<target>/.claude/skills/<name>/`, excluding any `node_modules/` subdirectory. In Merge mode, skip skills directories that already exist at the destination.

---

### Step 3 — CLAUDE.md

**`AskUserQuestion`:**
"How should we handle CLAUDE.md for this project?"
Options:
- `Auto-generate` — Scan target project and write a tailored CLAUDE.md (Recommended)
- `Blank template` — Minimal template with placeholder sections
- `Skip` — Don't create CLAUDE.md

If Merge mode and `<target>/CLAUDE.md` already exists, skip this step entirely.

---

### Step 4 — Preview + confirm

Show a file tree of everything that will be written:

```
<target>/
  .claude/
    commands/   <selected command files>
    agents/     <selected agent files>
    skills/     <selected skill directories>
    hooks/      session-start.py  session-end.py  pre-compact.py
                suggest_compact.py  plan-context.py  <optional hooks>
    lib/utils.py
    coding-levels/  <all files from source>
    rules/  agents.md  commands.md  skills.md
    settings.json   (generated)
  CLAUDE.md         (if requested)
  .ck.json          (generated)
```

**`AskUserQuestion`:** "Write these files to `<target>`?"
Options: `Yes, write` / `Abort`

---

### Step 5 — Execute

**5a. Create directories**

```bash
mkdir -p <target>/.claude/commands/ck
mkdir -p <target>/.claude/agents
mkdir -p <target>/.claude/skills
mkdir -p <target>/.claude/hooks
mkdir -p <target>/.claude/lib
mkdir -p <target>/.claude/coding-levels
mkdir -p <target>/.claude/rules
```

**5b. Copy core files (always)**

From `$CLAUDE_PROJECT_DIR/.claude/` → `<target>/.claude/`:

- `hooks/session-start.py`, `hooks/session-end.py`, `hooks/pre-compact.py`, `hooks/suggest_compact.py`, `hooks/ck:plan-context.py`
- `lib/utils.py`
- All files in `coding-levels/` (enumerate with Glob — do not hardcode names)
- `rules/agents.md`, `rules/commands.md`, `rules/skills.md`
- `commands/ck/init.md`, `commands/ck:coding-level.md`

**5c. Copy bundle files**

Use the bundle table from Step 1. In Merge mode: skip any destination file that already exists.

**5d. Copy optional hooks**

- `build-check` selected → copy `hooks/build_check.py`
- `simplify-gate` selected → copy `hooks/simplify_gate.py`

**5e. Copy skills**

For each skill selected in Step 2, copy `$CLAUDE_PROJECT_DIR/.claude/skills/<name>/` → `<target>/.claude/skills/<name>/` recursively, skipping any `node_modules/` subtrees. In Merge mode, skip skill directories that already exist at the destination.

**5f. Generate `settings.json`**

Build the hooks object using only selected features:

| Hook event | Entry | Include when |
|------------|-------|--------------|
| SessionStart | `session_init.py` | always |
| SessionStart | `subagent_init.py` | always |
| UserPromptSubmit | `dev_rules_reminder.py` (timeout 5) | always |
| UserPromptSubmit | `caveman_watch.py` (timeout 5) | always |
| PreToolUse `Read\|Write\|Edit\|Bash` | `privacy_block.py` (timeout 5) | always |
| PreCompact | `pre_compact.py` (timeout 5) | always |
| PreToolUse `Write\|Edit\|Bash\|Agent` | `suggest_compact.py` (timeout 5) | always |
| PostToolUse `Write\|Edit` | `build_check.py` (timeout 30) | build-check |
| PostToolUse `Write\|Edit` | `simplify_gate.py` (timeout 5) | simplify-gate |
| PostToolUse `Read\|Grep\|Bash` | `artifact_fold.py` (timeout 5) | always |
| Stop | `session_end.py` (async, timeout 10) | always |
| SubagentStop | `session_end.py` (async, timeout 10) | always |

Also include:
```json
"ignorePatterns": ["**/bin/**","**/obj/**","**/.vs/**","**/.git/**","**/Migrations/**","**/TestResults/**","**/coverage/**","**/.claude/session-data/**","**/*.suo","**/*.user","**/*.lock.json","**/node_modules/**"],
"env": { "CLAUDE_CODE_DISABLE_1M_CONTEXT": "true" }
```

Write assembled JSON (no comments) to `<target>/.claude/settings.json`.

**5g. Write `CLAUDE.md`**

Use the target directory base name as `<project-name>`. Branch on Step 3 answer:

- **Auto-generate**: Glob `<target>/**/*` depth ≤ 2, read any existing README. Read `git log --oneline -10` only when no README exists. Synthesize a real CLAUDE.md: infer tech stack, project purpose, folder layout, and sensible core principles. Always append the Rules section at the end.
- **Blank template**: Write the minimal template below.
- **Skip**: do nothing.

Blank template:
```
# <project-name>

## Core Principles

<!-- Add your project's guiding principles here -->

## Structure

<!-- Describe your project layout here -->

## Rules

Path-scoped design rules live in `.claude/rules/`:

| File | Activates for |
|------|---------------|
| `.claude/rules/agents.md` | `.claude/agents/**` |
| `.claude/rules/commands.md` | `.claude/commands/**` |
| `.claude/rules/skills.md` | `.claude/skills/**` |
```

**5h. Configure `.ck.json`**

**Single `AskUserQuestion` with 3 questions:**

**Q1** header: `Coding level`
"What coding explanation level for this project?"
Options:
- `1 — Junior` — Explain patterns and why; analogies welcome
- `2 — Mid-level` — Assume solid fundamentals, focus on trade-offs (Recommended)
- `3 — Senior` — Architecture and consequences only; skip basics
- `4 — Tech Lead` — System design, org impact, operational concerns

(User can pick Other for levels 0 or 5.)

**Q2** header: `Compact cadence`
"How often should context compaction be suggested?"
Options:
- `1 day` — Aggressive; good for long daily sessions
- `3 days` — Balanced (Recommended)
- `7 days` — Weekly; low-traffic projects
- `14 days` — Minimal interruption

**Q3** header: `Simplify trigger`
"Auto-trigger /simplify when edit volume exceeds (per session):"
Options:
- `small` — 200 total LOC / 4 files / 80 single-file
- `medium` — 400 total LOC / 8 files / 200 single-file (Recommended)
- `large` — 700 total LOC / 15 files / 350 single-file
- `off` — Disable auto-simplify

Map answers to numeric values. Write `.ck.json` at `<target>/.ck.json`:

```json
{
  "codingLevel": <N>,
  "compactDay": <N>,
  "simplify": {
    "threshold": {
      "enabled": <true|false>,
      "totalLoc": <N>,
      "fileCount": <N>,
      "singleFileLoc": <N>
    }
  }
}
```

---

### Step 6 — Finish report

```
Setup complete ✓
  Target:   <target>
  Files:    <N> copied
  Skills:   <selected skill names>
  Hooks:    session-start · session-end · plan-context · pre-compact · suggest_compact<optional extras>
  .ck.json: coding level <N>, compact every <N> days, simplify <size|off>
  CLAUDE.md: auto-generated / blank template / skipped

Next:
  cd <target>
  claude           ← SessionStart hook fires automatically on open
  /ck:init --show  ← verify config
```
