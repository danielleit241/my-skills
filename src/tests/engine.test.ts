import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { installToolkit, inspectStatus } from "../core/engine.js";
import { tempDir, fixtureManifest, writeFixture } from "./helpers.js";

test("init is idempotent and records checksums", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);

  const first = await install(source, target, "claude");
  assert.equal(first.plan.conflicts.length, 0);
  assert.ok(first.plan.writes.length > 0);

  const second = await install(source, target, "claude");
  assert.equal(second.plan.writes.length, 0);
  assert.equal(second.plan.conflicts.length, 0);
  const status = await inspectStatus(target);
  assert.equal(status.modified.length, 0);
  assert.equal(status.deleted.length, 0);
});

test("update migrates legacy my-skills lockfile to forge lockfile", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");
  await fs.rename(
    path.join(target, ".forge.lock.json"),
    path.join(target, ".my-skills.lock.json"),
  );

  const result = await install(source, target, "claude");

  assert.equal(result.plan.conflicts.length, 0);
  await fs.access(path.join(target, ".forge.lock.json"));
  await assert.rejects(fs.access(path.join(target, ".my-skills.lock.json")));
});

test("update stops when a managed file was edited", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");
  await fs.appendFile(path.join(target, ".claude", "skills", "hello", "SKILL.md"), "\nlocal edit\n");
  await fs.appendFile(path.join(source, ".claude", "skills", "hello", "SKILL.md"), "\nupstream edit\n");

  const result = await install(source, target, "claude");
  assert.equal(result.plan.conflicts[0]?.reason, "modified");
});

test("removal preserves a locally modified managed file", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");
  const installed = path.join(target, ".claude", "hooks", "stop.py");
  await fs.appendFile(installed, "# local\n");
  await fs.rm(path.join(source, ".claude", "hooks", "stop.py"));

  const result = await install(source, target, "claude");
  assert.ok(result.plan.conflicts.some((item) => item.path.endsWith("stop.py")));
  assert.equal(await fs.readFile(installed, "utf8").then((value) => value.includes("# local")), true);
});

test("Codex adapter converts skills, commands, agents, hooks, and instructions", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  const result = await install(source, target, "codex");

  assert.equal(result.plan.conflicts.length, 0);
  await Promise.all([
    fs.access(path.join(target, ".agents", "skills", "hello", "SKILL.md")),
    fs.access(path.join(target, ".agents", "skills", "ck-plan", "SKILL.md")),
    fs.access(path.join(target, ".codex", "agents", "reviewer.toml")),
    fs.access(path.join(target, ".codex", "hooks.json")),
    fs.access(path.join(target, "AGENTS.md")),
    fs.access(path.join(target, "session-data", ".gitignore")),
  ]);
  const hooks = await fs.readFile(path.join(target, ".codex", "hooks.json"), "utf8");
  assert.match(hooks, /git rev-parse --show-toplevel/);
  assert.match(hooks, /commandWindows/);
  assert.match(hooks, /session_state\.py/);
  assert.doesNotMatch(hooks, /"async"/);
  assert.doesNotMatch(hooks, /"matcher": "\*"/);
  const agent = await fs.readFile(path.join(target, ".codex", "agents", "reviewer.toml"), "utf8");
  assert.match(agent, /model = "gpt-5\.5"/);
  assert.match(agent, /model_reasoning_effort = "medium"/);
  assert.match(agent, /sandbox_mode = "read-only"/);
  assert.match(agent, /nickname_candidates = \["Reviewer Alpha", "Reviewer Delta", "Reviewer Echo"\]/);
  assert.match(agent, /Do not spawn child agents unless the parent explicitly asks/);
  const config = await fs.readFile(path.join(target, ".codex", "config.toml"), "utf8");
  assert.match(config, /\[agents\]\nmax_threads = 6\nmax_depth = 1/);
  assert.match(config, /\[mcp_servers\.sequential-thinking\]/);
  assert.match(config, /command = "npx"/);
  assert.match(config, /args = \["-y", "@modelcontextprotocol\/server-sequential-thinking"\]/);
  assert.doesNotMatch(config, /description =/);
});

test("install creates session-data gitignore and merges project gitignore", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.writeFile(path.join(target, ".gitignore"), "dist/\n");

  const result = await install(source, target, "claude");

  assert.equal(result.plan.conflicts.length, 0);
  assert.equal(await fs.readFile(path.join(target, "session-data", ".gitignore"), "utf8"), "*\n!.gitignore\n");
  const gitignore = await fs.readFile(path.join(target, ".gitignore"), "utf8");
  assert.match(gitignore, /^dist\/$/m);
  assert.match(gitignore, /^\.claude\/$/m);
  assert.match(gitignore, /^\.forge\.lock\.json$/m);
  assert.match(gitignore, /^session-data\/$/m);
});

test("migration bridges existing project instruction files", async () => {
  const source = await tempDir("forge-source-");
  const codexTarget = await tempDir("forge-target-");
  const claudeTarget = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.writeFile(path.join(codexTarget, "CLAUDE.md"), "# Existing Claude rules\n");
  await fs.writeFile(path.join(claudeTarget, "AGENTS.md"), "# Existing Codex rules\n");

  const codexResult = await install(source, codexTarget, "codex");
  const claudeResult = await install(source, claudeTarget, "claude");

  assert.equal(codexResult.plan.conflicts.length, 0);
  assert.equal(claudeResult.plan.conflicts.length, 0);
  assert.match(await fs.readFile(path.join(codexTarget, "AGENTS.md"), "utf8"), /@CLAUDE\.md/);
  assert.match(await fs.readFile(path.join(claudeTarget, "CLAUDE.md"), "utf8"), /@AGENTS\.md/);
});

