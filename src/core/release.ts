import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import semver from "semver";
import { exists } from "./files.js";

const execFileAsync = promisify(execFile);

export interface ResolvedSource {
  root: string;
  release: string;
  commit: string | null;
  cleanup(): Promise<void>;
}

export async function resolveSource(
  repositoryRoot: string,
  requested?: string,
): Promise<ResolvedSource> {
  if (!requested || requested === "current") {
    return {
      root: repositoryRoot,
      release: "current",
      commit: await currentCommit(repositoryRoot),
      cleanup: async () => {},
    };
  }

  const tag = requested.startsWith("v") ? requested : `v${requested}`;
  if (!semver.valid(tag.slice(1))) throw new Error(`Invalid release version: ${requested}`);
  await execFileAsync("git", ["rev-parse", "--verify", `refs/tags/${tag}`], { cwd: repositoryRoot });
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "forge-release-"));
  const archive = path.join(tempRoot, "release.tar");
  await execFileAsync("git", ["archive", "--format=tar", "-o", archive, tag], { cwd: repositoryRoot });
  await execFileAsync("tar", ["-xf", archive, "-C", tempRoot]);
  await fs.rm(archive, { force: true });
  const { stdout } = await execFileAsync("git", ["rev-list", "-n", "1", tag], { cwd: repositoryRoot });
  return {
    root: tempRoot,
    release: tag,
    commit: stdout.trim(),
    cleanup: () => fs.rm(tempRoot, { recursive: true, force: true }),
  };
}

export async function resolvePackageSource(
  packageName: string,
  requested: string,
): Promise<ResolvedSource> {
  const version = requested === "latest" ? await latestPackageVersion(packageName) : normalizeVersion(requested);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "forge-package-"));
  const { stdout } = await execNpm(
    ["pack", `${packageName}@${version}`, "--silent", "--pack-destination", tempRoot],
    { cwd: tempRoot },
  );
  const archive = path.join(tempRoot, stdout.trim().split(/\r?\n/).at(-1)!);
  await execFileAsync("tar", ["-xzf", archive, "-C", tempRoot]);
  await fs.rm(archive, { force: true });
  return {
    root: path.join(tempRoot, "package"),
    release: `v${version}`,
    commit: null,
    cleanup: () => fs.rm(tempRoot, { recursive: true, force: true }),
  };
}

export async function latestPackageVersion(packageName: string): Promise<string> {
  const { stdout } = await execNpm(["view", packageName, "version", "--json"]);
  const version = JSON.parse(stdout) as string;
  if (!semver.valid(version)) throw new Error(`Registry returned an invalid version: ${version}`);
  return version;
}

export async function latestTag(repositoryRoot: string): Promise<string | null> {
  if (!(await exists(path.join(repositoryRoot, ".git")))) return null;
  const { stdout } = await execFileAsync(
    "git",
    ["tag", "--list", "v*", "--sort=-v:refname"],
    { cwd: repositoryRoot },
  );
  return stdout.split(/\r?\n/).find((tag) => semver.valid(tag.slice(1))) ?? null;
}

async function currentCommit(repositoryRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot });
    return stdout.trim();
  } catch {
    return null;
  }
}

function normalizeVersion(value: string): string {
  const version = value.replace(/^v/, "");
  if (!semver.valid(version)) throw new Error(`Invalid release version: ${value}`);
  return version;
}

function execNpm(
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  const execOptions = { ...options, encoding: "utf8" as const };
  if (process.platform === "win32") {
    return execFileAsync("cmd.exe", ["/d", "/s", "/c", "npm.cmd", ...args], execOptions) as Promise<{
      stdout: string;
      stderr: string;
    }>;
  }
  return execFileAsync("npm", args, execOptions) as Promise<{ stdout: string; stderr: string }>;
}
