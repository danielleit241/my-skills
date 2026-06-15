import fs from "node:fs/promises";
import path from "node:path";
import type { RenderedFile } from "../types.js";
import { exists } from "./files.js";

const MERGEABLE_JSON = new Set([
  ".ck.json",
  ".claude/settings.json",
  ".codex/hooks.json",
]);

export function isMergeableConfig(relativePath: string): boolean {
  return MERGEABLE_JSON.has(relativePath);
}

export async function mergeExistingConfig(
  targetRoot: string,
  files: RenderedFile[],
): Promise<RenderedFile[]> {
  return Promise.all(files.map(async (file) => {
    if (!isMergeableConfig(file.path)) return file;
    const destination = path.join(targetRoot, file.path);
    const desired = JSON.parse(file.content.toString("utf8")) as unknown;
    const content = await exists(destination)
      ? deepMerge(JSON.parse(await fs.readFile(destination, "utf8")) as unknown, desired)
      : desired;
    return {
      ...file,
      content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`),
    };
  }));
}

function deepMerge(current: unknown, desired: unknown): unknown {
  if (Array.isArray(current) && Array.isArray(desired)) {
    const result = [...current];
    const seen = new Set(current.map(stableKey));
    for (const item of desired) {
      const key = stableKey(item);
      if (!seen.has(key)) {
        result.push(item);
        seen.add(key);
      }
    }
    return result;
  }

  if (isRecord(current) && isRecord(desired)) {
    const result: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(desired)) {
      result[key] = key in current ? deepMerge(current[key], value) : value;
    }
    return result;
  }

  return desired;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableKey(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortValue(child)]),
  );
}
