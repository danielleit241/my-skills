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

| Command        | What it does                                                                      |
| -------------- | --------------------------------------------------------------------------------- |
| `/plan`        | Research → write plan files → red-team → validate. Auto-detects complexity.       |
| `/cook`        | Implement a phase from a plan file. Scout → implement → test → review → finalize. |
| `/fix`         | Bug-fix pipeline. Scout → diagnose + fix → review → finalize.                     |
| `/code-review` | Review local uncommitted changes or a GitHub PR by number/URL.                    |
| `/docs-fe`     | Generate a FE handoff doc for changed endpoints (contracts, params, errors).      |
| `/learn`       | Extract a reusable pattern from the current session and save it as a skill file.  |

---

## Agents

Sub-agents spawned by the pipelines. Never called directly.

**Planning**

| Agent             | Role                                                     | Model  |
| ----------------- | -------------------------------------------------------- | ------ |
| `plan-researcher` | Research a feature approach (2 run in parallel)          | sonnet |
| `planner`         | Write `plan.md` + phase files from research              | sonnet |
| `plan-reviewer`   | Red-team the plan — security, assumptions, failure modes | sonnet |

**Implementation**

| Agent           | Role                                                         | Model  |
| --------------- | ------------------------------------------------------------ | ------ |
| `scout`         | Codebase reconnaissance — maps files, patterns, dependencies | haiku  |
| `debugger`      | Root-cause diagnosis + fix application                       | sonnet |
| `tester`        | Write and run tests, report pass/fail                        | sonnet |
| `code-reviewer` | Code review against project conventions                      | sonnet |

**Finalize (shared by /cook and /fix)**

| Agent             | Role                                          | Model |
| ----------------- | --------------------------------------------- | ----- |
| `project-manager` | Sync phase checkboxes and plan status         | haiku |
| `docs-manager`    | Update affected docs minimally                | haiku |
| `git-manager`     | Stage files, conventional commit, ask to push | haiku |

---

## Skills

Behavioral guidance that loads automatically when relevant.

| Skill                    | Triggers when                                            |
| ------------------------ | -------------------------------------------------------- |
| `backend-mindset`        | Architecture decisions, API design, testing strategy (language-agnostic) |
| `dotnet`                 | Writing C#, ASP.NET Core, EF Core, MassTransit, xUnit   |
| `code-review`            | Reviewing code, receiving feedback, verifying completion |
| `continuous-learning-v2` | Observing sessions, creating instincts                   |
| `frontend-slides`        | Building HTML presentations or converting PowerPoint files |
| `mermaidjs-v11`          | Creating diagrams and visualizations                     |
| `problem-solving`        | Stuck on a problem, need creative unblocking             |
| `sequential-thinking`    | Complex multi-step reasoning                             |
| `skill-creator`          | Creating or improving skill files                        |
| `strategic-compact`      | Managing context window across long sessions             |

---

## Hooks

Lifecycle hooks wired in `.claude/settings.json`.

| Event              | Hook                 | Purpose                                               |
| ------------------ | -------------------- | ----------------------------------------------------- |
| `SessionStart`     | `session-start.py`   | Load previous session summary + active instincts      |
| `Stop`             | `session-end.py`     | Extract summary from transcript, persist session file |
| `PreCompact`       | `pre-compact.py`     | Log compaction event, annotate session file           |
| `UserPromptSubmit` | `plan-context.py`    | Inject active plan context into each prompt           |
| `PreToolUse`       | `observe.py pre`     | Record tool start for continuous learning             |
| `PreToolUse`       | `suggest_compact.py` | Count tool calls, suggest `/compact` at threshold     |
| `PostToolUse`      | `observe.py post`    | Record tool completion for continuous learning        |

Hooks fire on `Write \| Edit \| Bash \| Agent` — read-only lookups (Read, Glob, Grep) are excluded to reduce overhead.

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

Then install individual plugins:

```
/plugin install frontend-slides@my-skills
/plugin install commands-bundle@my-skills
/plugin install agents-bundle@my-skills
```

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
