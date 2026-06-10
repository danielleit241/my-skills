import fs from "node:fs/promises";
import path from "node:path";
import semver from "semver";
import type { ToolkitComponent, ToolkitManifest } from "../types.js";

export async function loadManifest(sourceRoot: string): Promise<ToolkitManifest> {
  const file = path.join(sourceRoot, "toolkit.manifest.json");
  const manifest = JSON.parse(await fs.readFile(file, "utf8")) as ToolkitManifest;
  validateManifest(manifest);
  return manifest;
}

export function validateManifest(manifest: ToolkitManifest): void {
  if (manifest.$schemaVersion !== 1) throw new Error("Unsupported manifest schema");
  if (!manifest.name) throw new Error("Manifest name is required");
  if (!semver.valid(manifest.version)) throw new Error(`Invalid manifest version: ${manifest.version}`);
  if (!manifest.supportedAgents.includes(manifest.sourceAgent)) {
    throw new Error("sourceAgent must be included in supportedAgents");
  }

  const ids = new Set<string>();
  for (const component of manifest.components) {
    if (ids.has(component.id)) throw new Error(`Duplicate component: ${component.id}`);
    ids.add(component.id);
    if (component.paths.length === 0) throw new Error(`Component has no paths: ${component.id}`);
  }
  for (const [name, bundle] of Object.entries(manifest.bundles)) {
    for (const component of bundle.components) {
      if (!ids.has(component)) throw new Error(`Bundle ${name} references unknown component ${component}`);
    }
  }
}

export function selectComponents(
  manifest: ToolkitManifest,
  bundleNames: string[],
): ToolkitComponent[] {
  const selected = new Set<string>();
  const byId = new Map(manifest.components.map((item) => [item.id, item]));

  const visit = (id: string): void => {
    if (selected.has(id)) return;
    const component = byId.get(id);
    if (!component) throw new Error(`Unknown component: ${id}`);
    for (const dependency of component.dependencies ?? []) visit(dependency);
    selected.add(id);
  };

  for (const bundleName of bundleNames) {
    const bundle = manifest.bundles[bundleName];
    if (!bundle) throw new Error(`Unknown bundle: ${bundleName}`);
    for (const id of bundle.components) visit(id);
  }
  return [...selected].map((id) => byId.get(id)!);
}
