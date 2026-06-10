# my-skills

A personal Claude Code configuration — slash commands, sub-agents, skills, and lifecycle hooks that turn Claude into a structured development partner.

**Principles:** YAGNI · KISS · DRY · Brutal honesty · Challenge every assumption

## Versioned CLI

The repository also ships a project-scoped CLI for installing, updating, migrating, and reverting the toolkit without manually copying files.

```bash
npm install
npm run build

node dist/cli.js init ../target-project --agent claude --bundle full
node dist/cli.js init ../target-project --agent codex --bundle full --dry-run
node dist/cli.js status ../target-project
node dist/cli.js validate ../target-project
```

After publishing the package, the same commands can run through:

```bash
npx @danielleit241/my-skills init ../target-project --agent codex --bundle full
```

### Commands

| Command | Purpose |
| --- | --- |
| `init [target]` | Install selected bundles for Claude or Codex and create `.my-skills.lock.json`. |
| `update [version] [target]` | Update to a SemVer Git tag. The default `latest` selects the highest `v*` tag. |
| `migrate [target] --from claude --to codex` | Render the installed bundles with another agent adapter. |
| `revert <version> [target]` | Restore files from a previous SemVer Git tag without resetting the target repository. |
| `status [target]` | Show the installed release and locally modified or deleted managed files. |
| `validate [target]` | Validate installed skill and agent structures. |

All mutating commands support `--dry-run`. Managed files are overwritten or removed only when their current SHA-256 matches the lockfile. A local edit produces a conflict and a text diff; use `--force` only when discarding that edit is intentional.

### Bundles and adapters

`toolkit.manifest.json` is the source manifest. The built-in bundles are:

- `full`: all configuration, skills, commands, agents, hooks, and rules.
- `development`: core configuration, skills, commands, and agents.
- `skills`: skills only.

The Claude adapter preserves the `.claude/` layout. The Codex adapter maps:

- Skills and slash commands to `.agents/skills/`.
- Sub-agents to `.codex/agents/*.toml`, including Codex model and reasoning defaults derived from the Claude role.
- Hooks to `.codex/hooks.json` and scripts to `.codex/hooks/`; unsupported Claude tool matchers are removed and commands resolve from the Git root on Unix and Windows.
- `CLAUDE.md` to `AGENTS.md`.
- Project defaults to `.codex/config.toml`, with hooks enabled and bounded subagent concurrency.

Items without a direct target mapping are reported as `unsupported` rather than silently dropped.

### Releases and recovery

Release tags must use SemVer:

```bash
npm test
npm run validate:toolkit
git tag v2.0.0
git push origin v2.0.0
```

Update or revert a target project:

```bash
npx @danielleit241/my-skills update 2.1.0 ../target-project --dry-run
npx @danielleit241/my-skills update 2.1.0 ../target-project
npx @danielleit241/my-skills revert 2.0.0 ../target-project
```

Writes use a filesystem transaction. If a write fails, earlier writes in that operation are restored. The CLI never commits or resets the target repository.

### Automated npm publishing

The `Publish npm` GitHub Action publishes only from SemVer tags. The tag, `package.json`, and `toolkit.manifest.json` must contain the same version.

1. Add an npm automation token as the repository secret `NPM_TOKEN`.
2. Bump both version files, commit, then create and push the matching tag:

```bash
npm version 2.1.0 --no-git-tag-version
# Update toolkit.manifest.json to 2.1.0.
npm run version:check -- v2.1.0
git add .
git commit -m "release: v2.1.0"
git tag v2.1.0
git push origin HEAD --follow-tags
```

The workflow can also be rerun manually by selecting an existing tag. It never publishes arbitrary untagged branch contents.

---

## Pipelines

Three main pipelines cover the full development loop:

```
/ck:brainstorm ──► /ck:plan ──► /ck:cook ──► /ck:fix
```

