#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs/promises";
import { Command, Option } from "commander";
import semver from "semver";
import { getAdapter } from "./adapters/index.js";
import { installToolkit, inspectStatus } from "./core/engine.js";
import { loadManifest } from "./core/manifest.js";
import { runOnboarding } from "./core/onboarding.js";
import { resolveProjectTarget } from "./core/project.js";
import {
  latestPackageVersion,
  latestTag,
  resolvePackageSource,
  resolveSource,
  type ResolvedSource,
} from "./core/release.js";
import { printMigration, printPlan } from "./core/report.js";
import type { AgentName } from "./types.js";

const program = new Command();
const repositoryRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await fs.readFile(path.join(repositoryRoot, "package.json"), "utf8")) as {
  name: string;
  version: string;
};

program
  .name("forge")
  .description("Install, update, migrate, and revert versioned AI agent toolkits")
  .version(packageJson.version);

program
  .command("setup")
  .description("Start the interactive onboarding wizard")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .action(async (target, options) => {
    const initialTarget = await resolveProjectTarget(target, options);
    const selection = await runOnboarding(initialTarget);
    if (!selection) throw new Error("Interactive setup requires a TTY");
    switch (selection.action) {
      case "init":
        await runInstall(selection.targetRoot, selection.agent!, selection.bundles, repositoryRoot);
        break;
      case "update":
        await runUpdate("latest", selection.targetRoot);
        break;
      case "migrate":
        await runMigrate(selection.targetRoot, selection.from!, selection.to!, selection.bundles, repositoryRoot);
        break;
      case "status":
        await printStatus(selection.targetRoot);
        break;
      case "validate":
        await validateTarget(selection.targetRoot);
        break;
    }
  });

program
  .command("init")
  .description("Install the toolkit into a project")
  .argument("[target]", "Target project (legacy shorthand for --project-root)")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .addOption(agentOption())
  .addOption(bundleOption())
  .addOption(sourceOption("Toolkit source"))
  .addOption(dryRunOption())
  .addOption(forceOption())
  .action(async (target, options) => {
    const targetRoot = await resolveProjectTarget(target, options);
    await runInstall(
      targetRoot,
      options.agent,
      options.bundle,
      options.source ? path.resolve(options.source) : repositoryRoot,
      Boolean(options.dryRun),
      Boolean(options.force),
    );
  });

program
  .command("update")
  .description("Update an installed toolkit")
  .argument("[version]", "SemVer release, or latest", "latest")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .addOption(sourceOption("Local toolkit Git repository instead of npm"))
  .addOption(dryRunOption())
  .addOption(forceOption())
  .action(async (version, target, options) => {
    const targetRoot = await resolveProjectTarget(target, options);
    await runUpdate(
      version,
      targetRoot,
      options.source ? path.resolve(options.source) : undefined,
      Boolean(options.dryRun),
      Boolean(options.force),
    );
  });

program
  .command("revert")
  .description("Restore an installed toolkit to a SemVer release")
  .argument("<version>", "SemVer release")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .addOption(sourceOption("Local toolkit Git repository instead of npm"))
  .addOption(dryRunOption())
  .addOption(forceOption())
  .action(async (version, target, options) => {
    if (!semver.valid(version.replace(/^v/, ""))) throw new Error(`Invalid version: ${version}`);
    const targetRoot = await resolveProjectTarget(target, options);
    const status = await inspectStatus(targetRoot);
    if (!status.lock) throw new Error("Toolkit is not initialized");
    const source = options.source
      ? await resolveSource(path.resolve(options.source), version)
      : await resolvePackageSource(packageJson.name, version);
    try {
      const result = await installToolkit({
        sourceRoot: source.root,
        targetRoot,
        targetAgent: status.lock.targetAgent,
        bundles: status.lock.bundles,
        release: source.release,
        sourceCommit: source.commit,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
      });
      printPlan(result.plan, Boolean(options.dryRun));
      failOnConflicts(result.plan.conflicts.length);
    } finally {
      await source.cleanup();
    }
  });

program
  .command("migrate")
  .description("Migrate an installed toolkit between agent formats")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .requiredOption("--from <agent>", "Source agent", parseAgent)
  .requiredOption("--to <agent>", "Target agent", parseAgent)
  .addOption(sourceOption("Toolkit source"))
  .addOption(bundleOption("Bundles when no lockfile exists"))
  .addOption(dryRunOption())
  .addOption(forceOption())
  .action(async (target, options) => {
    const targetRoot = await resolveProjectTarget(target, options);
    await runMigrate(
      targetRoot,
      options.from,
      options.to,
      options.bundle,
      options.source ? path.resolve(options.source) : repositoryRoot,
      Boolean(options.dryRun),
      Boolean(options.force),
    );
  });

program
  .command("status")
  .description("Show installed version and local drift")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .addOption(sourceOption("Local toolkit Git repository"))
  .action(async (target, options) => {
    const targetRoot = await resolveProjectTarget(target, options);
    await printStatus(targetRoot, options.source ? path.resolve(options.source) : undefined);
  });

