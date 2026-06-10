import type { AgentName } from "../types.js";
import type { ToolkitAdapter } from "./adapter.js";
import { ClaudeAdapter } from "./claude.js";
import { CodexAdapter } from "./codex.js";

export function getAdapter(name: AgentName): ToolkitAdapter {
  if (name === "claude") return new ClaudeAdapter();
  if (name === "codex") return new CodexAdapter();
  throw new Error(`Unsupported agent: ${name}`);
}
