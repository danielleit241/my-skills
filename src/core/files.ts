import fs from "node:fs/promises";
import path from "node:path";
import { normalizeRelative } from "./paths.js";

const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  "__pycache__",
  "session-data",
  "backup-pre-parity",
]);
const IGNORED_SUFFIXES = [".pyc", ".pyo"];

export async function listFiles(root: string, relative = ""): Promise<string[]> {
  const current = path.join(root, relative);
  const entries = await fs.readdir(current, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name) || IGNORED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      continue;
    }
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(root, child)));
    else if (entry.isFile()) output.push(normalizeRelative(child));
  }
  return output.sort();
}

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
