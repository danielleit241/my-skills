import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ChangePlan, RenderedFile } from "../types.js";
import { exists } from "./files.js";
import { resolveInside } from "./paths.js";

interface Backup {
  relative: string;
  existed: boolean;
  backupPath?: string;
}

export async function applyTransaction(targetRoot: string, plan: ChangePlan): Promise<void> {
  if (plan.conflicts.length > 0) throw new Error("Cannot apply a plan containing conflicts");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "my-skills-"));
  const backups: Backup[] = [];
  try {
    for (const file of plan.writes) backups.push(await backup(targetRoot, tempRoot, file.path));
    for (const relative of plan.deletes) backups.push(await backup(targetRoot, tempRoot, relative));

    for (const file of plan.writes) await atomicWrite(targetRoot, file);
    for (const relative of plan.deletes) {
      await fs.rm(resolveInside(targetRoot, relative), { force: true });
      await removeEmptyParents(targetRoot, path.dirname(resolveInside(targetRoot, relative)));
    }
  } catch (error) {
    await rollback(targetRoot, backups);
    throw error;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function backup(targetRoot: string, tempRoot: string, relative: string): Promise<Backup> {
  const source = resolveInside(targetRoot, relative);
  if (!(await exists(source))) return { relative, existed: false };
  const backupPath = path.join(tempRoot, String(Math.random()).slice(2));
  await fs.copyFile(source, backupPath);
  return { relative, existed: true, backupPath };
}

async function atomicWrite(targetRoot: string, file: RenderedFile): Promise<void> {
  const destination = resolveInside(targetRoot, file.path);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.my-skills-${process.pid}.tmp`;
  await fs.writeFile(temporary, file.content);
  await fs.rename(temporary, destination);
}

async function rollback(targetRoot: string, backups: Backup[]): Promise<void> {
  for (const item of backups.reverse()) {
    const destination = resolveInside(targetRoot, item.relative);
    if (!item.existed) {
      await fs.rm(destination, { force: true });
      continue;
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(item.backupPath!, destination);
  }
}

async function removeEmptyParents(root: string, directory: string): Promise<void> {
  const absoluteRoot = path.resolve(root);
  let current = directory;
  while (current !== absoluteRoot && current.startsWith(absoluteRoot)) {
    try {
      await fs.rmdir(current);
      current = path.dirname(current);
    } catch {
      break;
    }
  }
}