| Command           | What it does                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ck:brainstorm`  | Scout the repo, lock exact requirements, compare approaches, and write a brainstorm report.                                                                                                       |
| `/ck:plan`        | Cross-plan scan → research → phased plan → red-team → validate. Modes: `--fast`, `--hard`, `--deep`, `--two`, `--parallel`.                                                                         |
| `/ck:cook`        | Scout + requirements + plan gate → implement → test → review → finalize. Modes: `--fast`, `--auto`, `--parallel`. Flags: `--tdd`, `--no-test`.                                                     |
| `/ck:fix`         | Bug-fix pipeline. Scout → diagnose → fix → prevention guard → finalize. Modes: `--auto` (default), `--quick`, `--review`, `--parallel`.                                                             |
| `/ck:code-review` | 3-stage adversarial review (Spec Compliance → Code Quality → Adversarial). Modes: `#PR`, commit hash, `--pending`, `codebase parallel`.                                                             |
| `/show-off`       | Generate a social-ready HTML presentation → review gate → capture as PNGs.                                                                                                                          |
| `/docs-fe`        | Generate a FE handoff doc for changed endpoints (contracts, params, errors).                                                                                                                        |
| `/learn`          | Extract a reusable pattern from the current session and save it as a skill file.                                                                                                                    |
| `/coding-level`   | Set session coding level 0–5 (0=ELI5 → 5=godmode). Persists to `.ck.json`.                                                                                                                          |

---

## Agents

Sub-agents spawned by the pipelines. Never called directly.

**Planning**

| Agent           | Role                                                     | Model  |
| --------------- | -------------------------------------------------------- | ------ |
| `researcher`    | Research a feature approach (2 run in parallel)          | sonnet |
| `planner`       | Write `plan.md` + phase files from research              | sonnet |
| `plan-reviewer` | Red-team the plan — security, assumptions, failure modes | sonnet |

**Implementation**

| Agent           | Role                                                                                          | Model  |
| --------------- | --------------------------------------------------------------------------------------------- | ------ |
| `scout`         | Codebase reconnaissance — maps files, patterns, dependencies                                  | haiku  |
| `debugger`      | Root-cause diagnosis + fix application                                                        | sonnet |
| `tester`        | Write and run tests, report pass/fail                                                         | sonnet |
| `code-reviewer` | Adversarial code review with 4 evidence checks (criteria/blast-radius/regression/adversarial) | sonnet |

**Finalize** (shared by `/ck:cook` and `/ck:fix`)

| Agent             | Role                                          | Model |
| ----------------- | --------------------------------------------- | ----- |
| `project-manager` | Sync phase checkboxes and plan status         | haiku |
| `docs-manager`    | Update affected docs minimally                | haiku |
| `git-manager`     | Stage files, conventional commit, ask to push | haiku |

---

## Skills

Behavioral guidance that loads automatically when relevant.

| Skill                 | Triggers when                                                          |
| --------------------- | ---------------------------------------------------------------------- |
| `ck-brainstorm`       | Design question, "how should I approach X", pre-planning clarification |
| `ck-plan`             | "plan this", "I want to build X", or after a brainstorm report         |
| `ck-cook`             | "cook this", "implement it", passes a plan.md path                     |
| `ck-fix`              | Error message, stack trace, "fix this bug", "tests are failing"        |
| `ck-code-review`      | "review this PR", "code review", paste PR number or commit hash        |
| `backend-mindset`     | Architecture decisions, API design, testing strategy                   |
| `caveman`             | Terse output mode — "be brief" or context is filling up                |
| `code-review`         | Reviewing code, receiving feedback, verifying completion               |
| `problem-solving`     | Stuck on a problem, need creative unblocking                           |
| `sequential-thinking` | Complex multi-step reasoning                                           |
| `skill-creator`       | Creating or improving skill files                                      |
| `strategic-compact`   | Managing context window across long sessions                           |

---

## Hooks

Lifecycle hooks wired in `.claude/settings.json`.

