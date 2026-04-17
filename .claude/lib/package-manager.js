/**
 * Package Manager Detection and Selection
 * Automatically detects the preferred package manager or lets user choose
 *
 * Supports: npm, pnpm, yarn, bun
 */

const fs = require("fs");
const path = require("path");
const { getClaudeDir, readFile } = require("./utils");

// Package manager definitions
const PACKAGE_MANAGERS = {
  npm: {
    name: "npm",
    lockFile: "package-lock.json",
    installCmd: "npm install",
    runCmd: "npm run",
    execCmd: "npx",
    testCmd: "npm test",
    buildCmd: "npm run build",
    devCmd: "npm run dev",
  },
  pnpm: {
    name: "pnpm",
    lockFile: "pnpm-lock.yaml",
    installCmd: "pnpm install",
    runCmd: "pnpm",
    execCmd: "pnpm dlx",
    testCmd: "pnpm test",
    buildCmd: "pnpm build",
    devCmd: "pnpm dev",
  },
  yarn: {
    name: "yarn",
    lockFile: "yarn.lock",
    installCmd: "yarn",
    runCmd: "yarn",
    execCmd: "yarn dlx",
    testCmd: "yarn test",
    buildCmd: "yarn build",
    devCmd: "yarn dev",
  },
  bun: {
    name: "bun",
    lockFile: "bun.lockb",
    installCmd: "bun install",
    runCmd: "bun run",
    execCmd: "bunx",
    testCmd: "bun test",
    buildCmd: "bun run build",
    devCmd: "bun run dev",
  },
};

// Priority order for detection
const DETECTION_PRIORITY = ["pnpm", "bun", "yarn", "npm"];

// Config file path
function getConfigPath() {
  return path.join(getClaudeDir(), "package-manager.json");
}

/**
 * Load saved package manager configuration
 */
function loadConfig() {
  const configPath = getConfigPath();
  const content = readFile(configPath);

  if (content) {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Detect package manager from lock file in project directory
 */
function detectFromLockFile(projectDir = process.cwd()) {
  for (const pmName of DETECTION_PRIORITY) {
    const pm = PACKAGE_MANAGERS[pmName];
    const lockFilePath = path.join(projectDir, pm.lockFile);

    if (fs.existsSync(lockFilePath)) {
      return pmName;
    }
  }
  return null;
}

/**
 * Detect package manager from package.json packageManager field
 */
function detectFromPackageJson(projectDir = process.cwd()) {
  const packageJsonPath = path.join(projectDir, "package.json");
  const content = readFile(packageJsonPath);

  if (content) {
    try {
      const pkg = JSON.parse(content);
      if (pkg.packageManager) {
        // Format: "pnpm@8.6.0" or just "pnpm"
        const pmName = pkg.packageManager.split("@")[0];
        if (PACKAGE_MANAGERS[pmName]) {
          return pmName;
        }
      }
    } catch {
      // Invalid package.json
    }
  }
  return null;
}

/**
 * Get the package manager to use for current project
 *
 * Detection priority:
 * 1. Environment variable CLAUDE_PACKAGE_MANAGER
 * 2. Project-specific config (in .claude/package-manager.json)
 * 3. package.json packageManager field
 * 4. Lock file detection
 * 5. Global user preference (in ~/.claude/package-manager.json)
 * 6. Default to npm (no child processes spawned)
 *
 * @param {object} options - Options
 * @param {string} options.projectDir - Project directory to detect from (default: cwd)
 * @returns {object} - { name, config, source }
 */
function getPackageManager(options = {}) {
  const { projectDir = process.cwd() } = options;

  // 1. Check environment variable
  const envPm = process.env.CLAUDE_PACKAGE_MANAGER;
  if (envPm && PACKAGE_MANAGERS[envPm]) {
    return {
      name: envPm,
      config: PACKAGE_MANAGERS[envPm],
      source: "environment",
    };
  }

  // 2. Check project-specific config
  const projectConfigPath = path.join(
    projectDir,
    ".claude",
    "package-manager.json",
  );
  const projectConfig = readFile(projectConfigPath);
  if (projectConfig) {
    try {
      const config = JSON.parse(projectConfig);
      if (config.packageManager && PACKAGE_MANAGERS[config.packageManager]) {
        return {
          name: config.packageManager,
          config: PACKAGE_MANAGERS[config.packageManager],
          source: "project-config",
        };
      }
    } catch {
      // Invalid config
    }
  }

  // 3. Check package.json packageManager field
  const fromPackageJson = detectFromPackageJson(projectDir);
  if (fromPackageJson) {
    return {
      name: fromPackageJson,
      config: PACKAGE_MANAGERS[fromPackageJson],
      source: "package.json",
    };
  }

  // 4. Check lock file
  const fromLockFile = detectFromLockFile(projectDir);
  if (fromLockFile) {
    return {
      name: fromLockFile,
      config: PACKAGE_MANAGERS[fromLockFile],
      source: "lock-file",
    };
  }

  // 5. Check global user preference
  const globalConfig = loadConfig();
  if (
    globalConfig &&
    globalConfig.packageManager &&
    PACKAGE_MANAGERS[globalConfig.packageManager]
  ) {
    return {
      name: globalConfig.packageManager,
      config: PACKAGE_MANAGERS[globalConfig.packageManager],
      source: "global-config",
    };
  }

  // 6. Default to npm (always available with Node.js)
  // NOTE: Previously this called getAvailablePackageManagers() which spawns
  // child processes (where.exe/which) for each PM. This caused plugin freezes
  // on Windows (see #162) because session-start hooks run during Bun init,
  // and the spawned processes exceed Bun's spawn limit.
  // Steps 1-5 already cover all config-based and file-based detection.
  // If none matched, npm is the safe default.
  return {
    name: "npm",
    config: PACKAGE_MANAGERS.npm,
    source: "default",
  };
}

/**
 * Interactive prompt for package manager selection
 * Returns a message for Claude to show to user
 *
 * NOTE: Does NOT spawn child processes to check availability.
 * Lists all supported PMs and shows how to configure preference.
 */
function getSelectionPrompt() {
  let message = "[PackageManager] No package manager preference detected.\n";
  message +=
    "Supported package managers: " +
    Object.keys(PACKAGE_MANAGERS).join(", ") +
    "\n";
  message += "\nTo set your preferred package manager:\n";
  message += "  - Global: Set CLAUDE_PACKAGE_MANAGER environment variable\n";
  message +=
    '  - Or add to ~/.claude/package-manager.json: {"packageManager": "pnpm"}\n';
  message += '  - Or add to package.json: {"packageManager": "pnpm@8"}\n';
  message += "  - Or add a lock file to your project (e.g., pnpm-lock.yaml)\n";

  return message;
}

module.exports = {
  getPackageManager,
  getSelectionPrompt,
};
