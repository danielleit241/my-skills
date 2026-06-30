import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const skillsRoot = path.join(root, ".claude", "skills");
const agentsRoot = path.join(root, ".claude", "agents");
const evalPath = path.join(root, "evals", "skills", "basic.json");

const errors = [];
const warnings = [];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

function isKebab(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function caseTypes(cases) {
  return new Set(cases.map((item) => item.type));
}

if (await exists(path.join(skillsRoot, "ck-code-review"))) {
  errors.push(
    ".claude/skills/ck-code-review must not exist; use .claude/skills/code-review only",
  );
}

const deprecatedSpecSkill = ["ck", "spec"].join("-");
if (await exists(path.join(skillsRoot, deprecatedSpecSkill))) {
  errors.push(
    `.claude/skills/${deprecatedSpecSkill} must not exist; ck-plan owns the Design Contract now`,
  );
}

if (await exists(path.join(agentsRoot, "scout.md"))) {
  errors.push(
    ".claude/agents/scout.md must not exist; scout is the ck-scout skill now",
  );
}

const removedHookScripts = [
  "artifact_fold.py",
  "build_check.py",
  "caveman_watch.py",
  "dev_rules_reminder.py",
  "privacy_block.py",
  "simplify_gate.py",
  "suggest_compact.py",
  "tool_counter.py",
];

const rulesRoot = path.join(root, ".claude", "rules");
if (await exists(rulesRoot)) {
  const ruleFiles = (await walk(rulesRoot)).filter(
    (file) => path.extname(file).toLowerCase() === ".md",
  );
  for (const file of ruleFiles) {
    errors.push(`${rel(file)} must not exist; project rules are user-owned config`);
  }
}

for (const script of removedHookScripts) {
  if (await exists(path.join(root, ".claude", "hooks", script))) {
    errors.push(`.claude/hooks/${script} must not exist; hook surface is consolidated`);
  }
}

const ckPath = path.join(root, ".ck.json");
if (await exists(ckPath)) {
  let ckConfig;
  try {
    ckConfig = JSON.parse(await fs.readFile(ckPath, "utf8"));
  } catch (error) {
    errors.push(`.ck.json: invalid JSON (${error.message})`);
  }
  if (ckConfig) {
    if (ckConfig.schemaVersion !== 2) {
      errors.push(".ck.json: schemaVersion must be 2");
    }
    for (const legacyKey of [
      "codingLevel",
      "compactDay",
      "memoryDay",
      "conversation",
      "spec",
      "cavemanMode",
      "privacyBlock",
      "simplify",
      "artifactFolding",
    ]) {
      if (Object.prototype.hasOwnProperty.call(ckConfig, legacyKey)) {
        errors.push(`.ck.json: legacy top-level key must not exist: ${legacyKey}`);
      }
    }
    if (ckConfig.hooks?.simplifyGate?.threshold?.sourceExtensions) {
      errors.push(".ck.json: hooks.simplifyGate.threshold.sourceExtensions is dead config");
    }
  }
}

const commandPath = path.join(
  root,
  ".claude",
  "commands",
  "ck",
  "code-review.md",
);
if (await exists(commandPath)) {
  const command = await fs.readFile(commandPath, "utf8");
  if (command.includes("Load the `ck:code-review` skill")) {
    errors.push(
      ".claude/commands/ck/code-review.md must load the code-review skill, not ck:code-review",
    );
  }
}

for (const required of ["ck-scout", "ck-ship", "code-review"]) {
  if (!(await exists(path.join(skillsRoot, required, "SKILL.md")))) {
    errors.push(`missing required skill: ${required}`);
  }
}

for (const requiredAgent of ["context-scout", "implementer", "task-reviewer"]) {
  if (!(await exists(path.join(agentsRoot, `${requiredAgent}.md`)))) {
    errors.push(`missing required agent: ${requiredAgent}`);
  }
}

const agentFiles = (await walk(agentsRoot)).filter(
  (file) => path.extname(file) === ".md",
);

for (const file of agentFiles) {
  const content = await fs.readFile(file, "utf8");
  for (const requiredSection of [
    "## When To Invoke",
    "## When Not To Invoke",
    "## Composition",
  ]) {
    if (!content.includes(requiredSection)) {
      errors.push(`${rel(file)}: missing agent section ${requiredSection}`);
    }
  }
}

const modeContracts = [
  {
    file: path.join(skillsRoot, "ck-brainstorm", "SKILL.md"),
    forbidden: ["plans/reports"],
  },
  {
    file: path.join(skillsRoot, "ck-plan", "SKILL.md"),
    forbidden: ["--two", "--parallel", "--no-tasks"],
  },
  {
    file: path.join(agentsRoot, "planner.md"),
    forbidden: ["plans/reports"],
  },
  {
    file: path.join(root, ".claude", "commands", "ck", "plan.md"),
    forbidden: ["--two", "--parallel", "--no-tasks"],
  },
  {
    file: path.join(skillsRoot, "ck-cook", "SKILL.md"),
    forbidden: ["--parallel", "--no-test", "--cook"],
  },
  {
    file: path.join(root, ".claude", "commands", "ck", "cook.md"),
    forbidden: ["--parallel", "--no-test"],
  },
  {
    file: path.join(skillsRoot, "ck-fix", "SKILL.md"),
    forbidden: ["--quick", "--review", "--parallel", "--fix", "plans/fixes", "evidence/fix-"],
  },
  {
    file: path.join(root, ".claude", "commands", "ck", "fix.md"),
    forbidden: ["--quick", "--review", "--parallel"],
  },
  {
    file: path.join(skillsRoot, "ck-ship", "SKILL.md"),
    forbidden: ["--quick"],
  },
  {
    file: path.join(root, ".claude", "commands", "ck", "ship.md"),
    forbidden: ["--quick"],
  },
  {
    file: path.join(skillsRoot, "ck-ship", "assets", "readiness-template.md"),
    forbidden: ["quick"],
  },
  {
    file: path.join(skillsRoot, "ck-scout", "SKILL.md"),
    forbidden: ["--cook", "--fix"],
  },
  {
    file: path.join(root, ".claude", "commands", "ck", "scout.md"),
    forbidden: ["--cook", "--fix"],
  },
  {
    file: path.join(root, "README.md"),
    forbidden: ["plans/reports", "plans/fixes", "artifactFolding", ...removedHookScripts],
  },
  {
    file: path.join(root, ".ck.json"),
    forbidden: ["artifactFolding"],
  },
  {
    file: path.join(root, ".claude", "settings.json"),
    forbidden: ["PostToolUse", "artifactFolding", ...removedHookScripts],
  },
  {
    file: evalPath,
    forbidden: ["plans/reports", "plans/fixes"],
  },
];

for (const contract of modeContracts) {
  if (!(await exists(contract.file))) continue;
  const content = await fs.readFile(contract.file, "utf8");
  for (const token of contract.forbidden) {
    if (content.includes(token)) {
      errors.push(
        `${rel(contract.file)}: forbidden old mode/flag remains: ${token}`,
      );
    }
  }
}

const skillFiles = (await walk(skillsRoot)).filter(
  (file) => path.basename(file) === "SKILL.md",
);
const topLevelSkills = new Set();

for (const file of skillFiles) {
  const content = await fs.readFile(file, "utf8");
  let parsed;
  try {
    parsed = matter(content);
  } catch (error) {
    errors.push(`${rel(file)}: invalid frontmatter (${error.message})`);
    continue;
  }

  const relativeParts = path
    .relative(skillsRoot, path.dirname(file))
    .split(path.sep);
  const name = parsed.data.name;
  const description = parsed.data.description;
  if (typeof name !== "string" || !name.trim()) {
    errors.push(`${rel(file)}: frontmatter requires name`);
  } else if (relativeParts.length === 1 && !isKebab(name)) {
    errors.push(`${rel(file)}: top-level skill name must be kebab-case`);
  } else if (relativeParts.length > 1 && !isKebab(name)) {
    warnings.push(`${rel(file)}: nested legacy skill name is not kebab-case`);
  }
  if (typeof description !== "string" || !description.trim()) {
    errors.push(`${rel(file)}: frontmatter requires description`);
  }
  if (!parsed.content.trim()) {
    errors.push(`${rel(file)}: body must not be empty`);
  }

  if (relativeParts.length === 1 && typeof name === "string") {
    topLevelSkills.add(name);
    if (relativeParts[0] !== name) {
      errors.push(
        `${rel(file)}: top-level folder name must match skill name (${name})`,
      );
    }
  }

  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > 500) {
    warnings.push(
      `${rel(file)}: ${lineCount} lines; consider moving detail to references/`,
    );
  }
}

