/**
 * Cross-platform utility functions for Claude Code hooks and scripts
 * Works on Windows, macOS, and Linux
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execSync } = require("child_process");

const SESSION_DATA_DIR_NAME = "session-data";
const LEGACY_SESSIONS_DIR_NAME = "sessions";
const WINDOWS_RESERVED_SESSION_IDS = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/**
 * Get the user's home directory (cross-platform)
 */
function getHomeDir() {
  const explicitHome = process.env.HOME || process.env.USERPROFILE;
  if (explicitHome && explicitHome.trim().length > 0) {
    return path.resolve(explicitHome);
  }
  return os.homedir();
}

/**
 * Get the Claude config directory
 */
function getClaudeDir() {
  return path.join(getHomeDir(), ".claude");
}

/**
 * Get the homunculus data directory.
 * In a git project/worktree, store under main repository root.
 */
function getHomunculusDir() {
  const projectRoot = getProjectRoot();
  if (projectRoot) {
    return path.join(projectRoot, ".claude", "projects", "homunculus");
  }

  return path.join(getClaudeDir(), "homunculus");
}

/**
 * Resolve current project root if available.
 * Priority:
 * 1. git common-dir parent (main repo root, stable for worktrees)
 * 2. git repo root from current working directory
 * 3. CLAUDE_PROJECT_DIR env var fallback
 */
