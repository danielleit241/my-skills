import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { RenderResult, RenderedFile, ToolkitComponent } from "../types.js";
import { exists, listFiles } from "../core/files.js";
import { normalizeRelative } from "../core/paths.js";
import type { AdapterContext, ToolkitAdapter } from "./adapter.js";

export class CodexAdapter implements ToolkitAdapter {
  readonly name = "codex" as const;

  async render(context: AdapterContext): Promise<RenderResult> {
    const result: RenderResult = {
      files: [],
      copied: [],
      converted: [],
      unsupported: [],
      skipped: [],
    };

    for (const component of context.components) {
      if (!component.adapters.includes("codex")) {
        for (const sourcePath of component.paths) {
          result.unsupported.push({
            component: component.id,
            path: sourcePath,
            reason: "Component has no direct Codex mapping",
          });
        }
        continue;
      }
      await this.renderComponent(context, component, result);
    }
    return result;
  }

  async validate(targetRoot: string): Promise<string[]> {
    const errors: string[] = [];
    const skillsRoot = path.join(targetRoot, ".agents", "skills");
    if (await exists(skillsRoot)) {
      for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skill = path.join(skillsRoot, entry.name, "SKILL.md");
        try {
          const parsed = matter(await fs.readFile(skill, "utf8"));
          if (!parsed.data.name || !parsed.data.description) {
            errors.push(`${skill}: frontmatter requires name and description`);
          }
        } catch {
          errors.push(`${skill}: missing or invalid SKILL.md`);
        }
      }
    }

    const agentsRoot = path.join(targetRoot, ".codex", "agents");
    if (await exists(agentsRoot)) {
      for (const entry of await fs.readdir(agentsRoot)) {
        if (!entry.endsWith(".toml")) continue;
        const content = await fs.readFile(path.join(agentsRoot, entry), "utf8");
        for (const key of ["name", "description", "developer_instructions"]) {
          if (!new RegExp(`^${key}\\s*=`, "m").test(content)) {
            errors.push(`${entry}: missing ${key}`);
          }
        }
      }
    }
    return errors;
  }

  private async renderComponent(
    context: AdapterContext,
    component: ToolkitComponent,
    result: RenderResult,
  ): Promise<void> {
    switch (component.type) {
      case "skill":
        await copyTree(context.sourceRoot, ".claude/skills", ".agents/skills", component.id, result);
        break;
      case "command":
        await convertCommands(context.sourceRoot, component.id, result);
        break;
      case "agent":
        await convertAgents(context.sourceRoot, component.id, result);
        break;
      case "hook":
        await convertHooks(context.sourceRoot, component.id, result);
        break;
      case "config":
        await convertConfig(context.sourceRoot, context.targetRoot, component.id, result);
        break;
      default:
        for (const sourcePath of component.paths) {
          result.unsupported.push({
            component: component.id,
            path: sourcePath,
            reason: "No Codex renderer implemented",
          });
        }
    }
  }
}

async function copyTree(
  sourceRoot: string,
  sourcePrefix: string,
  targetPrefix: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  for (const sourcePath of await listFiles(sourceRoot, sourcePrefix)) {
    const targetPath = normalizeRelative(path.join(targetPrefix, path.relative(sourcePrefix, sourcePath)));
    result.files.push({
      path: targetPath,
      content: await fs.readFile(path.join(sourceRoot, sourcePath)),
      component,
    });
    result.copied.push(targetPath);
  }
}

async function convertCommands(
  sourceRoot: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  for (const sourcePath of await listFiles(sourceRoot, ".claude/commands")) {
    if (!sourcePath.endsWith(".md")) {
      result.skipped.push(sourcePath);
      continue;
    }
    const raw = await fs.readFile(path.join(sourceRoot, sourcePath), "utf8");
    const parsed = matter(raw);
    const relative = path.relative(".claude/commands", sourcePath);
    const name = relative.replace(/\.md$/, "").split(path.sep).join("-");
    const description = String(parsed.data.description ?? `Migrated command ${name}`);
    const content = matter.stringify(parsed.content, { name, description });
    const targetPath = `.agents/skills/${name}/SKILL.md`;
    if (result.files.some((file) => file.path === targetPath)) {
      result.skipped.push(`${sourcePath} (skill ${name} already exists)`);
      continue;
    }
    result.files.push({ path: targetPath, content: Buffer.from(content), component });
    result.converted.push(`${sourcePath} -> ${targetPath}`);
  }
}

