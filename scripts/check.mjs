import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".vibetrace",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const sourceExtensions = new Set([".js", ".mjs"]);
const jsonExtensions = new Set([".json"]);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}

await walk(root);
for (const path of files) {
  if (sourceExtensions.has(extname(path))) {
    execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
  }
  if (jsonExtensions.has(extname(path))) {
    JSON.parse(await readFile(path, "utf8"));
  }
}

const packageJson = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
if (packageJson.version !== "0.2.0")
  throw new Error("package.json version must match the v0.2 CLI.");
if (packageJson.bin?.vibetrace !== "./bin/vibetrace.mjs")
  throw new Error("The vibetrace bin entry is missing.");

console.log(
  `Checked ${files.length} files: JavaScript syntax and JSON are valid.`,
);
