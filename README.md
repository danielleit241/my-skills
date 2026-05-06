# my-skills

A personal Claude Code configuration — slash commands, sub-agents, skills, and lifecycle hooks that turn Claude into a structured development partner.

**Principles:** YAGNI · KISS · DRY · Brutal honesty · Challenge every assumption

---

## Documentation

Full guide to the `/plan → /cook → /fix` pipeline: **[https://danielleit241.github.io/my-skills/](https://danielleit241.github.io/my-skills/)**

---

## Pipelines

Three main pipelines cover the full development loop:

```
/plan ──► /cook ──► /fix
```

| Command        | What it does                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------- |
| `/plan`        | Research → write plan files → red-team → validate. Auto-detects complexity.                   |
| `/cook`        | Implement a plan phase by phase. Rigor-scores the change → selects tier (Nano/Fast/Standard/Full) → implement → test → auto-simplify → review → finalize. Modes: `--fast` (skip test/review), `--hard` (mandatory reviewers). Flags: `--no-test`, `--tdd`. |
| `/fix`         | Bug-fix pipeline. Scout → diagnose + fix → review → finalize.                                 |
| `/show-off`    | Generate a social-ready HTML presentation → review gate → capture as 1:1/16:9/9:16 PNGs.    |
| `/code-review` | Review local uncommitted changes or a GitHub PR by number/URL.                                |
| `/docs-fe`     | Generate a FE handoff doc for changed endpoints (contracts, params, errors).                  |
| `/learn`       | Extract a reusable pattern from the current session and save it as a skill file.              |
| `/brainstorm`  | Explore and debate solutions before writing code — scout codebase, ask questions, research options, produce a decision report. Ends with → /plan or archive. No code written. |
| `/init`        | Bootstrap `.claude/` config for another project — interactive wizard: bundles, skills, hooks, CLAUDE.md, .ck.json. Flags: `--show` (print config), `--reset` (wipe config). |
| `/coding-level`| Set session coding level 0–5 (0=ELI5 → 5=godmode). Persists to `.ck.json`.                 |

---

## Agents

Sub-agents spawned by the pipelines. Never called directly.

**Planning**

| Agent             | Role                                                     | Model  |
| ----------------- | -------------------------------------------------------- | ------ |
| `researcher`      | Research a feature approach (2 run in parallel)          | sonnet |
| `planner`         | Write `plan.md` + phase files from research              | sonnet |
| `plan-reviewer`   | Red-team the plan — security, assumptions, failure modes | sonnet |

**Implementation**

| Agent                  | Role                                                         | Model  |
| ---------------------- | ------------------------------------------------------------ | ------ |
| `scout`                | Codebase reconnaissance — maps files, patterns, dependencies | haiku  |
| `debugger`             | Root-cause diagnosis + fix application                       | sonnet |
| `tester`               | Write and run tests, report pass/fail                        | sonnet |
| `code-reviewer`        | Code review against project conventions                      | sonnet |
| `playwright-capture`   | Capture show-off HTML sections — one section per 1:1/16:9/9:16 PNG, centered card on bokeh background | sonnet |

**Finalize (shared by /cook and /fix)**

| Agent             | Role                                          | Model |
| ----------------- | --------------------------------------------- | ----- |
| `project-manager` | Sync phase checkboxes and plan status         | haiku |
| `docs-manager`    | Update affected docs minimally                | haiku |
| `git-manager`     | Stage files, conventional commit, ask to push | haiku |

---

## Skills

Behavioral guidance that loads automatically when relevant.

| Skill                    | Triggers when                                                       |
| ------------------------ | ------------------------------------------------------------------- |
| `backend-mindset`        | Architecture decisions, API design, testing strategy (language-agnostic) |
| `caveman`                | Terse output mode — user says "be brief" or context is filling up   |
| `code-review`            | Reviewing code, receiving feedback, verifying completion            |
| `mermaidjs-v11`          | Creating diagrams and visualizations                                |
| `playwright-skill`       | Browser automation, UI testing, screenshots, responsive validation  |
| `problem-solving`        | Stuck on a problem, need creative unblocking                        |
| `sequential-thinking`    | Complex multi-step reasoning                                        |
| `skill-creator`          | Creating or improving skill files                                   |
| `strategic-compact`      | Managing context window across long sessions                        |

---

## Hooks

Lifecycle hooks wired in `.claude/settings.json`.

| Event              | Hook                   | Purpose                                               |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| `SessionStart`     | `session_init.py`      | Load previous session summary + active instincts      |
| `SessionStart`     | `subagent_init.py`     | Initialize sub-agent context                          |
| `Stop` / `SubagentStop` | `session_end.py`  | Extract summary from transcript, persist session file |
| `PreCompact`       | `pre_compact.py`       | Log compaction event, reset caveman state, annotate session file |
| `UserPromptSubmit` | `dev_rules_reminder.py`| Inject dev rules reminder on each prompt              |
| `UserPromptSubmit` | `caveman_watch.py`     | Track tool calls; emit CAVEMAN_TRIGGERED/RELEASED events |
| `PreToolUse`       | `privacy_block.py`     | Block reads/writes to sensitive paths                 |
| `PreToolUse`       | `suggest_compact.py`   | Count tool calls, suggest `/compact` at threshold     |
| `PostToolUse`      | `build_check.py`       | Run build/type-check after file edits (CS/TS/Py/Go/Rust) |
| `PostToolUse`      | `simplify_gate.py`     | Track LOC + file-edit metrics; trigger `simplify` skill when thresholds breached |
| `PostToolUse`      | `artifact_fold.py`     | Fold large Read/Grep/Bash outputs into summary-only view |

Matchers vary per hook — `privacy_block.py` covers `Read|Write|Edit|Bash`; `suggest_compact.py` covers `Write|Edit|Bash|Agent`; `build_check.py` and `simplify_gate.py` cover `Write|Edit` only; `artifact_fold.py` covers `Read|Grep|Bash`.

### Simplify thresholds

Configured in `.ck.json` under `simplify.threshold`:

| Key | Default | Meaning |
|-----|---------|---------|
| `totalLoc` | 400 | Cumulative lines written/edited this session |
| `fileCount` | 8 | Unique files touched |
| `singleFileLoc` | 200 | Lines in a single Write/Edit call |
| `enabled` | `true` | Set `false` to disable entirely |

When any threshold is breached, `/cook` Step 3.S automatically invokes the `simplify` skill before code review.

### Cook Pipeline Tiers

`/cook` scores the change before implementation and selects a pipeline tier:

| Score | Tier | Steps |
|-------|------|-------|
| 0 | Nano | Implement → git-manager only |
| 1–2 | Fast | Implement → git-manager only |
| 3–5 | Standard | Implement → test → review → finalize |
| 6+ | Full | Standard + plan-reviewer + mandatory code-reviewer |

**Scoring signals:** files touched (0–3 pts), cross-module impact (+2), security-sensitive code (+3), public API change (+2), DB schema change (+2), new external dependency (+1).

Use `--fast` to skip test/review, `--hard` for mandatory review. Use `--no-test` to skip tester, `--tdd` to write failing tests first.

### Caveman Mode

Configured in `.ck.json` under `cavemanMode`:

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | `true` | Enable caveman mode globally |
| `threshold.orange` | 50 | Tool calls before orange warning emitted |
| `threshold.red` | 100 | Tool calls before red warning + auto-trigger caveman |

When red threshold hit, `caveman_watch.py` emits `CAVEMAN_TRIGGERED` event; when user deactivates, emits `CAVEMAN_RELEASED`.

### Artifact Folding

Configured in `.ck.json` under `artifactFolding`:

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | `true` | Enable artifact folding globally |
| `threshold.maxChars` | 4000 | Collapse output larger than N chars |
| `threshold.maxLines` | 120 | Collapse output larger than N lines |
| `threshold.previewLines` | 10 | Show first N lines in summary view |

Applied by `artifact_fold.py` hook on Read, Grep, and Bash outputs to keep terminal readable during long sessions.

---

## Structure

```
.claude/
├── agents/          # sub-agent definitions (.md)
├── commands/        # slash commands (.md)
├── skills/          # skill directories (SKILL.md + references/)
├── rules/           # path-scoped design principles (lazy-load)
│   ├── agents.md    # activates for .claude/agents/**
│   ├── commands.md  # activates for .claude/commands/**
│   └── skills.md    # activates for .claude/skills/**
├── hooks/           # lifecycle hook scripts
├── lib/             # shared Python utilities for hooks
└── settings.json    # hook wiring + ignore patterns
CLAUDE.md            # project entry point (thin — under 200 lines)
EXAMPLES.md          # C# examples for backend coding principles
```

---

## Requirements

- [Claude Code](https://claude.ai/code) CLI
- Python 3.10+ (for hooks)

---

## Installation

### Via Claude Code Marketplace (recommended)

```
/plugin marketplace add danielleit241/my-skills
```

Install everything:

```
/plugin install all@my-skills
```

Or install individual plugins (see [plugin list](https://danielleit241.github.io/my-skills/)).

### Manual

Copy `.claude/` into any project:

```bash
cp -r /path/to/my-skills/.claude /path/to/your-project/
```

For personal preferences that shouldn't be committed, create `CLAUDE.local.md` in the project root (gitignored by Claude Code automatically).

### Typical workflow

```
/plan --hard add user authentication
# → research → plan files written to plans/YYMMDD-auth/

/cook plans/YYMMDD-auth/plan.md
# → implement phase by phase, test, review, commit

/fix --quick broken login redirect
# → scout → diagnose + fix → commit

/code-review
# → review uncommitted changes

/code-review 42
# → review GitHub PR #42
```
