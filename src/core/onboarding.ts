import path from "node:path";
import fs from "node:fs/promises";
import { stdin, stdout } from "node:process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { AgentName } from "../types.js";
import { exists } from "./files.js";
import { readLock } from "./lock.js";
import { findProjectRoot } from "./project.js";

export type OnboardingAction = "init" | "update" | "migrate" | "status" | "validate";

export interface OnboardingSelection {
  action: OnboardingAction;
  targetRoot: string;
  agent?: AgentName;
  from?: AgentName;
  to?: AgentName;
  bundles: string[];
}

export async function runOnboarding(defaultTarget = "."): Promise<OnboardingSelection | null> {
  if (!stdin.isTTY || !stdout.isTTY) return null;
  p.intro(pc.bgCyan(pc.black(" forge setup ")));
  const targetMode = unwrap(await p.select({
    message: "How should the project target be resolved?",
    options: [
      { value: "root", label: "Current folder", hint: "treat the working directory as project root" },
      { value: "path", label: "Path inside project", hint: "auto-detect the project root" },
    ],
    initialValue: "root",
  }));
  const targetRoot = targetMode === "root"
    ? process.cwd()
    : await findProjectRoot(unwrap(await p.text({
      message: "File or directory inside the project",
      defaultValue: defaultTarget,
      placeholder: defaultTarget,
      validate: (value) => value.trim() ? undefined : "A project path is required",
    })));
  const detected = await detectAgents(targetRoot);
  p.note(
    [
      `${pc.dim("Root")}     ${pc.cyan(targetRoot)}`,
      `${pc.dim("Detected")} ${detected.length ? detected.join(", ") : "no existing agent folders"}`,
    ].join("\n"),
    "Project",
  );
  const action = unwrap(await p.select<OnboardingAction>({
    message: "What do you want to do?",
    options: [
      { value: "init", label: "Initialize toolkit" },
      { value: "update", label: "Update toolkit" },
      { value: "migrate", label: "Migrate agent format" },
      { value: "status", label: "Show status" },
      { value: "validate", label: "Validate installation" },
    ],
  }));
  if (action === "init") {
    const defaultAgent = detected[0] ?? "claude";
    const agent = unwrap(await p.select<AgentName>({
      message: "Target agent",
      options: [
        { value: "claude", label: "Claude Code" },
        { value: "codex", label: "Codex" },
      ],
      initialValue: defaultAgent,
    }));
    const bundle = unwrap(await p.select<string>({
      message: "Bundle to install",
      options: [
        { value: "full", label: "Full", hint: "all toolkit components" },
        { value: "development", label: "Development", hint: "core, skills, commands, agents" },
        { value: "skills", label: "Skills only" },
      ],
      initialValue: "full",
    }));
    await confirmSelection(targetRoot, action);
    return { action, targetRoot, agent, bundles: [bundle] };
  }
  if (action === "migrate") {
    const lock = await readLock(targetRoot);
    const inferred = inferMigrationSource(lock?.targetAgent, detected);
    const from = inferred ?? unwrap(await p.select<AgentName>({
        message: "Source agent",
        options: [
          { value: "claude", label: "Claude Code" },
          { value: "codex", label: "Codex" },
        ],
        initialValue: detected[0] ?? "claude",
      }));
    if (!(await hasBaseSkills(targetRoot, from))) {
      throw new Error(
        `Migration requires existing base skills for ${agentLabel(from)}. Run init first or install ${agentSkillsPath(from)} before migrating.`,
      );
    }
    const to = from === "claude" ? "codex" : "claude";
    p.note(
      `${agentLabel(from)} ${pc.dim("->")} ${agentLabel(to)}`,
      lock ? "Migration from lockfile" : "Migration",
    );
    p.note("Only fixed base skills will be migrated for now.", "Migration scope");
    await confirmSelection(targetRoot, action);
    return { action, targetRoot, from, to, bundles: ["skills"] };
  }
  await confirmSelection(targetRoot, action);
  return { action, targetRoot, bundles: ["full"] };
}

async function detectAgents(targetRoot: string): Promise<AgentName[]> {
  const agents: AgentName[] = [];
  if (await exists(path.join(targetRoot, ".claude"))) agents.push("claude");
  if (await exists(path.join(targetRoot, ".codex"))) agents.push("codex");
  return agents;
}

async function confirmSelection(targetRoot: string, action: OnboardingAction): Promise<void> {
  const confirmed = unwrap(await p.confirm({
    message: `${capitalize(action)} in ${targetRoot}?`,
    initialValue: true,
  }));
  if (!confirmed) {
    p.cancel("Setup cancelled.");
    throw new Error("Setup cancelled");
  }
  p.outro(pc.green("Configuration complete"));
}

export async function hasBaseSkills(targetRoot: string, agent: AgentName): Promise<boolean> {
  const skillsRoot = path.join(targetRoot, agentSkillsPath(agent));
  if (!(await exists(skillsRoot))) return false;
  try {
    const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory());
  } catch {
    return false;
  }
}

function agentSkillsPath(agent: AgentName): string {
  return agent === "claude" ? ".claude/skills" : ".agents/skills";
}

function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Setup cancelled.");
    throw new Error("Setup cancelled");
  }
  return value as T;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function inferMigrationSource(
  lockAgent: AgentName | undefined,
  detected: AgentName[],
): AgentName | undefined {
  if (lockAgent) return lockAgent;
  return detected.length === 1 ? detected[0] : undefined;
}

function agentLabel(agent: AgentName): string {
  return agent === "claude" ? "Claude Code" : "Codex";
}
