import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
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
  assert.notEqual(result.expectedReceiptId, result.actualReceiptId);
});
