# Changelog

## 2.1.7

- Rename the package, CLI, toolkit manifest, generated lockfile, and docs from `my-skills` to Forge (`@danielle241/forge`, `forge`, `.forge.lock.json`), with legacy `.my-skills.lock.json` migration support.
- Redesign the CK skill set around the main workflow `brainstorm -> plan -> cook -> ship / fix`, with softer skill guidance instead of hard workflow gates.
- Remove `ck-spec` and `ck-code-review`; keep Design Contract inside `ck-plan` and use the single `code-review` skill.
- Add `ck-scout` as the skill-level scouting controller, add `ck-ship`, and add supporting skills for source grounding, migration safety, observability, security hardening, documentation/ADRs, and testing strategy.
- Simplify CK workflow modes to `plan: fast/auto/hard/deep`, `cook: fast/auto/hard`, `fix: fast/auto/hard`, with `--tdd` kept for plan/cook.
- Add basic skill eval coverage for the redesigned skills and update validation to catch retired legacy surfaces.
- Simplify CLI command wiring and apply `--project-path` / `--project-root` target resolution consistently across update, revert, migrate, status, and validate.
- Map Claude Sonnet agents to `gpt-5.5` with medium reasoning, and Opus agents to `gpt-5.5` with Codex `xhigh` reasoning; legacy `scout` agents remain on the mini model.
- Render packaged `.mcp.json` servers into Codex `.codex/config.toml` `[mcp_servers.*]` tables during migration or Codex install.
- Force UTF-8 stdin/stdout handling in hook entrypoints so Codex session-data preserves raw Unicode prompts on Windows.
- Include `.mcp.json` in packaged toolkit metadata and generated ignore entries.

## 2.1.5

- Render Codex custom agents according to the current subagents guidance: read-only sandboxing for exploration/review agents, display nicknames for spawned agent threads, and a Codex subagent contract that keeps delegated work scoped and summary-oriented.
- Fix Windows npm subprocess handling used by `status`, `update`, and `revert` so global installs do not fail with `spawn EINVAL`.
- Require existing source-agent base skills before interactive migration and keep setup migration scoped to fixed packaged skills for now.

## 2.1.4

- Preserve files from the previous agent adapter during `migrate` instead of deleting the old `.claude`, `.codex`, `.agents`, `CLAUDE.md`, or `AGENTS.md` outputs.
- Merge generated toolkit paths into the project `.gitignore`, including agent folders, instruction files, lockfiles, `.ck.json`, and `session-data/`.
- Add `session-data/.gitignore` automatically and move runtime session state to root-level `session-data/` shared by supported agents.
- Improve Claude/Codex instruction migration by creating `@CLAUDE.md` or `@AGENTS.md` reference bridge files when project instructions already exist.
- Capture Codex user prompts through the migrated hook pipeline so session summaries include user messages, not only changed files.
- Align Codex sub-agent model rendering with Claude frontmatter and force the `scout` agent to `gpt-5.4-mini`.
- Replace the packaged `CLAUDE.md` template with concise behavioral guidelines focused on assumptions, simplicity, surgical edits, and verification.
- Update CK workflow skills, add the `ck-spec` skill, and include the upstream `agent-skills` reference as a tracked submodule for future migration work.

## 2.1.3

- Infer migration source from the lockfile so onboarding cannot select an agent that contradicts the installed toolkit.

## 2.1.2

- Add a colored, keyboard-driven onboarding wizard with selectable actions, agents, and bundles.
- Add `--project-root` for the current working directory and `--project-path` for automatic root discovery.
- Remove the nonexistent `.claude/contexts` package path that caused `ENOENT` during Claude installation.
- Make the test command portable across Windows and Linux CI runners.

## 2.1.1

- Correct the npm package scope to `@danielle241/forge`.

## 2.1.0

- Add interactive onboarding through `forge setup` and the default no-command flow.
- Add npm-registry based `update` and `revert` support for globally installed or `npx` usage.
- Merge existing `.claude` and `.codex` directory contents without deleting unrelated files.
- Deep-merge `.claude/settings.json`, `.codex/hooks.json`, and `.ck.json`.
- Read the CLI version from `package.json` to keep release metadata aligned.

## 2.0.1

- Align Codex migration output with current hooks, agent, and configuration behavior.

## 2.0.0

- Introduce the versioned toolkit CLI, lockfile, adapters, migrations, and transactional updates.
