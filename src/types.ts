export type AgentName = "claude" | "codex";
export type ComponentType = "skill" | "command" | "agent" | "hook" | "rule" | "config";

export interface ToolkitComponent {
  id: string;
  type: ComponentType;
  paths: string[];
  adapters: AgentName[];
  dependencies?: string[];
}

export interface ToolkitBundle {
  description: string;
  components: string[];
}

export interface ToolkitManifest {
  $schemaVersion: number;
  name: string;
  version: string;
  sourceAgent: AgentName;
  supportedAgents: AgentName[];
  components: ToolkitComponent[];
  bundles: Record<string, ToolkitBundle>;
}

export interface ManagedFile {
  path: string;
  sha256: string;
  component: string;
}

export interface ToolkitLock {
  schemaVersion: number;
  toolkit: string;
  version: string;
  release: string;
  sourceCommit: string | null;
  targetAgent: AgentName;
  bundles: string[];
  components: string[];
  files: ManagedFile[];
  installedAt: string;
}

export interface RenderedFile {
  path: string;
  content: Buffer;
  component: string;
}

export interface UnsupportedItem {
  component: string;
  path: string;
  reason: string;
}

export interface RenderResult {
  files: RenderedFile[];
  converted: string[];
  copied: string[];
  unsupported: UnsupportedItem[];
  skipped: string[];
}

export interface Conflict {
  path: string;
  reason: "modified" | "deleted" | "unmanaged";
  diff?: string;
}

export interface ChangePlan {
  writes: RenderedFile[];
  deletes: string[];
  unchanged: string[];
  conflicts: Conflict[];
}
