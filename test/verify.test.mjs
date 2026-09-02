import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createEvidenceReceipt,
  verifyEvidenceReceipt,
} from "../src/core/receipt.mjs";
import {
  initializeStore,
  saveCheckpoint,
  storePaths,
} from "../src/core/store.mjs";
import { runVerify } from "../src/verify.mjs";
import {
  createRepository,
  git,
  memoryStream,
} from "../test-support/helpers.mjs";

function checkpointFixture(root, sessionId) {
  const head = git(root, ["rev-parse", "HEAD"]);
  const checkpoint = {
    schemaVersion: 2,
    id: "vt_verify_fixture",
    sessionId,
    status: "completed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    prompt: { text: "Change the button color", source: "manual-cli" },
    authorization: null,
    repository: { head },
    before: { commit: head },
    after: { commit: head },
    analysis: {
      files: [],
      summary: { filesChanged: 0, linesChanged: 0, modulesChanged: 0 },
      contractCompliance: {
        declared: false,
        status: "not-declared",
        violations: [],
      },
      blastRadius: { score: 0, level: "contained" },
      risk: { score: 0, level: "low", factors: [] },
    },
    visual: null,
  };
  checkpoint.receipt = createEvidenceReceipt(checkpoint);
  return checkpoint;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("receipt verification succeeds for unchanged evidence and fails after tampering", async () => {
  const root = await createRepository();
  const { config } = await initializeStore(root);
  const checkpoint = checkpointFixture(root, config.currentSessionId);
  await saveCheckpoint(root, checkpoint);

  assert.equal(verifyEvidenceReceipt(checkpoint).valid, true);

  const stdout = memoryStream();
  const stderr = memoryStream();
  assert.equal(
    await runVerify([checkpoint.id], { cwd: root, stdout, stderr }),
    0,
  );
  assert.match(stdout.value(), /verified/u);
  assert.equal(stderr.value(), "");

  const path = join(storePaths(root).checkpoints, `${checkpoint.id}.json`);
  const stored = JSON.parse(await readFile(path, "utf8"));
  stored.prompt.text = "Tampered prompt";
  await writeFile(path, `${JSON.stringify(stored, null, 2)}\n`, "utf8");

  const failedOut = memoryStream();
  assert.equal(
    await runVerify([checkpoint.id, "--json"], {
      cwd: root,
      stdout: failedOut,
      stderr: memoryStream(),
    }),
    2,
  );
  const result = JSON.parse(failedOut.value());
  assert.equal(result.valid, false);
  assert.equal(result.reason, "evidence-mismatch");
  assert.notEqual(result.receipt.expectedReceiptId, result.receipt.actualReceiptId);
});

test("verification reads visual files and rejects a replaced artifact", async () => {
  const root = await createRepository();
  const { config } = await initializeStore(root);
  const checkpoint = checkpointFixture(root, config.currentSessionId);
  checkpoint.id = "vt_visual_verify_fixture";

  const artifactDirectory = join(storePaths(root).artifacts, checkpoint.id);
  await mkdir(artifactDirectory, { recursive: true });
  const beforePath = join(artifactDirectory, "before.png");
  const afterPath = join(artifactDirectory, "after.png");
  const beforeBytes = Buffer.from("before-image-evidence");
  const afterBytes = Buffer.from("after-image-evidence");
  await writeFile(beforePath, beforeBytes);
  await writeFile(afterPath, afterBytes);

  checkpoint.visual = {
    before: {
      image: `.vibetrace/artifacts/${checkpoint.id}/before.png`,
      imageSha256: digest(beforeBytes),
      dom: { hash: "before-dom" },
    },
    after: {
      image: `.vibetrace/artifacts/${checkpoint.id}/after.png`,
      imageSha256: digest(afterBytes),
      dom: { hash: "after-dom" },
    },
  };
  checkpoint.receipt = createEvidenceReceipt(checkpoint);
  await saveCheckpoint(root, checkpoint);

  const verifiedOut = memoryStream();
  assert.equal(
    await runVerify([checkpoint.id, "--json"], {
      cwd: root,
      stdout: verifiedOut,
      stderr: memoryStream(),
    }),
    0,
  );
  const verified = JSON.parse(verifiedOut.value());
  assert.equal(verified.valid, true);
  assert.equal(verified.artifacts.length, 2);
  assert.ok(verified.artifacts.every((artifact) => artifact.status === "verified"));

  await writeFile(afterPath, Buffer.from("replaced-image-evidence"));

  const failedOut = memoryStream();
  assert.equal(
    await runVerify([checkpoint.id, "--json"], {
      cwd: root,
      stdout: failedOut,
      stderr: memoryStream(),
    }),
    2,
  );
  const failed = JSON.parse(failedOut.value());
  assert.equal(failed.valid, false);
  assert.equal(failed.reason, "artifact-mismatch");
  assert.equal(failed.artifacts.find((artifact) => artifact.phase === "after").status, "mismatch");
});
