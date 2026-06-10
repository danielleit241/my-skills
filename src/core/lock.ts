import fs from "node:fs/promises";
import path from "node:path";
import type { ToolkitLock } from "../types.js";
import { exists } from "./files.js";
import { LOCK_FILE } from "./paths.js";

export async function readLock(targetRoot: string): Promise<ToolkitLock | null> {
  const file = path.join(targetRoot, LOCK_FILE);
  if (!(await exists(file))) return null;
  const lock = JSON.parse(await fs.readFile(file, "utf8")) as ToolkitLock;
  if (lock.schemaVersion !== 1) throw new Error("Unsupported lockfile schema");
  return lock;
}

export function serializeLock(lock: ToolkitLock): Buffer {
  return Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
}
