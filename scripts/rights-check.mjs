import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const packageJson = await readJson(join(root, "package.json"));
const packageLock = await readJson(join(root, "package-lock.json"));

if (packageJson.private !== true) {
  fail(
    "package.json must remain private until the documented naming/distribution release blocker is deliberately resolved.",
  );
}
if (packageJson.license !== "MIT") {
  fail(`Unexpected repository package license: ${packageJson.license || "missing"}.`);
}

const requiredPackageFiles = ["LICENSE", "LEGAL.md", "THIRD_PARTY_NOTICES.md"];
for (const required of requiredPackageFiles) {
  if (!packageJson.files?.includes(required)) {
    fail(`npm package allowlist must include ${required}.`);
  }
}

const runtimeDependencies = Object.keys(packageJson.dependencies || {});
if (runtimeDependencies.length > 0) {
  fail(
    `Runtime dependencies require an explicit rights/release review before this gate is expanded: ${runtimeDependencies.join(", ")}.`,
  );
}

const allowedLicenses = new Set(["MIT", "Apache-2.0"]);
for (const [path, entry] of Object.entries(packageLock.packages || {})) {
  if (!path || !path.startsWith("node_modules/")) continue;
  if (!entry.license) {
    fail(`Dependency ${path} has no license metadata in package-lock.json.`);
    continue;
  }
  if (!allowedLicenses.has(entry.license)) {
    fail(
      `Dependency ${path} uses unreviewed license ${entry.license}; review it and update the rights baseline deliberately.`,
    );
  }
}

for (const required of [
  "LICENSE",
  "LEGAL.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/asset-provenance.md",
  "docs/release-readiness.md",
]) {
  try {
    await readFile(join(root, required));
  } catch {
    fail(`Required rights/provenance file is missing: ${required}.`);
  }
}

const html = await readFile(join(root, "web", "index.html"), "utf8");
const cssFiles = [
  "styles.css",
  "contract.css",
  "review.css",
];
const remoteAssetTag = /<(?:img|script|link)\b[^>]*(?:src|href)=["']https?:\/\//giu;
if (remoteAssetTag.test(html)) {
  fail(
    "web/index.html loads a remote image/script/stylesheet. Vendor or document third-party rights before allowing remote assets.",
  );
}
for (const name of cssFiles) {
  const css = await readFile(join(root, "web", name), "utf8");
  if (/url\(\s*["']?https?:\/\//iu.test(css)) {
    fail(`${name} loads a remote CSS asset; review provenance and redistribution/data-flow implications.`);
  }
}

const excludedDirectories = new Set([
  ".git",
  ".vibetrace",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const fontExtensions = new Set([".ttf", ".otf", ".woff", ".woff2", ".eot"]);

async function scanFonts(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanFonts(path);
      continue;
    }
    if (fontExtensions.has(extname(entry.name).toLowerCase())) {
      fail(
        `Bundled font requires an explicit redistribution review before merge: ${relative(root, path)}.`,
      );
    }
  }
}

await scanFonts(root);

if (failures.length > 0) {
  console.error("Rights/release gate failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exitCode = 1;
} else {
  console.log(
    "Rights/release gate passed: package remains private, dependency licenses match the reviewed baseline, required notices are packaged, and no unreviewed remote web assets or bundled fonts were found.",
  );
}
