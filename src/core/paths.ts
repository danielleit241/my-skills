import path from "node:path";

export const LOCK_FILE = ".forge.lock.json";
export const LEGACY_LOCK_FILE = ".my-skills.lock.json";

export function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

export function resolveInside(root: string, relative: string): string {
  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absoluteRoot, relative);
  const relation = path.relative(absoluteRoot, resolved);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error(`Path escapes target root: ${relative}`);
  }
  return resolved;
}
