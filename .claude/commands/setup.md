---
description: Bootstrap .claude/ configuration for another project — interactive bundle wizard, copies agents/hooks/commands from my-skills as source-of-truth
---

# /setup — Bootstrap `.claude/` for Another Project

## Usage

```
/setup [target-path]
```

If `target-path` is omitted, ask for it interactively.

---

## How to execute this command

Read `$ARGUMENTS` for an optional target path, then run the wizard step-by-step. **Wait for user answer at each step before continuing.**

The source directory is always `$CLAUDE_PROJECT_DIR/.claude/` (this repo).

---

### Step 0 — Target path + preflight

If no path in `$ARGUMENTS`, ask:

```
Target project path (absolute or relative to current dir):
```

Resolve to absolute path. Validate:
- Does not exist → ask `Create it? (y/n)`. Yes: `mkdir -p <target>`. No: abort.
- Exists but not a directory → abort with error.

Check if `<target>/.claude/` already exists. If it does, ask:

```
.claude/ already exists in that project.
  [M] Merge     — copy only missing files, skip existing ones  (default)
  [O] Overwrite — replace everything
  [A] Abort
```

Check Python in PATH: `python --version 2>&1 || python3 --version 2>&1`. If neither found, warn now (not after writing):

```
⚠ Python 3 not found in PATH. Hooks require Python 3.x — install it before opening this project in Claude Code.
Continue anyway? (y/n)
```

---

### Step 1 — Bundle selection

```
─── Core (always included) ──────────────────────────────────
  session hooks, coding-levels, /ck:init, /coding-level, rules

─── Additional bundles ──────────────────────────────────────
Enter numbers (space-separated) or "all":

  1  plan / cook / fix      Full dev workflow
  2  code-review            Standalone /code-review command
  3  learn                  Extract session patterns → skill files
  4  show-off               HTML presentation generator + Playwright
  5  docs-fe                Frontend endpoint handoff doc
  6  continuous-learning    Observe tool calls → instincts (heavy)
```

Parse into `selected_bundles`. "all" = {1,2,3,4,5,6}.

---

### Step 2 — Optional hooks

```
Optional hooks (enter letters, "both", or "none") [both]:
  b  build-check     Auto type-check after Write/Edit
  s  code-simplifier Trigger /simplify when edit volume exceeds threshold
```

Parse into `selected_hooks`. Default = both.

---

### Step 3 — CLAUDE.md

```
Bootstrap a CLAUDE.md template? (y/n) [y]:
```

---

### Step 4 — Preview

Show a file tree of everything that will be written:

```
<target>/
  .claude/
    commands/   <selected command files>
    agents/     <selected agent files>
    hooks/      session-start.py  session-end.py  pre-compact.py
                suggest_compact.py  plan-context.py  <optional hooks>
    lib/utils.py
    coding-levels/  0-eli5.md … 5-godmode.md
    rules/  agents.md  commands.md  skills.md
    settings.json   (generated)
  CLAUDE.md         (generated — if requested)
```

Ask: `Write these files? (y/n)`

If no: `Aborted. No files written.` and stop.

---

### Step 5 — Execute

**5a. Create directories**

```bash
mkdir -p <target>/.claude/commands/ck
mkdir -p <target>/.claude/agents
mkdir -p <target>/.claude/hooks
mkdir -p <target>/.claude/lib
mkdir -p <target>/.claude/coding-levels
mkdir -p <target>/.claude/rules
```

**5b. Copy core files (always)**

From `$CLAUDE_PROJECT_DIR/.claude/` → `<target>/.claude/`:

- `hooks/session-start.py`, `hooks/session-end.py`, `hooks/pre-compact.py`, `hooks/suggest_compact.py`, `hooks/plan-context.py`
- `lib/utils.py`
- `coding-levels/0-eli5.md` through `coding-levels/5-godmode.md`
- `rules/agents.md`, `rules/commands.md`, `rules/skills.md`
- `commands/ck/init.md`, `commands/coding-level.md`

**5c. Copy bundle files**