test("Codex adapter maps haiku agents to the cheap mini model", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.writeFile(
    path.join(source, ".claude", "agents", "bookkeeper.md"),
    "---\nname: bookkeeper\ndescription: Track state.\nmodel: haiku\n---\n\nTrack state quickly.\n",
  );

  const result = await install(source, target, "codex");

  assert.equal(result.plan.conflicts.length, 0);
  const bookkeeper = await fs.readFile(path.join(target, ".codex", "agents", "bookkeeper.toml"), "utf8");
  assert.match(bookkeeper, /model = "gpt-5\.4-mini"/);
  assert.match(bookkeeper, /sandbox_mode = "read-only"/);
});

test("Codex adapter keeps legacy scout agents on the mini model", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.writeFile(
    path.join(source, ".claude", "agents", "scout.md"),
    "---\nname: scout\ndescription: Gather evidence.\nmodel: sonnet\n---\n\nScout quickly.\n",
  );

  const result = await install(source, target, "codex");

  assert.equal(result.plan.conflicts.length, 0);
  const scout = await fs.readFile(path.join(target, ".codex", "agents", "scout.toml"), "utf8");
  assert.match(scout, /model = "gpt-5\.4-mini"/);
  assert.match(scout, /model_reasoning_effort = "medium"/);
});

test("Codex adapter maps opus agents to extra-high reasoning", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.writeFile(
    path.join(source, ".claude", "agents", "architect.md"),
    "---\nname: architect\ndescription: Review architecture.\nmodel: opus\n---\n\nThink deeply.\n",
  );

  const result = await install(source, target, "codex");

  assert.equal(result.plan.conflicts.length, 0);
  const architect = await fs.readFile(path.join(target, ".codex", "agents", "architect.toml"), "utf8");
  assert.match(architect, /model = "gpt-5\.5"/);
  assert.match(architect, /model_reasoning_effort = "xhigh"/);
});

test("migration changes an installed Claude toolkit to Codex", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");

  const result = await install(source, target, "codex", { preservePreviousFiles: true });

  assert.equal(result.plan.conflicts.length, 0);
  assert.equal(result.lock.targetAgent, "codex");
  assert.equal(result.plan.deletes.length, 0);
  await fs.access(path.join(target, ".codex", "config.toml"));
  await fs.access(path.join(target, ".agents", "skills", "hello", "SKILL.md"));
  await fs.access(path.join(target, ".claude", "skills", "hello", "SKILL.md"));
  await fs.access(path.join(target, "CLAUDE.md"));
  const gitignore = await fs.readFile(path.join(target, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.claude\/$/m);
  assert.match(gitignore, /^\.codex\/$/m);
  assert.match(gitignore, /^\.agents\/$/m);
  const status = await inspectStatus(target);
  assert.equal(status.lock?.targetAgent, "codex");
});

test("init merges existing agent folders and structured configuration", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await fs.mkdir(path.join(target, ".claude", "skills", "local"), { recursive: true });
  await fs.writeFile(path.join(target, ".claude", "skills", "local", "SKILL.md"), "local skill\n");
  await fs.mkdir(path.join(target, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(target, ".claude", "settings.json"),
    JSON.stringify({ permissions: { allow: ["Read"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "local" }] }] } }),
  );

  const result = await install(source, target, "claude");

  assert.equal(result.plan.conflicts.length, 0);
  assert.equal(
    await fs.readFile(path.join(target, ".claude", "skills", "local", "SKILL.md"), "utf8"),
    "local skill\n",
  );
  const settings = JSON.parse(
    await fs.readFile(path.join(target, ".claude", "settings.json"), "utf8"),
  ) as { permissions: { allow: string[] }; hooks: { Stop: unknown[] } };
  assert.deepEqual(settings.permissions.allow, ["Read"]);
  assert.equal(settings.hooks.Stop.length, 2);
});

test("update preserves local keys in mergeable configuration", async () => {
  const source = await tempDir("forge-source-");
  const target = await tempDir("forge-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");
  const settingsPath = path.join(target, ".claude", "settings.json");
  const settings = JSON.parse(await fs.readFile(settingsPath, "utf8")) as Record<string, unknown>;
  settings.localOnly = true;
  await fs.writeFile(settingsPath, JSON.stringify(settings));

  const result = await install(source, target, "claude");

  assert.equal(result.plan.conflicts.length, 0);
  const updated = JSON.parse(await fs.readFile(settingsPath, "utf8")) as Record<string, unknown>;
  assert.equal(updated.localOnly, true);
});

function install(
  sourceRoot: string,
  targetRoot: string,
  targetAgent: "claude" | "codex",
  options: { preservePreviousFiles?: boolean } = {},
) {
  return installToolkit({
    sourceRoot,
    targetRoot,
    targetAgent,
    bundles: ["full"],
    release: "current",
    sourceCommit: null,
    dryRun: false,
    force: false,
    preservePreviousFiles: options.preservePreviousFiles,
  });
}