let evalData;
try {
  evalData = JSON.parse(await fs.readFile(evalPath, "utf8"));
} catch (error) {
  errors.push(`${rel(evalPath)}: missing or invalid JSON (${error.message})`);
}

if (evalData) {
  if (evalData.schemaVersion !== 1) {
    errors.push(`${rel(evalPath)}: schemaVersion must be 1`);
  }
  if (!Array.isArray(evalData.evals)) {
    errors.push(`${rel(evalPath)}: evals must be an array`);
  } else {
    const evalBySkill = new Map();
    for (const entry of evalData.evals) {
      if (!entry || typeof entry !== "object") {
        errors.push(`${rel(evalPath)}: each eval entry must be an object`);
        continue;
      }
      if (typeof entry.skill !== "string" || !entry.skill) {
        errors.push(`${rel(evalPath)}: each eval entry needs skill`);
        continue;
      }
      if (!topLevelSkills.has(entry.skill)) {
        errors.push(
          `${rel(evalPath)}: eval references missing top-level skill ${entry.skill}`,
        );
      }
      if (!Array.isArray(entry.cases)) {
        errors.push(`${rel(evalPath)}: ${entry.skill} cases must be an array`);
        continue;
      }
      evalBySkill.set(entry.skill, entry.cases);
      const types = caseTypes(entry.cases);
      for (const requiredType of ["positive", "pressure", "negative"]) {
        if (!types.has(requiredType)) {
          errors.push(
            `${rel(evalPath)}: ${entry.skill} missing ${requiredType} case`,
          );
        }
      }
      for (const testCase of entry.cases) {
        for (const key of ["id", "type", "prompt"]) {
          if (typeof testCase[key] !== "string" || !testCase[key]) {
            errors.push(
              `${rel(evalPath)}: ${entry.skill} has case missing ${key}`,
            );
          }
        }
        if (
          !Array.isArray(testCase.expected_signals) ||
          testCase.expected_signals.length === 0
        ) {
          errors.push(
            `${rel(evalPath)}: ${entry.skill}/${testCase.id ?? "unknown"} needs expected_signals`,
          );
        }
      }
    }

    for (const skill of topLevelSkills) {
      if (!evalBySkill.has(skill)) {
        errors.push(
          `${rel(evalPath)}: missing eval coverage for top-level skill ${skill}`,
        );
      }
    }
  }
}

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`error: ${error}`);
  }
  process.exit(1);
}

console.log(
  `Validated ${skillFiles.length} skill files and ${topLevelSkills.size} top-level skill eval sets.`,
);
