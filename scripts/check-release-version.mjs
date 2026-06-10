import fs from "node:fs";
import process from "node:process";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("toolkit.manifest.json", "utf8"));
const input = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const tagVersion = input.replace(/^v/, "");

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tagVersion)) {
  throw new Error(`Expected a SemVer tag such as v2.0.0, received: ${input || "<empty>"}`);
}
if (packageJson.version !== tagVersion) {
  throw new Error(`package.json is ${packageJson.version}, but release tag is v${tagVersion}`);
}
if (manifest.version !== tagVersion) {
  throw new Error(`toolkit.manifest.json is ${manifest.version}, but release tag is v${tagVersion}`);
}

console.log(`Release version verified: v${tagVersion}`);