async function convertAgents(
  sourceRoot: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  for (const sourcePath of await listFiles(sourceRoot, ".claude/agents")) {
    if (!sourcePath.endsWith(".md")) {
      result.skipped.push(sourcePath);
      continue;
    }
    const raw = await fs.readFile(path.join(sourceRoot, sourcePath), "utf8");
    const parsed = matter(raw);
    const name = String(parsed.data.name ?? path.basename(sourcePath, ".md"));
    const description = String(parsed.data.description ?? `Migrated agent ${name}`);
    const tools = parseStringArray(parsed.data.tools);
    const body = buildCodexAgentInstructions(parsed.content.trim(), name, tools);
    const modelConfig = mapClaudeModel(name, parsed.data.model);
    const sandboxConfig = mapSandboxMode(name, tools);
    const nicknames = nicknameCandidates(name);
    const toml = [
      `name = ${tomlString(name)}`,
      `description = ${tomlString(description)}`,
      ...modelConfig,
      ...sandboxConfig,
      `developer_instructions = ${tomlMultiline(body)}`,
      `nickname_candidates = ${tomlArray(nicknames)}`,
      "",
    ].join("\n");
    const targetPath = `.codex/agents/${name}.toml`;
    result.files.push({ path: targetPath, content: Buffer.from(toml), component });
    result.converted.push(`${sourcePath} -> ${targetPath}`);
  }
}

async function convertHooks(
  sourceRoot: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  await copyTree(sourceRoot, ".claude/hooks", ".codex/hooks", component, result);
  const settingsPath = path.join(sourceRoot, ".claude", "settings.json");
  const settings = JSON.parse(await fs.readFile(settingsPath, "utf8")) as Record<string, unknown>;
  const hooks = structuredClone((settings.hooks ?? {}) as Record<string, unknown>);
  normalizeCodexHooks(hooks, result);
  const targetPath = ".codex/hooks.json";
  result.files.push({
    path: targetPath,
    content: Buffer.from(`${JSON.stringify({ hooks }, null, 2)}\n`),
    component,
  });
  result.converted.push(`.claude/settings.json hooks -> ${targetPath}`);
}

function normalizeCodexHooks(hooks: Record<string, unknown>, result: RenderResult): void {
  for (const [event, groupsValue] of Object.entries(hooks)) {
    if (!Array.isArray(groupsValue)) continue;
    const normalizedGroups: unknown[] = [];
    for (const groupValue of groupsValue) {
      if (!groupValue || typeof groupValue !== "object") continue;
      const group = groupValue as Record<string, unknown>;
      const matcher = normalizeMatcher(event, group.matcher);
      if (matcher === null) {
        result.skipped.push(`hook ${event} matcher ${String(group.matcher)} (no Codex tool equivalent)`);
        continue;
      }
      if (matcher === undefined) delete group.matcher;
      else group.matcher = matcher;
      rewriteHookHandlers(group);
      normalizedGroups.push(group);
    }
    hooks[event] = normalizedGroups;
  }
  ensureCodexPromptCapture(hooks);
}

function ensureCodexPromptCapture(hooks: Record<string, unknown>): void {
  const command = `python3 "$(git rev-parse --show-toplevel)/.codex/hooks/session_state.py" user-prompt`;
  const commandWindows =
    `powershell -NoProfile -Command '$root = git rev-parse --show-toplevel; ` +
    `python (Join-Path $root ".codex/hooks/session_state.py") user-prompt'`;
  const group = {
    hooks: [
      {
        type: "command",
        command,
        commandWindows,
        timeout: 5,
      },
    ],
  };
  const current = hooks.UserPromptSubmit;
  if (!Array.isArray(current)) {
    hooks.UserPromptSubmit = [group];
    return;
  }
  const serialized = JSON.stringify(current);
  if (!serialized.includes("session_state.py")) current.push(group);
}

function rewriteHookHandlers(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) rewriteHookHandlers(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.command === "string") {
    const script = extractHookScript(record.command);
    if (script) {
      record.command = `python3 "$(git rev-parse --show-toplevel)/.codex/hooks/${script}"`;
      record.commandWindows =
        `powershell -NoProfile -Command '$root = git rev-parse --show-toplevel; ` +
        `python (Join-Path $root ".codex/hooks/${script}")'`;
    }
  }
  if (record.async === true) delete record.async;
  for (const child of Object.values(record)) rewriteHookHandlers(child);
}

