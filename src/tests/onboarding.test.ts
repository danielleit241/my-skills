import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { hasBaseSkills, inferMigrationSource } from "../core/onboarding.js";
import { tempDir } from "./helpers.js";

test("migration source prefers the lockfile over detected folders", () => {
  assert.equal(inferMigrationSource("claude", ["codex"]), "claude");
  assert.equal(inferMigrationSource("codex", ["claude"]), "codex");
});

test("migration source uses a single detected agent without a lockfile", () => {
  assert.equal(inferMigrationSource(undefined, ["claude"]), "claude");
  assert.equal(inferMigrationSource(undefined, ["codex"]), "codex");
});

test("migration source remains selectable when detection is ambiguous", () => {
  assert.equal(inferMigrationSource(undefined, []), undefined);
  assert.equal(inferMigrationSource(undefined, ["claude", "codex"]), undefined);
});

test("migration requires existing base skills for the source agent", async () => {
  const target = await tempDir("forge-onboarding-");
  assert.equal(await hasBaseSkills(target, "claude"), false);

  await fs.mkdir(path.join(target, ".claude", "skills", "hello"), { recursive: true });
  assert.equal(await hasBaseSkills(target, "claude"), true);
  assert.equal(await hasBaseSkills(target, "codex"), false);

  await fs.mkdir(path.join(target, ".agents", "skills", "hello"), { recursive: true });
  assert.equal(await hasBaseSkills(target, "codex"), true);
});
