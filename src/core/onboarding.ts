import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { AgentName } from "../types.js";
import { exists } from "./files.js";

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
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const targetRoot = path.resolve(await ask(prompt, "Project path", defaultTarget));
    const detected = await detectAgents(targetRoot);
    console.log(`Detected: ${detected.length ? detected.join(", ") : "no existing agent folders"}`);
    const action = await choose(prompt, "Action", ["init", "update", "migrate", "status", "validate"]);
    if (action === "init") {
      const defaultAgent = detected[0] ?? "claude";
      const agent = await choose(prompt, "Target agent", ["claude", "codex"], defaultAgent);
      const bundles = (await ask(prompt, "Bundles (comma separated)", "full"))
        .split(",").map((item) => item.trim()).filter(Boolean);
      return { action, targetRoot, agent, bundles };
    }
    if (action === "migrate") {
      const from = await choose(prompt, "Source agent", ["claude", "codex"], detected[0] ?? "claude");
      const to = from === "claude" ? "codex" : "claude";
      return { action, targetRoot, from, to, bundles: ["full"] };
    }
    return { action, targetRoot, bundles: ["full"] };
  } finally {
    prompt.close();
  }
}

async function detectAgents(targetRoot: string): Promise<AgentName[]> {
  const agents: AgentName[] = [];
  if (await exists(path.join(targetRoot, ".claude"))) agents.push("claude");
  if (await exists(path.join(targetRoot, ".codex"))) agents.push("codex");
  return agents;
}

async function ask(
  prompt: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = (await prompt.question(`${label} [${defaultValue}]: `)).trim();
  return answer || defaultValue;
}

async function choose<T extends string>(
  prompt: ReturnType<typeof createInterface>,
  label: string,
  choices: readonly T[],
  defaultValue: T = choices[0],
): Promise<T> {
  const answer = await ask(prompt, `${label} (${choices.join("/")})`, defaultValue);
  if (!choices.includes(answer as T)) throw new Error(`Invalid ${label.toLowerCase()}: ${answer}`);
  return answer as T;
}
