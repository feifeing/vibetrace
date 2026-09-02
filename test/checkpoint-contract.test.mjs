import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { createRepository } from "../test-support/helpers.mjs";

const cli = resolve("bin/vibetrace.mjs");

function run(root, args) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

test("two-phase checkpoints persist authorization and emit evidence receipts", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));

  run(root, ["init"]);
  run(root, [
    "checkpoint",
    "--prompt",
    "Change the button color",
    "--allow",
    "app.js",
    "--deny",
    "src/private/**",
    "--protect-surface",
    "auth",
    "--max-files",
    "1",
    "--max-lines",
    "20",
    "--max-modules",
    "1",
  ]);

  await writeFile(join(root, "app.js"), "export const value = 2;\n", "utf8");
  await mkdir(join(root, "src", "auth"), { recursive: true });
  await writeFile(
    join(root, "src", "auth", "session.js"),
    'export const session = "changed";\n',
    "utf8",
  );

  run(root, ["checkpoint", "--finish"]);

  const state = JSON.parse(
    await readFile(join(root, ".vibetrace", "state.json"), "utf8"),
  );
  assert.equal(state.activeCheckpointId, null);

  const names = await import("node:fs/promises").then(({ readdir }) =>
    readdir(join(root, ".vibetrace", "checkpoints")),
  );
  assert.equal(names.length, 1);
  const checkpoint = JSON.parse(
    await readFile(join(root, ".vibetrace", "checkpoints", names[0]), "utf8"),
  );

  assert.deepEqual(checkpoint.authorization.allow, ["app.js"]);
  assert.deepEqual(checkpoint.authorization.deny, ["src/private/**"]);
  assert.deepEqual(checkpoint.authorization.protectedSurfaces, ["auth"]);
  assert.equal(checkpoint.authorization.maxFiles, 1);
  assert.equal(checkpoint.authorization.maxModules, 1);
  assert.equal(checkpoint.analysis.contractCompliance.status, "violated");
  assert.deepEqual(checkpoint.analysis.contractCompliance.protectedSurfacesTouched, [
    "auth",
  ]);
  assert.equal(checkpoint.analysis.blastRadius.authorizationDrift, true);
  assert.match(checkpoint.receipt.receiptId, /^vtr_[a-f0-9]{24}$/u);
  assert.equal(
    checkpoint.receipt.evidence.authorization.contract.maxFiles,
    checkpoint.authorization.maxFiles,
  );
  assert.deepEqual(
    checkpoint.receipt.evidence.authorization.contract.protectedSurfaces,
    checkpoint.authorization.protectedSurfaces,
  );
});
