import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { RenderResult, RenderedFile } from "../types.js";
import { listFiles } from "../core/files.js";
import { normalizeRelative } from "../core/paths.js";
import type { AdapterContext, ToolkitAdapter } from "./adapter.js";

export class ClaudeAdapter implements ToolkitAdapter {
  readonly name = "claude" as const;

  async render(context: AdapterContext): Promise<RenderResult> {
    const files: RenderedFile[] = [];
    const copied: string[] = [];
    for (const component of context.components) {
      for (const sourcePath of component.paths) {
        const absolute = path.join(context.sourceRoot, sourcePath);
        const stat = await fs.stat(absolute);
        const paths = stat.isDirectory()
          ? await listFiles(context.sourceRoot, sourcePath)
          : [normalizeRelative(sourcePath)];
        for (const relative of paths) {
          files.push({
            path: relative,
            content: await fs.readFile(path.join(context.sourceRoot, relative)),
            component: component.id,
          });
          copied.push(relative);
        }
      }
    }
    return { files, copied, converted: [], unsupported: [], skipped: [] };
  }

  async validate(targetRoot: string): Promise<string[]> {
    const errors: string[] = [];
    const skillsRoot = path.join(targetRoot, ".claude", "skills");
    try {
      for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = path.join(skillsRoot, entry.name, "SKILL.md");
        try {
          const parsed = matter(await fs.readFile(file, "utf8"));
          if (!parsed.data.name || !parsed.data.description) {
            errors.push(`${file}: frontmatter requires name and description`);
          }
        } catch {
          errors.push(`${file}: missing or invalid SKILL.md`);
        }
      }
    } catch {
      // Skills are optional for partial bundles.
    }
    return errors;
  }
}
