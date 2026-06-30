import fs from "node:fs/promises";
import path from "node:path";
import type { ToolkitLock } from "../types.js";
import { exists } from "./files.js";
import { LEGACY_LOCK_FILE, LOCK_FILE } from "./paths.js";

export async function findLockFile(targetRoot: string): Promise<string | null> {
  for (const relative of [LOCK_FILE, LEGACY_LOCK_FILE]) {
    if (await exists(path.join(targetRoot, relative))) return relative;
  }
  return null;
}

export async function readLock(targetRoot: string): Promise<ToolkitLock | null> {
  const relative = await findLockFile(targetRoot);
  if (!relative) return null;
  const file = path.join(targetRoot, relative);
  const lock = JSON.parse(await fs.readFile(file, "utf8")) as ToolkitLock;
  if (lock.schemaVersion !== 1) throw new Error("Unsupported lockfile schema");
  return lock;
}

export function serializeLock(lock: ToolkitLock): Buffer {
  return Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
}
