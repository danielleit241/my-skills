#!/usr/bin/env node
import path from "node:path";
import { Command, Option } from "commander";
import semver from "semver";
import { getAdapter } from "./adapters/index.js";
import { installToolkit, inspectStatus } from "./core/engine.js";
import { loadManifest } from "./core/manifest.js";
import { latestTag, resolveSource } from "./core/release.js";
import { printMigration, printPlan } from "./core/report.js";
import type { AgentName } from "./types.js";

const program = new Command();
const repositoryRoot = path.resolve(import.meta.dirname, "..");

program
  .name("my-skills")
  .description("Install, update, migrate, and revert versioned AI agent toolkits")
  .version("2.0.0");

program
  .command("init")
  .description("Install the toolkit into a project")
  .argument("[target]", "Target project", ".")
  .addOption(agentOption())
  .option("-b, --bundle <name...>", "Bundles to install", ["full"])
  .option("--source <path>", "Toolkit source", repositoryRoot)
  .option("--dry-run", "Preview without writing")
  .option("--force", "Overwrite local conflicts")
  .action(async (target, options) => {
    const source = await resolveSource(path.resolve(options.source), "current");
    try {
      const result = await installToolkit({
        sourceRoot: source.root,
        targetRoot: path.resolve(target),
        targetAgent: options.agent,
        bundles: options.bundle,
        release: source.release,
        sourceCommit: source.commit,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
      });
      printPlan(result.plan, Boolean(options.dryRun));
      printMigration(result.render);
      failOnConflicts(result.plan.conflicts.length);
    } finally {
      await source.cleanup();
    }
  });

program
  .command("update")
  .description("Update an installed toolkit")
  .argument("[version]", "SemVer release, or latest", "latest")
  .argument("[target]", "Target project", ".")
  .option("--source <path>", "Toolkit Git repository", repositoryRoot)
  .option("--dry-run", "Preview without writing")
  .option("--force", "Overwrite local conflicts")
  .action(async (version, target, options) => {
    const targetRoot = path.resolve(target);
    const status = await inspectStatus(targetRoot);
    if (!status.lock) throw new Error("Toolkit is not initialized");
    const resolvedVersion = version === "latest" ? await latestTag(path.resolve(options.source)) : version;
    if (!resolvedVersion) throw new Error("No SemVer release tags found");
    const source = await resolveSource(path.resolve(options.source), resolvedVersion);
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
  .command("revert")
  .description("Restore an installed toolkit to a SemVer release")
  .argument("<version>", "SemVer release")
  .argument("[target]", "Target project", ".")
  .option("--source <path>", "Toolkit Git repository", repositoryRoot)
  .option("--dry-run", "Preview without writing")
  .option("--force", "Overwrite local conflicts")
  .action(async (version, target, options) => {
    if (!semver.valid(version.replace(/^v/, ""))) throw new Error(`Invalid version: ${version}`);
    const targetRoot = path.resolve(target);
    const status = await inspectStatus(targetRoot);
    if (!status.lock) throw new Error("Toolkit is not initialized");
    const source = await resolveSource(path.resolve(options.source), version);
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
  .argument("[target]", "Target project", ".")
  .requiredOption("--from <agent>", "Source agent", parseAgent)
  .requiredOption("--to <agent>", "Target agent", parseAgent)
  .option("--source <path>", "Toolkit source", repositoryRoot)
  .option("-b, --bundle <name...>", "Bundles when no lockfile exists", ["full"])
  .option("--dry-run", "Preview without writing")
  .option("--force", "Overwrite local conflicts")
  .action(async (target, options) => {
    const targetRoot = path.resolve(target);
    const status = await inspectStatus(targetRoot);
    if (status.lock && status.lock.targetAgent !== options.from) {
      throw new Error(`Lockfile target is ${status.lock.targetAgent}, not ${options.from}`);
    }
    const source = await resolveSource(path.resolve(options.source), "current");
    try {
      const result = await installToolkit({
        sourceRoot: source.root,
        targetRoot,
        targetAgent: options.to,
        bundles: status.lock?.bundles ?? options.bundle,
        release: source.release,
        sourceCommit: source.commit,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
      });
      printPlan(result.plan, Boolean(options.dryRun));
      printMigration(result.render);
      failOnConflicts(result.plan.conflicts.length);
    } finally {
      await source.cleanup();
    }
  });

program
  .command("status")
  .description("Show installed version and local drift")
  .argument("[target]", "Target project", ".")
  .option("--source <path>", "Toolkit Git repository", repositoryRoot)
  .action(async (target, options) => {
    const status = await inspectStatus(path.resolve(target));
    if (!status.lock) {
      console.log("Toolkit is not initialized.");
      return;
    }
    const latest = await latestTag(path.resolve(options.source));
    console.log(`Toolkit: ${status.lock.toolkit}`);
    console.log(`Version: ${status.lock.version} (${status.lock.release})`);
    console.log(`Agent: ${status.lock.targetAgent}`);
    console.log(`Bundles: ${status.lock.bundles.join(", ")}`);
    console.log(`Modified: ${status.modified.length}`);
    console.log(`Deleted: ${status.deleted.length}`);
    console.log(`Latest release: ${latest ?? "none"}`);
    for (const file of status.modified) console.log(`  modified ${file}`);
    for (const file of status.deleted) console.log(`  deleted ${file}`);
  });

program
  .command("validate")
  .description("Validate a toolkit source or installed project")
  .argument("[target]", "Target project", ".")
  .option("--source <path>", "Validate source manifest instead")
  .addOption(agentOption(false))
  .action(async (target, options) => {
    if (options.source) {
      const manifest = await loadManifest(path.resolve(options.source));
      console.log(`Valid manifest: ${manifest.name}@${manifest.version}`);
      return;
    }
    const targetRoot = path.resolve(target);
    const status = await inspectStatus(targetRoot);
    const agent = options.agent ?? status.lock?.targetAgent;
    if (!agent) throw new Error("Specify --agent or initialize the toolkit first");
    const errors = await getAdapter(agent).validate(targetRoot);
    if (errors.length) {
      for (const error of errors) console.error(error);
      process.exitCode = 1;
      return;
    }
    console.log(`Valid ${agent} toolkit`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function agentOption(required = true): Option {
  const option = new Option("-a, --agent <agent>", "Target agent").argParser(parseAgent);
  return required ? option.makeOptionMandatory() : option;
}

function parseAgent(value: string): AgentName {
  if (value !== "claude" && value !== "codex") throw new Error(`Unsupported agent: ${value}`);
  return value;
}

function failOnConflicts(count: number): void {
  if (count > 0) process.exitCode = 2;
}