function normalizeMatcher(event: string, value: unknown): string | undefined | null {
  if (event === "UserPromptSubmit" || event === "Stop") return undefined;
  if (value === undefined || value === "" || value === "*") return "*";
  if (typeof value !== "string") return null;

  if (event === "PreToolUse" || event === "PostToolUse" || event === "PermissionRequest") {
    const mapped = value
      .split("|")
      .map((item) => item.trim())
      .flatMap((item) => {
        if (item === "Bash") return ["Bash"];
        if (item === "Write" || item === "Edit") return [item];
        if (item.startsWith("mcp__")) return [item];
        return [];
      });
    return [...new Set(mapped)].join("|") || null;
  }
  return value;
}

function extractHookScript(command: string): string | null {
  const match = command.replaceAll("\\", "/").match(/\.claude\/hooks\/([^"' )]+\.py)/);
  return match?.[1] ?? null;
}

async function convertConfig(
  sourceRoot: string,
  targetRoot: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  const claudeMd = path.join(sourceRoot, "CLAUDE.md");
  const existingAgents = await findExistingInstructionFile(targetRoot, ["AGENTS.md", "agents.md"]);
  const existingClaude = await findExistingInstructionFile(targetRoot, ["CLAUDE.md", "claude.md"]);
  if (existingAgents) {
    result.skipped.push(`${existingAgents} already exists`);
  } else if (existingClaude) {
    result.files.push({
      path: "AGENTS.md",
      content: Buffer.from(
        [
          "# Codex Instructions",
          "",
          `Project instructions already live in \`@${existingClaude}\`.`,
          `Read \`@${existingClaude}\` first and treat it as the source of truth for this project.`,
          "",
        ].join("\n"),
      ),
      component,
    });
    result.converted.push(`${existingClaude} -> AGENTS.md reference`);
  } else if (await exists(claudeMd)) {
    result.files.push({
      path: "AGENTS.md",
      content: await fs.readFile(claudeMd),
      component,
    });
    result.converted.push("CLAUDE.md -> AGENTS.md");
  }
  const config = [
    "[features]",
    "hooks = true",
    "",
    "[agents]",
    "max_threads = 6",
    "max_depth = 1",
    "",
    ...(await renderMcpConfig(sourceRoot, result)),
  ];
  result.files.push({
    path: ".codex/config.toml",
    content: Buffer.from(config.join("\n")),
    component,
  });
  result.converted.push(".claude/settings.json -> .codex/config.toml");
  if (await exists(path.join(sourceRoot, ".ck.json"))) {
    result.files.push({
      path: ".ck.json",
      content: await fs.readFile(path.join(sourceRoot, ".ck.json")),
      component,
    });
    result.copied.push(".ck.json");
  }
}

async function renderMcpConfig(sourceRoot: string, result: RenderResult): Promise<string[]> {
  const mcpPath = path.join(sourceRoot, ".mcp.json");
  if (!(await exists(mcpPath))) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(mcpPath, "utf8")) as unknown;
  } catch {
    result.skipped.push(".mcp.json (invalid JSON)");
    return [];
  }

  const servers = readMcpServers(raw);
  if (!servers.length) return [];

  const lines = ["# Migrated from .mcp.json", ""];
  for (const [name, config] of servers) {
    lines.push(...renderMcpServer(name, config, result), "");
  }
  result.converted.push(".mcp.json -> .codex/config.toml mcp_servers");
  return lines;
}

function readMcpServers(value: unknown): Array<[string, Record<string, unknown>]> {
  if (!isRecord(value)) return [];
  const container = isRecord(value.mcpServers)
    ? value.mcpServers
    : isRecord(value.mcp_servers)
      ? value.mcp_servers
      : null;
  if (!container) return [];
  return Object.entries(container).filter(
    (entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]),
  );
}