| Bundle | Commands | Agents |
|--------|----------|--------|
| 1 plan/cook/fix | `commands/plan.md`, `commands/cook.md`, `commands/fix.md` | `agents/scout.md`, `agents/debugger.md`, `agents/tester.md`, `agents/code-reviewer.md`, `agents/planner.md`, `agents/plan-researcher.md`, `agents/plan-reviewer.md`, `agents/project-manager.md`, `agents/docs-manager.md`, `agents/git-manager.md` |
| 2 code-review | `commands/code-review.md` | `agents/code-reviewer.md` (skip if already copied) |
| 3 learn | `commands/learn.md` | — |
| 4 show-off | `commands/show-off.md` | `agents/playwright-capture.md` |
| 5 docs-fe | `commands/docs-fe.md` | — |
| 6 continuous-learning | — | — (hooks only, see 5d) |

In Merge mode: skip any destination file that already exists.

**5d. Copy optional hooks**

- `build-check` selected → copy `hooks/build-check.py`
- `code-simplifier` selected → copy `hooks/code-simplifier.py`
- `continuous-learning` selected → copy `hooks/observe.py`

**5e. Generate `settings.json`**

Build the hooks object using only selected features. Include each entry according to this table:

| Hook event | Entry | Include when |
|------------|-------|--------------|
| SessionStart | `session-start.py` | always |
| UserPromptSubmit | `plan-context.py` (timeout 5) | always |
| PreCompact | `pre-compact.py` (timeout 5) | always |
| PreToolUse `Write\|Edit\|Bash\|Agent` | `suggest_compact.py` (timeout 5) | always |
| PreToolUse `Write\|Edit\|Bash\|Agent` | `observe.py pre` (timeout 10) | continuous-learning |
| PostToolUse `Write\|Edit\|Bash\|Agent` | `observe.py post` (timeout 10) | continuous-learning |
| PostToolUse `Write\|Edit` | `build-check.py` (timeout 30) | build-check |
| PostToolUse `Write\|Edit` | `code-simplifier.py` (timeout 5) | code-simplifier |
| Stop | `session-end.py` (async, timeout 10) | always |
| SubagentStop | `session-end.py` (async, timeout 10) | always |

Also include:
```json
"ignorePatterns": ["**/bin/**","**/obj/**","**/.vs/**","**/.git/**","**/Migrations/**","**/TestResults/**","**/coverage/**","**/.claude/session-data/**","**/*.suo","**/*.user","**/*.lock.json","**/node_modules/**"],
"env": { "CLAUDE_CODE_DISABLE_1M_CONTEXT": "true" }
```

Write the assembled JSON (no comments) to `<target>/.claude/settings.json`.

**5f. Write `CLAUDE.md`** (if Step 3 was yes; skip in Merge mode if file already exists)

Use the target directory's base name as `<project-name>`. Write to `<target>/CLAUDE.md`:

```
# <project-name>

## Core Principles

<!-- Add your project's guiding principles here -->

## Structure

    <!-- Describe your project layout here (use code fence or indentation) -->

## Rules

Path-scoped design rules live in `.claude/rules/`:

| File | Activates for |
|------|---------------|
| `.claude/rules/agents.md` | `.claude/agents/**` |
| `.claude/rules/commands.md` | `.claude/commands/**` |
| `.claude/rules/skills.md` | `.claude/skills/**` |
```

**5g. Configure `.ck.json`**

Run `/ck:init` interactively in the target project to write `.ck.json`. Instruct the user:

```
Now configuring .ck.json for the target project.
(Running /ck:init — answer the prompts below)
```

Execute the same interactive flow as `/ck:init`: coding level, compact day, simplify thresholds. Write `.ck.json` at `<target>/.ck.json` (not the current project root).

---

### Step 6 — Finish report

```
Setup complete ✓
  Target:   <target>
  Files:    <N> copied
  Hooks:    session-start · session-end · plan-context · pre-compact · suggest_compact<optional extras>
  .ck.json: coding level <N>, compact every <N> days
  CLAUDE.md: created / skipped

Next:
  cd <target>
  claude           ← SessionStart hook fires automatically on open
  /ck:init --show  ← verify config
```
