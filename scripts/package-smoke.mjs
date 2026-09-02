import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
const git = process.platform === "win32" ? "git.exe" : "git";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function runNpm(args, options = {}) {
  if (!npmCli) {
    throw new Error(
      "Package smoke requires npm_execpath from an npm-run context.",
    );
  }
  return run(process.execPath, [npmCli, ...args], options);
}

function runCli(cli, cwd, args) {
  return run(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: "1" },
  });
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "vibetrace-package-smoke-"));

try {
  const packDirectory = join(temporaryRoot, "pack");
  await mkdir(packDirectory, { recursive: true });
  const packOutput = JSON.parse(
    runNpm(["pack", "--json", "--pack-destination", packDirectory], {
      cwd: root,
    }),
  );
  assert.equal(
    packOutput.length,
    1,
    "npm pack should produce exactly one tarball",
  );

  const packed = packOutput[0];
  const paths = packed.files.map((file) => file.path);
  for (const required of [
    "package.json",
    "bin/vibetrace.mjs",
    "src/cli.mjs",
    "README.md",
    "LICENSE",
  ]) {
    assert.ok(paths.includes(required), `package is missing ${required}`);
  }
  for (const forbiddenPrefix of [
    ".github/",
    ".vibetrace/",
    "e2e/",
    "scripts/",
    "test/",
    "test-support/",
  ]) {
    assert.ok(
      !paths.some((path) => path.startsWith(forbiddenPrefix)),
      `package unexpectedly contains ${forbiddenPrefix}`,
    );
  }

  const tarball = join(packDirectory, packed.filename);
  const consumer = join(temporaryRoot, "consumer");
  await mkdir(consumer, { recursive: true });
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify(
      { name: "vibetrace-package-consumer", private: true },
      null,
      2,
    ),
    "utf8",
  );
  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    { cwd: consumer },
  );

  const installedRoot = join(consumer, "node_modules", "vibetrace");
  const cli = join(installedRoot, "bin", "vibetrace.mjs");
  assert.equal(runCli(cli, consumer, ["--version"]), "0.2.0");

  const project = join(consumer, "project");
  await mkdir(project, { recursive: true });
  run(git, ["init"], { cwd: project });
  run(git, ["config", "user.email", "package-smoke@example.invalid"], {
    cwd: project,
  });
  run(git, ["config", "user.name", "VibeTrace Package Smoke"], {
    cwd: project,
  });
  await writeFile(join(project, "app.js"), "export const value = 1;\n", "utf8");
  run(git, ["add", "app.js"], { cwd: project });
  run(git, ["commit", "-m", "initial"], { cwd: project });

  runCli(cli, project, ["init"]);
  runCli(cli, project, [
    "checkpoint",
    "--prompt",
    "Package smoke change",
    "--max-files",
    "1",
    "--max-modules",
    "1",
  ]);
  await writeFile(join(project, "app.js"), "export const value = 2;\n", "utf8");
  runCli(cli, project, ["checkpoint", "--finish"]);

  const verification = JSON.parse(runCli(cli, project, ["verify", "--json"]));
  assert.equal(
    verification.valid,
    true,
    "packed CLI should verify its checkpoint",
  );

  const preview = runCli(cli, project, ["restore", "--json"]);
  assert.equal(JSON.parse(preview).canApply, true);
  runCli(cli, project, ["restore", "--apply"]);
  assert.equal(
    await readFile(join(project, "app.js"), "utf8"),
    "export const value = 1;\n",
    "packed CLI should restore the checkpoint without dev dependencies",
  );

  console.log(
    `Package smoke passed: ${packed.filename} (${packed.size} bytes, ${paths.length} files)`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
