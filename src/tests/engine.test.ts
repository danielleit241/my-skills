import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { installToolkit, inspectStatus } from "../core/engine.js";
import { tempDir, fixtureManifest, writeFixture } from "./helpers.js";

test("init is idempotent and records checksums", async () => {
  const source = await tempDir("my-skills-source-");
  const target = await tempDir("my-skills-target-");
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

test("update stops when a managed file was edited", async () => {
  const source = await tempDir("my-skills-source-");
  const target = await tempDir("my-skills-target-");
  await writeFixture(source, fixtureManifest);
  await install(source, target, "claude");
  await fs.appendFile(path.join(target, ".claude", "skills", "hello", "SKILL.md"), "\nlocal edit\n");
  await fs.appendFile(path.join(source, ".claude", "skills", "hello", "SKILL.md"), "\nupstream edit\n");

  const result = await install(source, target, "claude");
  assert.equal(result.plan.conflicts[0]?.reason, "modified");
});

test("removal preserves a locally modified managed file", async () => {
  const source = await tempDir("my-skills-source-");
  const target = await tempDir("my-skills-target-");
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
  const source = await tempDir("my-skills-source-");
  const target = await tempDir("my-skills-target-");
  await writeFixture(source, fixtureManifest);
  const result = await install(source, target, "codex");

  assert.equal(result.plan.conflicts.length, 0);
  await Promise.all([
    fs.access(path.join(target, ".agents", "skills", "hello", "SKILL.md")),
    fs.access(path.join(target, ".agents", "skills", "ck-plan", "SKILL.md")),
    fs.access(path.join(target, ".codex", "agents", "reviewer.toml")),
    fs.access(path.join(target, ".codex", "hooks.json")),
    fs.access(path.join(target, "AGENTS.md")),
  ]);
  const hooks = await fs.readFile(path.join(target, ".codex", "hooks.json"), "utf8");
  assert.match(hooks, /git rev-parse --show-toplevel/);
  assert.match(hooks, /commandWindows/);
  assert.doesNotMatch(hooks, /"async"/);
  assert.doesNotMatch(hooks, /"matcher": "\*"/);
  const agent = await fs.readFile(path.join(target, ".codex", "agents", "reviewer.toml"), "utf8");
  assert.match(agent, /model = "gpt-5\.5"/);
  const config = await fs.readFile(path.join(target, ".codex", "config.toml"), "utf8");
  assert.match(config, /\[agents\]\nmax_threads = 6\nmax_depth = 1/);
});

function install(sourceRoot: string, targetRoot: string, targetAgent: "claude" | "codex") {
  return installToolkit({
    sourceRoot,
    targetRoot,
    targetAgent,
    bundles: ["full"],
    release: "current",
    sourceCommit: null,
    dryRun: false,
    force: false,
  });
}
