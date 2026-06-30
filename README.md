# forge

A versioned CLI for installing and migrating a personal AI coding toolkit across Claude Code and Codex.

The toolkit includes slash commands, sub-agents, skills, lifecycle hooks, shared rules, and project configuration. It tracks installed files with checksums so updates are repeatable and local edits are not overwritten silently.

**Principles:** YAGNI · KISS · DRY · Brutal honesty · Challenge every assumption

## Install

Requires Node.js 20 or newer.

```bash
npx @danielle241/forge
```

This starts the onboarding wizard. It detects existing `.claude` and `.codex`
folders and offers `init`, `update`, `migrate`, `status`, and `validate`.

Install the CLI globally when preferred:

```bash
npm install --global @danielle241/forge
forge setup
```

Non-interactive installation remains available:

```bash
npx @danielle241/forge init --project-root --agent claude --bundle full
npx @danielle241/forge init --project-path D:\Capstone\Project\src --agent codex --bundle full
```

Use `--project-root` to treat the current working directory as the exact
installation root. Use `--project-path` for any file or nested directory inside a project;
the CLI walks upward to the nearest `.git`, `package.json`, `pyproject.toml`,
`Cargo.toml`, or `go.mod`. The positional `[target]` remains available as a
legacy exact-target argument.

## CLI Commands

| Command                                     | Purpose                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `setup [target]`                            | Start the visual onboarding wizard and choose an operation interactively.              |
| `init [target]`                             | Install selected bundles; supports `--project-root` and `--project-path`.              |
| `update [version] [target]`                 | Update from the npm registry. The default is `latest`; `--source` uses local Git tags. |
| `migrate [target] --from claude --to codex` | Render the installed bundles with another agent adapter.                               |
| `revert <version> [target]`                 | Restore files from a previous SemVer Git tag without resetting the target repository.  |
| `status [target]`                           | Show the installed release and locally modified or deleted managed files.              |
| `validate [target]`                         | Validate installed skill and agent structures.                                         |

All mutating commands support `--dry-run`. Existing agent folders are extended,
not replaced. Shared JSON configuration is deep-merged, arrays are deduplicated,
and unrelated files remain untouched. Other managed-file edits still produce a
conflict and text diff; use `--force` only when discarding that edit is intentional.

The CLI also merges generated toolkit paths into the project `.gitignore`:
`.claude/`, `.codex/`, `.agents/`, `CLAUDE.md`, `AGENTS.md`, `.ck.json`,
`.mcp.json`, `.forge.lock.json`, and `session-data/`.

## Bundles

`toolkit.manifest.json` is the source manifest. The built-in bundles are:

- `full`: all configuration, skills, commands, agents, hooks, and rules.
- `development`: core configuration, skills, commands, and agents.
- `skills`: skills only.

## Migration

Migrate an existing installation:

```bash
npx @danielle241/forge migrate <project-path> --from claude --to codex --dry-run
npx @danielle241/forge migrate <project-path> --from claude --to codex
```

The setup wizard requires base skills for the source agent before migration. For
Claude this means `.claude/skills/`; for Codex this means `.agents/skills/`.
For now, interactive setup migration only migrates the fixed packaged skills.
Project-specific custom pipelines, commands, agents, and hooks are intentionally
left in place and are not converted automatically yet.

The Claude adapter preserves the `.claude/` layout. The Codex adapter maps:

- Skills and slash commands to `.agents/skills/`.
- Sub-agents to `.codex/agents/*.toml`, including required `name`, `description`, and `developer_instructions` fields, Codex model and reasoning defaults, read-only sandboxing for review/research agents, and display nicknames for parallel spawned agents. Repo scouting is packaged as the `ck-scout` skill/controller; `context-scout` is only its read-only worker.
- Hooks to `.codex/hooks.json` and scripts to `.codex/hooks/`; unsupported Claude tool matchers are removed and commands resolve from the Git root on Unix and Windows.
- `CLAUDE.md` to `AGENTS.md`. If the target project already has an instruction file, the CLI creates a small `@CLAUDE.md` or `@AGENTS.md` bridge instead of duplicating the existing rules.
- Project defaults to `.codex/config.toml`, with hooks enabled, bounded subagent concurrency, and `.mcp.json` servers rendered as Codex `[mcp_servers.*]` tables.
- Runtime state to root-level `session-data/`, with `session-data/.gitignore` keeping generated summaries out of Git.

Items without a direct target mapping are reported as `unsupported` rather than silently dropped.

Migration preserves the previous agent files. For example, Claude to Codex creates `.codex/` and `.agents/` while keeping the existing `.claude/` and `CLAUDE.md` files in place. This lets multiple agents share the same project without destructive cleanup.

