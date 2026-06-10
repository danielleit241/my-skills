import fs from "node:fs/promises";
import { createTwoFilesPatch } from "diff";
import type { ChangePlan, Conflict, RenderedFile, ToolkitLock } from "../types.js";
import { exists } from "./files.js";
import { sha256 } from "./hash.js";
import { resolveInside } from "./paths.js";

export async function buildChangePlan(
  targetRoot: string,
  desired: RenderedFile[],
  previous: ToolkitLock | null,
  force: boolean,
): Promise<ChangePlan> {
  const writes: RenderedFile[] = [];
  const deletes: string[] = [];
  const unchanged: string[] = [];
  const conflicts: Conflict[] = [];
  const desiredByPath = new Map(desired.map((file) => [file.path, file]));
  const previousByPath = new Map((previous?.files ?? []).map((file) => [file.path, file]));

  for (const file of desired) {
    const absolute = resolveInside(targetRoot, file.path);
    if (!(await exists(absolute))) {
      const old = previousByPath.get(file.path);
      if (old && !force) conflicts.push({ path: file.path, reason: "deleted" });
      else writes.push(file);
      continue;
    }

    const current = await fs.readFile(absolute);
    if (sha256(current) === sha256(file.content)) {
      unchanged.push(file.path);
      continue;
    }

    const old = previousByPath.get(file.path);
    const locallyModified = !old || sha256(current) !== old.sha256;
    if (locallyModified && !force) {
      conflicts.push({
        path: file.path,
        reason: old ? "modified" : "unmanaged",
        diff: textDiff(file.path, current, file.content),
      });
    } else {
      writes.push(file);
    }
  }

  for (const old of previous?.files ?? []) {
    if (desiredByPath.has(old.path)) continue;
    const absolute = resolveInside(targetRoot, old.path);
    if (!(await exists(absolute))) continue;
    const current = await fs.readFile(absolute);
    if (sha256(current) !== old.sha256 && !force) {
      conflicts.push({
        path: old.path,
        reason: "modified",
        diff: textDiff(old.path, current, Buffer.alloc(0)),
      });
    } else {
      deletes.push(old.path);
    }
  }

  return { writes, deletes, unchanged, conflicts };
}

function textDiff(file: string, current: Buffer, desired: Buffer): string | undefined {
  if (current.includes(0) || desired.includes(0)) return undefined;
  return createTwoFilesPatch(`${file} (current)`, `${file} (desired)`, current.toString(), desired.toString());
}
