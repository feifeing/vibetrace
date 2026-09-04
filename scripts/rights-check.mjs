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

async function readText(path) {
  return readFile(join(root, path), "utf8");
}

const packageJson = await readJson(join(root, "package.json"));
const packageLock = await readJson(join(root, "package-lock.json"));

if (packageJson.name !== "patchoath") {
  fail(
    `Unexpected package name: ${packageJson.name || "missing"}; expected patchoath.`,
  );
}
if (packageJson.version !== packageLock.version) {
  fail(
    `package.json and package-lock.json versions differ (${packageJson.version} vs ${packageLock.version}).`,
  );
}
if (
  packageLock.name !== "patchoath" ||
  packageLock.packages?.[""]?.name !== "patchoath"
) {
  fail("package-lock.json root package metadata must use the PatchOath package name.");
}
if (packageJson.bin?.patchoath !== "./bin/patchoath.mjs") {
  fail("The primary package CLI must be patchoath -> ./bin/patchoath.mjs.");
}
if (packageJson.bin?.vibetrace !== "./bin/vibetrace.mjs") {
  fail(
    "The temporary legacy vibetrace CLI compatibility shim must remain explicit until its deprecation window is closed.",
  );
}
if (packageJson.private !== true) {
  fail(
    "package.json must remain private until the explicit public-package release decision is made after the PatchOath migration and final rights review.",
  );
}
if (packageJson.license !== "MIT") {
  fail(
    `Unexpected repository package license: ${packageJson.license || "missing"}.`,
  );
}
if (!String(packageJson.description || "").includes("PatchOath") && false) {
  // The npm `description` intentionally describes the product without repeating
  // its package name. Keep this branch as documentation that name repetition is
  // not a release requirement.
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
  "docs/brand-clearance.md",
  "docs/patchoath-mark.svg",
  "docs/release-readiness.md",
]) {
  try {
    await readFile(join(root, required));
  } catch {
    fail(`Required rights/provenance file is missing: ${required}.`);
  }
}

// Public product surfaces must not drift back to the retired working brand.
// Historical/legal/migration records are deliberately excluded from this list.
for (const path of [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "THIRD_PARTY_NOTICES.md",
]) {
  const text = await readText(path);
  if (/\bVibeTrace\b/u.test(text)) {
    fail(`${path} contains the retired VibeTrace product name.`);
  }
  if (/\bvibetrace\s+(?:init|checkpoint|diff|attest|verify|restore|capsule|contract-delta|review|replay|session|report)\b/u.test(text)) {
    fail(`${path} contains a retired vibetrace CLI example.`);
  }
}

const readme = await readText("README.md");
if (!readme.includes("<h1 align=\"center\">PatchOath</h1>")) {
  fail("README hero must identify the product as PatchOath.");
}
if (!readme.includes("docs/patchoath-mark.svg")) {
  fail("README hero must use the reviewed PatchOath mark.");
}

const webDirectory = join(root, "web");
const html = await readFile(join(webDirectory, "index.html"), "utf8");
const cssFiles = (await readdir(webDirectory))
  .filter((name) => name.endsWith(".css"))
  .sort();
const jsFiles = (await readdir(webDirectory))
  .filter((name) => name.endsWith(".js"))
  .sort();

if (!html.includes("<title>PatchOath —")) {
  fail("web/index.html must expose the PatchOath product title.");
}
if (/\bVibeTrace\b/u.test(html)) {
  fail("web/index.html contains the retired VibeTrace product name.");
}
if (/\bvibetrace\s+/u.test(html)) {
  fail("web/index.html contains a retired vibetrace CLI example.");
}

for (const name of jsFiles) {
  const text = await readFile(join(webDirectory, name), "utf8");
  if (/\bVibeTrace\b/u.test(text)) {
    fail(`${name} contains the retired VibeTrace product name in dashboard code.`);
  }
  if (/['"`]vibetrace\s+(?:init|checkpoint|diff|attest|verify|restore|capsule|contract-delta|review|replay|session|report)\b/u.test(text)) {
    fail(`${name} contains a retired vibetrace CLI command string.`);
  }
}

const remoteAssetTag =
  /<(?:img|script|link)\b[^>]*(?:src|href)=["']https?:\/\//giu;
if (remoteAssetTag.test(html)) {
  fail(
    "web/index.html loads a remote image/script/stylesheet. Vendor or document third-party rights before allowing remote assets.",
  );
}
if (cssFiles.length === 0) {
  fail(
    "No dashboard stylesheet was found under web/; rights scan is incomplete.",
  );
}
for (const name of cssFiles) {
  const css = await readFile(join(webDirectory, name), "utf8");
  if (/url\(\s*["']?https?:\/\//iu.test(css)) {
    fail(
      `${name} loads a remote CSS asset; review provenance and redistribution/data-flow implications.`,
    );
  }
}

const excludedDirectories = new Set([
  ".git",
  ".patchoath",
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
    `Rights/release gate passed: PatchOath package/CLI metadata match the reviewed migration baseline, public product surfaces contain no retired-brand copy or CLI examples, package remains private, dependency licenses match the reviewed baseline, required notices and brand-clearance records are present, ${cssFiles.length} dashboard stylesheet(s) contain no unreviewed remote CSS assets, and no bundled fonts were found.`,
  );
}