## Update And Recovery

```bash
npx @danielle241/forge status <project-path>
npx @danielle241/forge update latest <project-path> --dry-run
npx @danielle241/forge update latest <project-path>
npx @danielle241/forge revert 2.0.0 <project-path>
```

Writes use a filesystem transaction. If a write fails, earlier writes in that operation are restored. The CLI never commits or resets the target repository.

By default, `update` and `revert` download the requested package version from
npm, so they work when the CLI was installed globally or invoked through `npx`.
Repository maintainers can pass `--source <repository>` to test local SemVer tags.

`migrate` preserves files from the previous agent adapter. `update` and `revert`
still prune files removed from a release when the lockfile checksum proves the
file was not locally modified.

---

## Pipelines

Main pipelines cover the full development loop:

```
/ck:brainstorm -> /ck:plan -> /ck:cook -> /ck:ship
                                  \-> /ck:fix
```

| Command           | What it does                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ck:brainstorm`  | Run `ck-scout --repo`, lock exact requirements, compare approaches, and write `brainstorm.md` in a work-item folder.                                            |
| `/ck:scout`       | Read-only evidence gathering. Modes: `--repo`, `--plan`, `--research`, `--diagnose`, `--review`.                                                                |
| `/ck:plan`        | Cross-plan scan -> Design Contract -> research -> phased plan -> red-team -> validate. Modes: `--fast`, `--auto`, `--hard`, `--deep`. Flag: `--tdd`.            |
| `/ck:cook`        | `ck-scout --plan` setup + requirements + plan gate -> implement -> test -> review -> finalize. Modes: `--fast`, `--auto`, `--hard`. Flag: `--tdd`.              |
| `/ck:fix`         | Bug-fix pipeline. MCP sequential-thinking -> `ck-scout --diagnose` -> root-cause fix -> prevention guard -> finalize. Modes: `--fast`, `--auto`, `--hard`.      |
| `/ck:ship`        | Release-readiness gate for merge, deploy, publish, tag, or handoff. Modes: `--dry-run`, `--fast`, `--release`, `--rollback`.                                    |
| `/ck:code-review` | Loads the single `code-review` skill for adversarial PR, commit, pending diff, or codebase review. Modes: `#PR`, commit hash, `--pending`, `codebase parallel`. |
| `/show-off`       | Generate a social-ready HTML presentation → review gate → capture as PNGs.                                                                                      |
| `/docs-fe`        | Generate a FE handoff doc for changed endpoints (contracts, params, errors).                                                                                    |
| `/learn`          | Extract a reusable pattern from the current session and save it as a skill file.                                                                                |
| `/coding-level`   | Set session coding level 0–5 (0=ELI5 → 5=godmode). Persists to `.ck.json`.                                                                                      |

---

## Agents

Sub-agents spawned by the pipelines. Never called directly.

**Planning**

When rendered for Codex, Claude frontmatter models map to Codex model settings:
`haiku -> gpt-5.4-mini/medium`, `sonnet -> gpt-5.5/medium`, and
`opus -> gpt-5.5/xhigh`. Legacy agents named `scout` stay on the mini model.

| Agent           | Role                                                       | Model  |
| --------------- | ---------------------------------------------------------- | ------ |
| `context-scout` | Read-only scoped repo evidence worker for `ck-scout`       | haiku  |
| `researcher`    | Research a feature approach or alternative                 | sonnet |
| `planner`       | Write Design Contract, `plan.md`, context, and phase files | sonnet |
| `plan-reviewer` | Red-team the plan — security, assumptions, failure modes   | sonnet |

**Implementation**

| Agent           | Role                                                                                          | Model  |
| --------------- | --------------------------------------------------------------------------------------------- | ------ |
| `implementer`   | Implement one phase from a phase brief and write an implementation report                     | sonnet |
| `debugger`      | Root-cause diagnosis + fix application                                                        | sonnet |
| `tester`        | Write and run tests, report pass/fail                                                         | sonnet |
| `task-reviewer` | Review one phase against its brief, evidence, and diff                                        | sonnet |
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

