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
        await convertConfig(context.sourceRoot, component.id, result);
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
    const body = parsed.content.trim();
    const toml = [
      `name = ${tomlString(name)}`,
      `description = ${tomlString(description)}`,
      `developer_instructions = ${tomlMultiline(body)}`,
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
  rewriteHookCommands(hooks);
  const targetPath = ".codex/hooks.json";
  result.files.push({
    path: targetPath,
    content: Buffer.from(`${JSON.stringify({ hooks }, null, 2)}\n`),
    component,
  });
  result.converted.push(`.claude/settings.json hooks -> ${targetPath}`);
}

function rewriteHookCommands(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) rewriteHookCommands(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.command === "string") {
    const command = record.command.replaceAll(".claude/hooks/", ".codex/hooks/");
    record.command = command;
    record.commandWindows = `powershell -NoProfile -Command '$root = git rev-parse --show-toplevel; ${command
      .replace("python .codex/", "python (Join-Path $root \".codex/")
      .replace(/\.py$/, ".py\")")}'`;
  }
  if (record.async === true) delete record.async;
  for (const child of Object.values(record)) rewriteHookCommands(child);
}

async function convertConfig(
  sourceRoot: string,
  component: string,
  result: RenderResult,
): Promise<void> {
  const claudeMd = path.join(sourceRoot, "CLAUDE.md");
  if (await exists(claudeMd)) {
    result.files.push({
      path: "AGENTS.md",
      content: await fs.readFile(claudeMd),
      component,
    });
    result.converted.push("CLAUDE.md -> AGENTS.md");
  }
  result.files.push({
    path: ".codex/config.toml",
    content: Buffer.from("[features]\nhooks = true\n"),
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

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlMultiline(value: string): string {
  return `'''${value.replaceAll("'''", "''\\'")}'''`;
}
