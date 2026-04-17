const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { getHomunculusDir, ensureDir, sanitizeSessionId } = require("./utils");

function getProjectsDir() {
  return path.join(getHomunculusDir(), "projects");
}

function getProjectRegistryPath() {
  return path.join(getHomunculusDir(), "projects.json");
}

function readProjectRegistry() {
  try {
    return JSON.parse(fs.readFileSync(getProjectRegistryPath(), "utf8"));
  } catch {
    return {};
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function stripRemoteCredentials(remoteUrl) {
  if (!remoteUrl) return "";
  return String(remoteUrl).replace(/:\/\/[^@]+@/, "://");
}

function resolveProjectRoot(cwd = process.cwd()) {
  const gitCommonDir = runGit(
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    cwd,
  );
  if (gitCommonDir) {
    const commonDir = path.resolve(gitCommonDir);
    if (commonDir.toLowerCase().endsWith(path.sep + ".git")) {
      return path.dirname(commonDir);
    }
  }

  const gitRoot = runGit(["rev-parse", "--show-toplevel"], cwd);
  if (gitRoot) return path.resolve(gitRoot);

  const envRoot = process.env.CLAUDE_PROJECT_DIR;
  if (envRoot && fs.existsSync(envRoot)) {
    return path.resolve(envRoot);
  }

  return "";
}

function computeProjectId(projectRoot) {
  const remoteUrl = stripRemoteCredentials(
    runGit(["remote", "get-url", "origin"], projectRoot),
  );
  return crypto
    .createHash("sha256")
    .update(remoteUrl || projectRoot)
    .digest("hex")
    .slice(0, 12);
}

function resolveProjectContext(cwd = process.cwd()) {
  const projectRoot = resolveProjectRoot(cwd);
  if (!projectRoot) {
    const projectDir = getHomunculusDir();
    ensureDir(projectDir);
    return { projectId: "global", projectRoot: "", projectDir, isGlobal: true };
  }

  const registry = readProjectRegistry();
  const registryEntry = Object.values(registry).find(
    (entry) => entry && path.resolve(entry.root || "") === projectRoot,
  );
  const projectId = registryEntry?.id || computeProjectId(projectRoot);
  const projectDir = path.join(getProjectsDir(), projectId);
  ensureDir(projectDir);

  return { projectId, projectRoot, projectDir, isGlobal: false };
}

function getSessionLeaseDir(context) {
  return path.join(context.projectDir, ".observer-sessions");
}

function resolveSessionId(rawSessionId = process.env.CLAUDE_SESSION_ID) {
  return sanitizeSessionId(rawSessionId || "") || "";
}

function getSessionLeaseFile(
  context,
  rawSessionId = process.env.CLAUDE_SESSION_ID,
) {
  const sessionId = resolveSessionId(rawSessionId);
  if (!sessionId) return "";
  return path.join(getSessionLeaseDir(context), `${sessionId}.json`);
}

function writeSessionLease(
  context,
  rawSessionId = process.env.CLAUDE_SESSION_ID,
  extra = {},
) {
  const leaseFile = getSessionLeaseFile(context, rawSessionId);
  if (!leaseFile) return "";

  ensureDir(getSessionLeaseDir(context));
  const payload = {
    sessionId: resolveSessionId(rawSessionId),
    cwd: process.cwd(),
    pid: process.pid,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(leaseFile, JSON.stringify(payload, null, 2) + "\n");
  return leaseFile;
}

module.exports = {
  resolveProjectContext,
  writeSessionLease,
  resolveSessionId,
};
