import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ToolkitManifest } from "../types.js";

export async function tempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeFixture(root: string, manifest: ToolkitManifest): Promise<void> {
  await fs.mkdir(path.join(root, ".claude", "skills", "hello"), { recursive: true });
  await fs.mkdir(path.join(root, ".claude", "commands", "ck"), { recursive: true });
  await fs.mkdir(path.join(root, ".claude", "agents"), { recursive: true });
  await fs.mkdir(path.join(root, ".claude", "hooks"), { recursive: true });
  await fs.writeFile(path.join(root, "toolkit.manifest.json"), JSON.stringify(manifest));
  await fs.writeFile(path.join(root, "CLAUDE.md"), "# Instructions\n");
  await fs.writeFile(path.join(root, ".ck.json"), "{}");
  await fs.writeFile(
    path.join(root, ".claude", "settings.json"),
    JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "python .claude/hooks/stop.py", async: true }] }],
      },
    }),
  );
  await fs.writeFile(
    path.join(root, ".claude", "skills", "hello", "SKILL.md"),
    "---\nname: hello\ndescription: Say hello.\n---\n\nSay hello.\n",
  );
  await fs.writeFile(
    path.join(root, ".claude", "commands", "ck", "plan.md"),
    "---\ndescription: Plan work.\n---\n\nPlan the requested work.\n",
  );
  await fs.writeFile(
    path.join(root, ".claude", "agents", "reviewer.md"),
    "---\nname: reviewer\ndescription: Review code.\nmodel: sonnet\n---\n\nReview carefully.\n",
  );
  await fs.writeFile(path.join(root, ".claude", "hooks", "stop.py"), "print('ok')\n");
}

export const fixtureManifest: ToolkitManifest = {
  $schemaVersion: 1,
  name: "fixture",
  version: "1.0.0",
  sourceAgent: "claude",
  supportedAgents: ["claude", "codex"],
  components: [
    { id: "core", type: "config", paths: [".claude/settings.json", ".ck.json", "CLAUDE.md"], adapters: ["claude", "codex"] },
    { id: "skills", type: "skill", paths: [".claude/skills"], adapters: ["claude", "codex"] },
    { id: "commands", type: "command", paths: [".claude/commands"], adapters: ["claude", "codex"] },
    { id: "agents", type: "agent", paths: [".claude/agents"], adapters: ["claude", "codex"] },
    { id: "hooks", type: "hook", paths: [".claude/hooks"], adapters: ["claude", "codex"] },
  ],
  bundles: {
    full: { description: "Full", components: ["core", "skills", "commands", "agents", "hooks"] },
  },
};