program
  .command("validate")
  .description("Validate a toolkit source or installed project")
  .argument("[target]", "Target project")
  .addOption(projectPathOption())
  .addOption(projectRootOption())
  .addOption(sourceOption("Validate source manifest instead"))
  .addOption(agentOption(false))
  .action(async (target, options) => {
    if (options.source) {
      const manifest = await loadManifest(path.resolve(options.source));
      console.log(`Valid manifest: ${manifest.name}@${manifest.version}`);
      return;
    }
    const targetRoot = await resolveProjectTarget(target, options);
    await validateTarget(targetRoot, options.agent);
  });

if (process.argv.length === 2) {
  process.argv.push("setup");
}

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function agentOption(required = true): Option {
  const option = new Option("-a, --agent <agent>", "Target agent").argParser(parseAgent);
  return required ? option.makeOptionMandatory() : option;
}

function projectPathOption(): Option {
  return new Option(
    "--project-path <path>",
    "File or directory inside a project; detect its root automatically",
  );
}

function projectRootOption(): Option {
  return new Option("--project-root", "Treat the current working directory as the project root");
}

function sourceOption(description: string): Option {
  return new Option("--source <path>", description);
}

function bundleOption(description = "Bundles to install"): Option {
  return new Option("-b, --bundle <name...>", description).default(["full"]);
}

function dryRunOption(): Option {
  return new Option("--dry-run", "Preview without writing");
}

function forceOption(): Option {
  return new Option("--force", "Overwrite local conflicts");
}

function parseAgent(value: string): AgentName {
  if (value !== "claude" && value !== "codex") throw new Error(`Unsupported agent: ${value}`);
  return value;
}

function failOnConflicts(count: number): void {
  if (count > 0) process.exitCode = 2;
}

async function runInstall(
  targetRoot: string,
  agent: AgentName,
  bundles: string[],
  sourceRoot: string,
  dryRun = false,
  force = false,
): Promise<void> {
  const source = await resolveSource(sourceRoot, "current");
  await applyInstall(source, targetRoot, agent, bundles, dryRun, force, true);
}

async function runUpdate(
  version: string,
  targetRoot: string,
  localSource?: string,
  dryRun = false,
  force = false,
): Promise<void> {
  const status = await inspectStatus(targetRoot);
  if (!status.lock) throw new Error("Toolkit is not initialized");
  let source: ResolvedSource;
  if (localSource) {
    const resolvedVersion = version === "latest" ? await latestTag(localSource) : version;
    if (!resolvedVersion) throw new Error("No SemVer release tags found");
    source = await resolveSource(localSource, resolvedVersion);
  } else {
    source = await resolvePackageSource(packageJson.name, version);
  }
  await applyInstall(source, targetRoot, status.lock.targetAgent, status.lock.bundles, dryRun, force);
}

async function runMigrate(
  targetRoot: string,
  from: AgentName,
  to: AgentName,
  bundles: string[],
  sourceRoot: string,
  dryRun = false,
  force = false,
): Promise<void> {
  const status = await inspectStatus(targetRoot);
  if (status.lock && status.lock.targetAgent !== from) {
    throw new Error(`Lockfile target is ${status.lock.targetAgent}, not ${from}`);
  }
  const source = await resolveSource(sourceRoot, "current");
  await applyInstall(source, targetRoot, to, status.lock?.bundles ?? bundles, dryRun, force, true, true);
}

async function applyInstall(
  source: ResolvedSource,
  targetRoot: string,
  agent: AgentName,
  bundles: string[],
  dryRun: boolean,
  force: boolean,
  migrationReport = false,
  preservePreviousFiles = false,
): Promise<void> {
  try {
    const result = await installToolkit({
      sourceRoot: source.root,
      targetRoot,
      targetAgent: agent,
      bundles,
      release: source.release,
      sourceCommit: source.commit,
      dryRun,
      force,
      preservePreviousFiles,
    });
    printPlan(result.plan, dryRun);
    if (migrationReport) printMigration(result.render);
    failOnConflicts(result.plan.conflicts.length);
  } finally {
    await source.cleanup();
  }
}

async function printStatus(targetRoot: string, localSource?: string): Promise<void> {
  const status = await inspectStatus(targetRoot);
  if (!status.lock) {
    console.log("Toolkit is not initialized.");
    return;
  }
  const latest = localSource
    ? await latestTag(localSource)
    : `v${await latestPackageVersion(packageJson.name)}`;
  console.log(`Toolkit: ${status.lock.toolkit}`);
  console.log(`Version: ${status.lock.version} (${status.lock.release})`);
  console.log(`Agent: ${status.lock.targetAgent}`);
  console.log(`Bundles: ${status.lock.bundles.join(", ")}`);
  console.log(`Modified: ${status.modified.length}`);
  console.log(`Deleted: ${status.deleted.length}`);
  console.log(`Latest release: ${latest ?? "none"}`);
  for (const file of status.modified) console.log(`  modified ${file}`);
  for (const file of status.deleted) console.log(`  deleted ${file}`);
}

async function validateTarget(targetRoot: string, requestedAgent?: AgentName): Promise<void> {
  const status = await inspectStatus(targetRoot);
  const agent = requestedAgent ?? status.lock?.targetAgent;
  if (!agent) throw new Error("Specify --agent or initialize the toolkit first");
  const errors = await getAdapter(agent).validate(targetRoot);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(`Valid ${agent} toolkit`);
}
