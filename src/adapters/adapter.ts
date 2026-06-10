import type {
  AgentName,
  RenderResult,
  ToolkitComponent,
  ToolkitManifest,
} from "../types.js";

export interface AdapterContext {
  sourceRoot: string;
  manifest: ToolkitManifest;
  components: ToolkitComponent[];
}

export interface ToolkitAdapter {
  name: AgentName;
  render(context: AdapterContext): Promise<RenderResult>;
  validate(targetRoot: string): Promise<string[]>;
}