function renderMcpServer(
  name: string,
  config: Record<string, unknown>,
  result: RenderResult,
): string[] {
  const lines = [`[mcp_servers.${tomlKey(name)}]`];
  const inlineKeys = new Set([
    "command",
    "args",
    "env_vars",
    "cwd",
    "experimental_environment",
    "url",
    "bearer_token_env_var",
    "startup_timeout_sec",
    "tool_timeout_sec",
    "enabled",
    "required",
    "enabled_tools",
    "disabled_tools",
    "default_tools_approval_mode",
  ]);
  const tableKeys = new Set(["env", "http_headers", "env_http_headers"]);
  const handled = new Set([...inlineKeys, ...tableKeys, "tools"]);

  for (const key of inlineKeys) {
    if (!(key in config)) continue;
    const value = tomlValue(config[key]);
    if (value === null) {
      result.skipped.push(`.mcp.json ${name}.${key} (unsupported value)`);
      continue;
    }
    lines.push(`${key} = ${value}`);
  }

  for (const key of tableKeys) {
    const value = config[key];
    if (!isRecord(value)) continue;
    lines.push("", `[mcp_servers.${tomlKey(name)}.${tomlKey(key)}]`);
    for (const [childKey, childValue] of Object.entries(value)) {
      const rendered = tomlValue(childValue);
      if (rendered === null) {
        result.skipped.push(`.mcp.json ${name}.${key}.${childKey} (unsupported value)`);
        continue;
      }
      lines.push(`${tomlKey(childKey)} = ${rendered}`);
    }
  }

  if (isRecord(config.tools)) {
    for (const [toolName, toolConfig] of Object.entries(config.tools)) {
      if (!isRecord(toolConfig)) continue;
      lines.push("", `[mcp_servers.${tomlKey(name)}.tools.${tomlKey(toolName)}]`);
      for (const [key, value] of Object.entries(toolConfig)) {
        const rendered = tomlValue(value);
        if (rendered === null) {
          result.skipped.push(`.mcp.json ${name}.tools.${toolName}.${key} (unsupported value)`);
          continue;
        }
        lines.push(`${tomlKey(key)} = ${rendered}`);
      }
    }
  }

  for (const key of Object.keys(config)) {
    if (!handled.has(key)) result.skipped.push(`.mcp.json ${name}.${key} (not used by Codex config)`);
  }
  return lines;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlArray(values: string[]): string {
  return `[${values.map(tomlString).join(", ")}]`;
}

function tomlKey(value: string): string {
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : tomlString(value);
}

function tomlValue(value: unknown): string | null {
  if (typeof value === "string") return tomlString(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    const items = value.map(tomlValue);
    return items.every((item): item is string => item !== null) ? `[${items.join(", ")}]` : null;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .map(([key, child]) => {
        const rendered = tomlValue(child);
        return rendered === null ? null : `${tomlKey(key)} = ${rendered}`;
      });
    return entries.every((item): item is string => item !== null) ? `{ ${entries.join(", ")} }` : null;
  }
  return null;
}

function tomlMultiline(value: string): string {
  return `'''${value.replaceAll("'''", "''\\'")}'''`;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildCodexAgentInstructions(body: string, name: string, tools: string[]): string {
  const readOnly = shouldUseReadOnlySandbox(name, tools);
  const contract = [
    "## Codex Subagent Contract",
    "",
    "- Run as a focused spawned Codex custom agent. Stay inside the role described by your name and description.",
    "- Do not spawn child agents unless the parent explicitly asks for nested delegation.",
    "- Return distilled findings, decisions, changed files, and verification results. Do not dump raw logs unless they are the direct evidence needed.",
    "- Prefer targeted reads/searches and cite file paths or symbols for claims about the codebase.",
    readOnly
      ? "- Operate read-only: gather evidence and recommendations only; do not edit files or run commands whose purpose is to change project state."
      : "- Edit only when the parent task and this agent role require it; keep changes narrow and report exactly what changed.",
  ];
  return `${body}\n\n${contract.join("\n")}`.trim();
}

function mapSandboxMode(name: string, tools: string[]): string[] {
  return shouldUseReadOnlySandbox(name, tools) ? ['sandbox_mode = "read-only"'] : [];
}

function shouldUseReadOnlySandbox(name: string, tools: string[]): boolean {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("git-manager")) return false;
  if (tools.some((tool) => tool === "Write" || tool === "Edit")) return false;
  return true;
}

function nicknameCandidates(name: string): string[] {
  const words = name
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const label = words.join(" ") || "Agent";
  return [`${label} Alpha`, `${label} Delta`, `${label} Echo`];
}

async function findExistingInstructionFile(root: string, candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await exists(path.join(root, candidate))) return candidate;
  }
  return null;
}

function mapClaudeModel(name: string, value: unknown): string[] {
  const normalized = String(value ?? "").toLowerCase();
  if (name.toLowerCase() === "scout" || normalized.includes("haiku")) {
    return ['model = "gpt-5.4-mini"', 'model_reasoning_effort = "medium"'];
  }
  if (normalized.includes("opus")) {
    return ['model = "gpt-5.5"', 'model_reasoning_effort = "xhigh"'];
  }
  if (normalized.includes("sonnet")) {
    return ['model = "gpt-5.5"', 'model_reasoning_effort = "medium"'];
  }
  return [];
}
