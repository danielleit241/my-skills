import fs from "node:fs/promises";
import path from "node:path";
import { getAdapter } from "../adapters/index.js";
import type {
  AgentName,
  ChangePlan,
  RenderResult,
  RenderedFile,
  ToolkitLock,
} from "../types.js";
import { sha256 } from "./hash.js";
import { findLockFile, readLock, serializeLock } from "./lock.js";
import { loadManifest, selectComponents } from "./manifest.js";
import { mergeExistingConfig } from "./merge.js";
import { LOCK_FILE } from "./paths.js";
import { buildChangePlan } from "./planner.js";
import { applyTransaction } from "./transaction.js";

export interface InstallOptions {
  sourceRoot: string;
  targetRoot: string;
  targetAgent: AgentName;
  bundles: string[];
  release: string;
  sourceCommit: string | null;
  dryRun: boolean;
  force: boolean;
  preservePreviousFiles?: boolean;
}

export interface InstallResult {
  plan: ChangePlan;
  render: RenderResult;
  lock: ToolkitLock;
}

export async function installToolkit(options: InstallOptions): Promise<InstallResult> {
  const manifest = await loadManifest(options.sourceRoot);
  const components = selectComponents(manifest, options.bundles);
  const adapter = getAdapter(options.targetAgent);
  const render = await adapter.render({
    sourceRoot: options.sourceRoot,
    targetRoot: options.targetRoot,
    manifest,
    components,
  });
  addSupportFiles(render.files);
  render.files = await mergeExistingConfig(options.targetRoot, render.files);
  assertUniquePaths(render.files);
  const previousLockPath = await findLockFile(options.targetRoot);
  const previous = await readLock(options.targetRoot);
  const lock = makeLock(
    manifest.name,
    manifest.version,
    options.release,
    options.sourceCommit,
    options.targetAgent,
    options.bundles,
    components.map((item) => item.id),
    render.files,
    previous?.installedAt,
  );
  const desiredWithLock = [
    ...render.files,
    { path: LOCK_FILE, content: serializeLock(lock), component: "lockfile" },
  ];
  const plan = await buildChangePlan(
    options.targetRoot,
    desiredWithLock,
    previousWithLock(previous, previousLockPath),
    options.force,
    options.preservePreviousFiles ?? false,
  );
  if (plan.conflicts.length === 0 && !options.dryRun) {
    await fs.mkdir(options.targetRoot, { recursive: true });
    await applyTransaction(options.targetRoot, plan);
  }
  return { plan, render, lock };
}

function addSupportFiles(files: RenderedFile[]): void {
  files.push(
    {
      path: "session-data/.gitignore",
      content: Buffer.from("*\n!.gitignore\n"),
      component: "session-data",
    },
    {
      path: ".gitignore",
      content: Buffer.from(
        [
          "# forge generated files",
          ".claude/",
          "CLAUDE.md",
          "claude.md",
          ".codex/",
          ".agents/",
          "AGENTS.md",
          "agents.md",
          ".ck.json",
          ".mcp.json",
          ".forge.lock.json",
          "session-data/",
          "",
        ].join("\n"),
      ),
      component: "gitignore",
    },
  );
}

function assertUniquePaths(files: RenderedFile[]): void {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path)) throw new Error(`Adapter produced duplicate destination: ${file.path}`);
    seen.add(file.path);
  }
}

export async function inspectStatus(targetRoot: string): Promise<{
  lock: ToolkitLock | null;
  modified: string[];
  deleted: string[];
}> {
  const lock = await readLock(targetRoot);
  if (!lock) return { lock: null, modified: [], deleted: [] };
  const modified: string[] = [];
  const deleted: string[] = [];
  for (const file of lock.files) {
    const absolute = path.join(targetRoot, file.path);
    try {
      const current = await fs.readFile(absolute);
      if (sha256(current) !== file.sha256) modified.push(file.path);
    } catch {
      deleted.push(file.path);
    }
  }
  return { lock, modified, deleted };
}

function makeLock(
  toolkit: string,
  version: string,
  release: string,
  sourceCommit: string | null,
  targetAgent: AgentName,
  bundles: string[],
  components: string[],
  files: RenderedFile[],
  installedAt?: string,
): ToolkitLock {
  return {
    schemaVersion: 1,
    toolkit,
    version,
    release,
    sourceCommit,
    targetAgent,
    bundles,
    components,
    files: files.map((file) => ({
      path: file.path,
      sha256: sha256(file.content),
      component: file.component,
    })),
    installedAt: installedAt ?? new Date().toISOString(),
  };
}

function previousWithLock(previous: ToolkitLock | null, lockPath: string | null): ToolkitLock | null {
  if (!previous) return null;
  const lockContent = serializeLock(previous);
  return {
    ...previous,
    files: [
      ...previous.files,
      { path: lockPath ?? LOCK_FILE, sha256: sha256(lockContent), component: "lockfile" },
    ],
  };
}