function getProjectRoot() {
  const gitCommonDir = runCommand(
    "git rev-parse --path-format=absolute --git-common-dir",
  );
  if (gitCommonDir.success && gitCommonDir.output) {
    const commonDir = path.resolve(gitCommonDir.output);
    const lowerCommonDir = commonDir.toLowerCase();
    const marker = `${path.sep}.git`;
    const markerIndex = lowerCommonDir.lastIndexOf(marker);
    if (markerIndex > 0) {
      return commonDir.slice(0, markerIndex);
    }
  }

  const gitRoot = runCommand("git rev-parse --show-toplevel");
  if (gitRoot.success && gitRoot.output) {
    return path.resolve(gitRoot.output);
  }

  const envProjectDir = process.env.CLAUDE_PROJECT_DIR;
  if (envProjectDir && envProjectDir.trim().length > 0) {
    const resolved = path.resolve(envProjectDir);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

/**
 * Get the sessions directory
 */
function getSessionsDir() {
  const projectRoot = getProjectRoot();
  if (projectRoot) {
    return path.join(projectRoot, ".claude", SESSION_DATA_DIR_NAME);
  }

  return path.join(getClaudeDir(), SESSION_DATA_DIR_NAME);
}

/**
 * Get the legacy sessions directory used by older ECC installs
 */
function getLegacySessionsDir() {
  return path.join(getClaudeDir(), LEGACY_SESSIONS_DIR_NAME);
}

/**
 * Get all session directories to search, in canonical-first order
 */
function getSessionSearchDirs() {
  const projectRoot = getProjectRoot();
  if (projectRoot) {
    return [path.join(projectRoot, ".claude", SESSION_DATA_DIR_NAME)];
  }

  return Array.from(
    new Set([
      path.join(getClaudeDir(), SESSION_DATA_DIR_NAME),
      getLegacySessionsDir(),
    ]),
  );
}

/**
 * Get the learned skills directory
 */
function getLearnedSkillsDir() {
  return path.join(getClaudeDir(), "skills", "learned");
}

/**
 * Ensure a directory exists (create if not)
 * @param {string} dirPath - Directory path to create
 * @returns {string} The directory path
 * @throws {Error} If directory cannot be created (e.g., permission denied)
 */
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    // EEXIST is fine (race condition with another process creating it)
    if (err.code !== "EEXIST") {
      throw new Error(
        `Failed to create directory '${dirPath}': ${err.message}`,
      );
    }
  }
  return dirPath;
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:MM format
 */
function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get current datetime in YYYY-MM-DD HH:MM:SS format
 */
function getDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get the git repository name
 */
function getGitRepoName() {
  const result = runCommand("git rev-parse --show-toplevel");
  if (!result.success) return null;
  return path.basename(result.output);
}

/**
 * Get project name from git repo or current directory
 */
function getProjectName() {
  const repoName = getGitRepoName();
  if (repoName) return repoName;
  return path.basename(process.cwd()) || null;
}

/**
 * Sanitize a string for use as a session filename segment.
 * Replaces invalid characters with hyphens, collapses runs, strips
 * leading/trailing hyphens, and removes leading dots so hidden-dir names
 * like ".claude" map cleanly to "claude".
 *
 * Pure non-ASCII inputs get a stable 8-char hash so distinct names do not
 * collapse to the same fallback session id. Mixed-script inputs retain their
 * ASCII part and gain a short hash suffix for disambiguation.
 */
function sanitizeSessionId(raw) {
  if (!raw || typeof raw !== "string") return null;

  const hasNonAscii = Array.from(raw).some(
    (char) => char.codePointAt(0) > 0x7f,
  );
  const normalized = raw.replace(/^\.+/, "");
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (sanitized.length > 0) {
    const suffix = crypto
      .createHash("sha256")
      .update(normalized)
      .digest("hex")
      .slice(0, 6);
    if (WINDOWS_RESERVED_SESSION_IDS.has(sanitized.toUpperCase())) {
      return `${sanitized}-${suffix}`;
    }
    if (!hasNonAscii) return sanitized;
    return `${sanitized}-${suffix}`;
  }

  const meaningful = normalized.replace(/[\s\p{P}]/gu, "");
  if (meaningful.length === 0) return null;

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Get short session ID from CLAUDE_SESSION_ID environment variable
 * Returns last 8 characters, falls back to a sanitized project name then 'default'.
 */
function getSessionIdShort(fallback = "default") {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId && sessionId.length > 0) {
    const sanitized = sanitizeSessionId(sessionId.slice(-8));
    if (sanitized) return sanitized;
  }
  return (
    sanitizeSessionId(getProjectName()) ||
    sanitizeSessionId(fallback) ||
    "default"
  );
}

/**
 * Find files matching a pattern in a directory (cross-platform alternative to find)
 * @param {string} dir - Directory to search
 * @param {string} pattern - File pattern (e.g., "*.tmp", "*.md")
 * @param {object} options - Options { maxAge: days, recursive: boolean }
 */
function findFiles(dir, pattern, options = {}) {
  if (!dir || typeof dir !== "string") return [];
  if (!pattern || typeof pattern !== "string") return [];

  const { maxAge = null, recursive = false } = options;
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  // Escape all regex special characters, then convert glob wildcards.
  // Order matters: escape specials first, then convert * and ? to regex equivalents.
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`);

  function searchDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isFile() && regex.test(entry.name)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue; // File deleted between readdir and stat
          }

          if (maxAge !== null) {
            const ageInDays =
              (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageInDays <= maxAge) {
              results.push({ path: fullPath, mtime: stats.mtimeMs });
            }
          } else {
            results.push({ path: fullPath, mtime: stats.mtimeMs });
          }
        } else if (entry.isDirectory() && recursive) {
          searchDir(fullPath);
        }
      }
    } catch (_err) {
      // Ignore permission errors
    }
  }

  searchDir(dir);

  // Sort by modification time (newest first)
  results.sort((a, b) => b.mtime - a.mtime);

  return results;
}

/**
 * Log to stderr (visible to user in Claude Code)
 */
function log(message) {
  console.error(message);
}

/**
 * Read a text file safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Write a text file
 */
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Append to a text file
 */
function appendFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, "utf8");
}

/**
 * Run a command and return output
 *
 * SECURITY NOTE: This function executes shell commands. Only use with
 * trusted, hardcoded commands. Never pass user-controlled input directly.
 * For user input, use spawnSync with argument arrays instead.
 *
 * @param {string} cmd - Command to execute (should be trusted/hardcoded)
 * @param {object} options - execSync options
 */
function runCommand(cmd, options = {}) {
  // Allowlist: only permit known-safe command prefixes
  const allowedPrefixes = ["git ", "node ", "npx ", "which ", "where "];
  if (!allowedPrefixes.some((prefix) => cmd.startsWith(prefix))) {
    return {
      success: false,
      output: "runCommand blocked: unrecognized command prefix",
    };
  }

  // Reject shell metacharacters. $() and backticks are evaluated inside
  // double quotes, so block $ and ` anywhere in cmd. Other operators
  // (;|&) are literal inside quotes, so only check unquoted portions.
  const unquoted = cmd.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
  if (/[;|&\n]/.test(unquoted) || /[`$]/.test(cmd)) {
    return {
      success: false,
      output: "runCommand blocked: shell metacharacters not allowed",
    };
  }

  try {
    const result = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

/**
 * Strip all ANSI escape sequences from a string.
 *
 * Handles:
 * - CSI sequences: \x1b[ … <letter>  (colors, cursor movement, erase, etc.)
 * - OSC sequences: \x1b] … BEL/ST    (window titles, hyperlinks)
 * - Charset selection: \x1b(B
 * - Bare ESC + single letter: \x1b <letter>  (e.g. \x1bM for reverse index)
 *
 * @param {string} str - Input string possibly containing ANSI codes
 * @returns {string} Cleaned string with all escape sequences removed
 */
function stripAnsi(str) {
  if (typeof str !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return str.replace(
    /\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\([A-Z]|[A-Z])/g,
    "",
  );
}

module.exports = {
  // Directories
  getHomeDir,
  getClaudeDir,
  getHomunculusDir,
  getProjectRoot,
  getSessionsDir,
  getLegacySessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  ensureDir,

  // Date/Time
  getDateString,
  getTimeString,
  getDateTimeString,

  // Session/Project
  sanitizeSessionId,
  getSessionIdShort,
  getGitRepoName,
  getProjectName,

  // File operations
  findFiles,
  readFile,
  writeFile,
  appendFile,

  // String sanitisation
  stripAnsi,

  log,
  runCommand,
};
