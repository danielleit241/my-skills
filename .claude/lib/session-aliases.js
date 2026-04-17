/**
 * Session Aliases Library for Claude Code
 * Manages session aliases stored in ~/.claude/session-aliases.json
 */

const fs = require("fs");
const path = require("path");

const { getClaudeDir, readFile, log } = require("./utils");

// Aliases file path
function getAliasesPath() {
  return path.join(getClaudeDir(), "session-aliases.json");
}

// Current alias storage format version
const ALIAS_VERSION = "1.0";

/**
 * Default aliases file structure
 */
function getDefaultAliases() {
  return {
    version: ALIAS_VERSION,
    aliases: {},
    metadata: {
      totalCount: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Load aliases from file
 * @returns {object} Aliases object
 */
function loadAliases() {
  const aliasesPath = getAliasesPath();

  if (!fs.existsSync(aliasesPath)) {
    return getDefaultAliases();
  }

  const content = readFile(aliasesPath);
  if (!content) {
    return getDefaultAliases();
  }

  try {
    const data = JSON.parse(content);

    // Validate structure
    if (!data.aliases || typeof data.aliases !== "object") {
      log("[Aliases] Invalid aliases file structure, resetting");
      return getDefaultAliases();
    }

    // Ensure version field
    if (!data.version) {
      data.version = ALIAS_VERSION;
    }

    // Ensure metadata
    if (!data.metadata) {
      data.metadata = {
        totalCount: Object.keys(data.aliases).length,
        lastUpdated: new Date().toISOString(),
      };
    }

    return data;
  } catch (err) {
    log(`[Aliases] Error parsing aliases file: ${err.message}`);
    return getDefaultAliases();
  }
}

/**
 * List all aliases
 * @param {object} options - Options object
 * @param {string} options.search - Filter aliases by name (partial match)
 * @param {number} options.limit - Maximum number of aliases to return
 * @returns {Array} Array of alias objects
 */
function listAliases(options = {}) {
  const { search = null, limit = null } = options;
  const data = loadAliases();

  let aliases = Object.entries(data.aliases).map(([name, info]) => ({
    name,
    sessionPath: info.sessionPath,
    createdAt: info.createdAt,
    updatedAt: info.updatedAt,
    title: info.title,
  }));

  // Sort by updated time (newest first)
  aliases.sort(
    (a, b) =>
      (new Date(b.updatedAt || b.createdAt || 0).getTime() || 0) -
      (new Date(a.updatedAt || a.createdAt || 0).getTime() || 0),
  );

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    aliases = aliases.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        (a.title && a.title.toLowerCase().includes(searchLower)),
    );
  }

  // Apply limit
  if (limit && limit > 0) {
    aliases = aliases.slice(0, limit);
  }

  return aliases;
}

module.exports = {
  listAliases,
};
