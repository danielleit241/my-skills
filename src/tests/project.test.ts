import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadManifest } from "../core/manifest.js";
import { findProjectRoot, resolveProjectTarget } from "../core/project.js";
import { tempDir } from "./helpers.js";

test("project path discovers the nearest project root", async () => {
  const root = await tempDir("forge-project-");
  const nested = path.join(root, "src", "features");
  await fs.mkdir(nested, { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), "{}");

  assert.equal(await findProjectRoot(nested), root);
  assert.equal(await resolveProjectTarget(undefined, { projectPath: nested }), root);
});

test("project path accepts a file inside the project", async () => {
  const root = await tempDir("forge-project-");
  const file = path.join(root, "src", "index.ts");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(path.join(root, ".git"), "gitdir: elsewhere\n");
  await fs.writeFile(file, "");

  assert.equal(await findProjectRoot(file), root);
});

test("project root uses the current working directory", async () => {
  assert.equal(await resolveProjectTarget(undefined, { projectRoot: true }), process.cwd());
});

test("target selectors are mutually exclusive", async () => {
  await assert.rejects(
    resolveProjectTarget(".", { projectRoot: true }),
    /Use only one target selector/,
  );
});

test("manifest loading rejects source paths missing from the package", async () => {
  const root = await tempDir("forge-manifest-");
  await fs.writeFile(path.join(root, "toolkit.manifest.json"), JSON.stringify({
    $schemaVersion: 1,
    name: "fixture",
    version: "1.0.0",
    sourceAgent: "claude",
    supportedAgents: ["claude"],
    components: [
      { id: "rules", type: "rule", paths: [".claude/missing"], adapters: ["claude"] },
    ],
    bundles: { full: { description: "Full", components: ["rules"] } },
  }));

  await assert.rejects(loadManifest(root), /Manifest path does not exist: \.claude\/missing/);
});