| Event                   | Hook                    | Purpose                                                                              |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `SessionStart`          | `session_init.py`       | Load previous session summary + active instincts                                     |
| `SubagentStart`         | `subagent_init.py`      | Initialize sub-agent context                                                         |
| `Stop` / `SubagentStop` | `session_end.py`        | Extract summary from transcript, persist session file                                |
| `PreCompact`            | `pre_compact.py`        | Log compaction event, reset caveman state, annotate session file                     |
| `UserPromptSubmit`      | `dev_rules_reminder.py` | Inject rules and active-plan context, throttled to once per 5 minutes                |
| `UserPromptSubmit`      | `simplify_gate.py`      | Optionally block ship/merge/PR/deploy/publish when the diff exceeds thresholds       |
| `UserPromptSubmit`      | `caveman_watch.py`      | Track tool calls; emit CAVEMAN_TRIGGERED/RELEASED events                             |
| `PreToolUse`            | `privacy_block.py`      | Block Read/Edit/Write/Glob/Grep/Bash access to sensitive paths (`.env`, keys, certs) |
| `PreToolUse`            | `suggest_compact.py`    | Count tool calls, suggest `/compact` at threshold                                    |
| `PostToolUse`           | `build_check.py`        | Run build/type-check after file edits (C#/TS/Py/Go/Rust)                             |
| `PostToolUse`           | `artifact_fold.py`      | Fold large Read/Grep/Bash outputs into summary-only view                             |

### Simplify thresholds

Configured in `.ck.json` under `simplify.threshold`:

| Key             | Default | Meaning                                          |
| --------------- | ------- | ------------------------------------------------ |
| `totalLoc`      | 400     | Total added and deleted lines in `git diff HEAD` |
| `fileCount`     | 8       | Changed files in `git diff HEAD`                 |
| `singleFileLoc` | 200     | Added lines in the largest changed file          |
| `gate.enabled`  | `false` | Set `true` to block matching ship intent         |

The gate only runs for prompts containing ship, merge, PR, deploy, or publish intent.

### Caveman Mode

Configured in `.ck.json` under `cavemanMode`:

| Key                | Default | Meaning                                              |
| ------------------ | ------- | ---------------------------------------------------- |
| `enabled`          | `true`  | Enable caveman mode globally                         |
| `threshold.orange` | 50      | Tool calls before orange warning emitted             |
| `threshold.red`    | 100     | Tool calls before red warning + auto-trigger caveman |

When red threshold is hit, `caveman_watch.py` emits `CAVEMAN_TRIGGERED`; when deactivated, emits `CAVEMAN_RELEASED`.

### Artifact Folding

Configured in `.ck.json` under `artifactFolding`:

| Key                      | Default | Meaning                             |
| ------------------------ | ------- | ----------------------------------- |
| `enabled`                | `true`  | Enable artifact folding globally    |
| `threshold.maxChars`     | 4000    | Collapse output larger than N chars |
| `threshold.maxLines`     | 120     | Collapse output larger than N lines |
| `threshold.previewLines` | 10      | Show first N lines in summary view  |

Applied by `artifact_fold.py` on Read, Grep, and Bash outputs.

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
└── settings.json    # hook wiring + permissions
CLAUDE.md            # project entry point
```

---

## Requirements

- [Claude Code](https://claude.ai/code) CLI
- Python 3.10+ (for hooks)

---

## Installation

### Manual

Copy `.claude/` into any project:

```bash
cp -r /path/to/my-skills/.claude /path/to/your-project/
```

For personal preferences that shouldn't be committed, create `CLAUDE.local.md` in the project root (gitignored by Claude Code automatically).

### Typical workflow

```
/ck:brainstorm add user authentication
# → scout → clarify → compare approaches → brainstorm report written

/ck:plan --hard plans/reports/brainstorm-YYMMDD-HHMM-auth.md
# → research → plan files written to plans/YYMMDD-auth/

/ck:cook plans/YYMMDD-auth/plan.md
# → implement phase by phase → test → review → commit

/ck:fix --quick broken login redirect
# → scout → diagnose + fix → commit

/ck:code-review --pending
# → review uncommitted changes (3-stage adversarial)
```