| Skill                 | Triggers when                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| `ck-brainstorm`       | Design question, "how should I approach X", pre-planning clarification        |
| `ck-scout`            | Repo, plan, research, diagnosis, or review context gathering before decisions |
| `ck-plan`             | "plan this", "I want to build X", or after a brainstorm report                |
| `ck-cook`             | "cook this", "implement it", passes a plan.md path                            |
| `ck-fix`              | Error message, stack trace, "fix this bug", "tests are failing"               |
| `ck-ship`             | "ship", "merge", "deploy", "publish", release readiness                       |
| `backend-mindset`     | Architecture decisions, API design, testing strategy                          |
| `caveman`             | Terse output mode — "be brief" or context is filling up                       |
| `code-review`         | Reviewing code, receiving feedback, verifying completion                      |
| `documentation-adrs`  | Public docs, setup changes, API docs, ADR-worthy decisions                    |
| `migration-safety`    | Schema/data/API migrations, deprecations, compatibility, rollback             |
| `observability`       | Logs, metrics, traces, alerts, runbooks for production behavior               |
| `problem-solving`     | Stuck on a problem, need creative unblocking                                  |
| `sequential-thinking` | Complex multi-step reasoning                                                  |
| `security-hardening`  | Auth, untrusted input, secrets, PII, webhooks, external integrations          |
| `skill-creator`       | Creating or improving skill files                                             |
| `source-grounding`    | Version-sensitive framework/library/API decisions need authoritative sources  |
| `strategic-compact`   | Managing context window across long sessions                                  |
| `testing-strategy`    | Test strategy, TDD, regression guards, verification evidence                  |

---

## Hooks

Lifecycle hooks wired in `.claude/settings.json`.

| Event                   | Hook                    | Purpose                                                                              |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `SessionStart`          | `session_init.py`       | Load language/coding-level settings, previous session summary, project metadata      |
| `SubagentStart`         | `subagent_init.py`      | Initialize sub-agent context                                                         |
| `Stop` / `SubagentStop` | `session_end.py`        | Extract summary from transcript, persist session file                                |
| `PreCompact`            | `pre_compact.py`        | Log compaction event, reset caveman state, annotate session file                     |
| `UserPromptSubmit`      | `prompt_context.py`     | Inject active workflow context, simplify ship gate, caveman trigger, compact hint    |
| `PreToolUse`            | `tool_guard.py`         | Block sensitive paths and count mutating/tool-heavy calls                            |

### Simplify Thresholds

Configured in `.ck.json` under `hooks.simplifyGate`:

| Key                         | Default | Meaning                                          |
| --------------------------- | ------- | ------------------------------------------------ |
| `enabled`                   | `false` | Set `true` to block matching ship intent         |
| `threshold.totalLoc`        | 400     | Total added and deleted lines in `git diff HEAD` |
| `threshold.fileCount`       | 8       | Changed files in `git diff HEAD`                 |
| `threshold.singleFileLoc`   | 200     | Added lines in the largest changed file          |

The gate only runs for prompts containing ship, merge, PR, deploy, or publish intent.

### Caveman Mode

Configured in `.ck.json` under `hooks.caveman`:

| Key                | Default | Meaning                                              |
| ------------------ | ------- | ---------------------------------------------------- |
| `enabled`          | `true`  | Enable caveman mode globally                         |
| `threshold.orange` | 50      | Tool calls before orange warning emitted             |
| `threshold.red`    | 100     | Tool calls before red warning + auto-trigger caveman |

When red threshold is hit, `prompt_context.py` emits `CAVEMAN_TRIGGERED`; when deactivated, emits `CAVEMAN_RELEASED`.

### Project Defaults

`.ck.json` uses schema v2:

| Section | Purpose |
| --- | --- |
| `profile.codingLevel` | Response style preset, `-1` means default agent style |
| `profile.language` | Conversation and generated artifact language |
| `workspace` | Shared workflow artifact root and date format |
| `retention` | Session and memory cleanup windows |
| `hooks` | Hook thresholds and feature toggles |
| `safety.privacyBlock` | Sensitive file blocking and allow-list |

## Structure

```
.claude/
├── agents/          # sub-agent definitions (.md)
├── commands/        # slash commands (.md)
├── skills/          # skill directories (SKILL.md + references/)
├── hooks/           # lifecycle hook scripts
├── lib/             # shared Python utilities for hooks
└── settings.json    # hook wiring + permissions
CLAUDE.md            # project entry point
session-data/        # generated session summaries, ignored by Git
```

---

## Typical Workflow

```
/ck:brainstorm add user authentication
# -> ck-scout --repo -> clarify -> compare approaches -> plans/YYMMDD-auth/brainstorm.md

/ck:plan --hard plans/YYMMDD-auth/brainstorm.md
# -> Design Contract -> research -> plan files written in the same folder

/ck:cook plans/YYMMDD-auth/plan.md
# -> ck-scout --plan -> implement phase by phase -> test -> review -> commit

/ck:ship --dry-run plans/YYMMDD-auth/plan.md
# -> readiness gates -> rollback notes -> ship verdict

/ck:fix --fast broken login redirect
# -> sequential-thinking -> ck-scout --diagnose -> diagnose + fix -> commit

/ck:code-review --pending
# -> code-review skill -> review uncommitted changes
```
