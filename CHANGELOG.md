# Changelog

## 2.1.2

- Add a colored, keyboard-driven onboarding wizard with selectable actions, agents, and bundles.
- Add `--project-root` for the current working directory and `--project-path` for automatic root discovery.
- Remove the nonexistent `.claude/contexts` package path that caused `ENOENT` during Claude installation.
- Make the test command portable across Windows and Linux CI runners.

## 2.1.1

- Correct the npm package scope to `@danielle241/my-skills`.

## 2.1.0

- Add interactive onboarding through `my-skills setup` and the default no-command flow.
- Add npm-registry based `update` and `revert` support for globally installed or `npx` usage.
- Merge existing `.claude` and `.codex` directory contents without deleting unrelated files.
- Deep-merge `.claude/settings.json`, `.codex/hooks.json`, and `.ck.json`.
- Read the CLI version from `package.json` to keep release metadata aligned.

## 2.0.1

- Align Codex migration output with current hooks, agent, and configuration behavior.

## 2.0.0

- Introduce the versioned toolkit CLI, lockfile, adapters, migrations, and transactional updates.
