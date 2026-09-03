import assert from "node:assert/strict";
import test from "node:test";
import {
  createEvidenceReceipt,
  EVIDENCE_RECEIPT_VERSION,
  verifyEvidenceReceipt,
} from "../src/core/receipt.mjs";
import {
  initializeStore,
  loadCheckpoint,
  saveCheckpoint,
} from "../src/core/store.mjs";
import { createRepository, git } from "../test-support/helpers.mjs";

function checkpointFixture() {
  return {
    schemaVersion: 2,
    id: "vt_receipt_v2_fixture",
    sessionId: "session_receipt_v2",
    status: "completed",
    createdAt: "2026-09-03T10:00:00.000Z",
    completedAt: "2026-09-03T10:01:00.000Z",
    prompt: { text: "Refine the checkout UI", source: "manual-cli" },
    authorization: {
      version: 1,
      mode: "explicit-user-authorization",
      allow: ["src/checkout/**"],
      deny: ["src/auth/**"],
      protectedSurfaces: ["auth"],
      maxFiles: 4,
      maxLines: 120,
      maxModules: 2,
    },
    repository: { head: "1111111111111111111111111111111111111111" },
    before: { commit: "2222222222222222222222222222222222222222" },
    after: { commit: "3333333333333333333333333333333333333333" },
    analysis: {
      files: [
        {
          path: "src/checkout/Summary.tsx",
          oldPath: null,
          status: "modified",
          additions: 8,
          deletions: 3,
          binary: false,
          category: "ui",
          module: "src/checkout",
          directory: "src/checkout",
          extension: ".tsx",
          signals: ["ui"],
        },
        {
          path: "src/checkout/styles.css",
          oldPath: null,
          status: "modified",
          additions: 4,
          deletions: 1,
          binary: false,
          category: "styles",
          module: "src/checkout",
          directory: "src/checkout",
          extension: ".css",
          signals: ["styles"],
        },
      ],
      intent: {
        expectedSignals: ["styles", "ui"],
        expectedScale: "small",
      },
      summary: {
        filesChanged: 2,
        linesChanged: 16,
        additions: 12,
        deletions: 4,
        modulesChanged: 1,
        directoriesChanged: 1,
        binaryFiles: 0,
      },
      contractCompliance: {
        declared: true,
        status: "compliant",
        violations: [],
      },
      blastRadius: {
        score: 20,
        level: "contained",
        intentMismatch: { detected: false },
        authorizationDrift: false,
      },
      risk: {
        score: 6,
        level: "low",
        model: "vibetrace-evidence-risk-v2",
        factors: [],
      },
      visual: {
        pixel: { differenceRatio: 0.02 },
        layout: { moved: 0, resized: 1 },
        dom: { added: 0, removed: 0, changed: 1 },
      },
    },
    visual: null,
  };
}

function withReceipt(checkpoint, version = EVIDENCE_RECEIPT_VERSION) {
  checkpoint.receipt = createEvidenceReceipt(checkpoint, { version });
  return checkpoint;
}

test("new receipts bind a normalized file-level effect manifest", () => {
  const checkpoint = withReceipt(checkpointFixture());
  assert.equal(checkpoint.receipt.evidence.version, 2);
  assert.equal(checkpoint.receipt.evidence.effect.fileManifest.length, 2);
  assert.match(
    checkpoint.receipt.evidence.effect.fileManifestSha256,
    /^[a-f0-9]{64}$/u,
  );

  const verified = verifyEvidenceReceipt(checkpoint);
  assert.equal(verified.valid, true);
  assert.equal(verified.coverage.evidenceVersion, 2);
  assert.equal(verified.coverage.fileManifestBound, true);
  assert.equal(verified.coverage.intentAnalysisBound, true);
  assert.equal(verified.coverage.visualAnalysisBound, true);

  checkpoint.analysis.files[0].path = "src/auth/session.ts";
  const tampered = verifyEvidenceReceipt(checkpoint);
  assert.equal(tampered.valid, false);
  assert.equal(tampered.reason, "evidence-mismatch");
});

test("receipt v2 normalizes file and signal ordering without weakening content binding", () => {
  const first = checkpointFixture();
  first.analysis.files[0].signals = ["ui", "styles"];
  const second = structuredClone(first);
  second.analysis.files.reverse();
  second.analysis.files[1].signals.reverse();

  const firstReceipt = createEvidenceReceipt(first);
  const secondReceipt = createEvidenceReceipt(second);
  assert.equal(firstReceipt.receiptId, secondReceipt.receiptId);
  assert.deepEqual(
    firstReceipt.evidence.effect.fileManifest,
    secondReceipt.evidence.effect.fileManifest,
  );
});

test("receipt v2 binds inferred intent and visual analysis separately from top-level captures", () => {
  const checkpoint = withReceipt(checkpointFixture());

  checkpoint.analysis.intent.expectedScale = "large";
  assert.equal(verifyEvidenceReceipt(checkpoint).valid, false);

  const visualTamper = withReceipt(checkpointFixture());
  visualTamper.analysis.visual.pixel.differenceRatio = 0.9;
  assert.equal(verifyEvidenceReceipt(visualTamper).valid, false);
});

test("legacy v1 receipts still verify with explicit reduced coverage", () => {
  const checkpoint = withReceipt(checkpointFixture(), 1);
  const originalId = checkpoint.receipt.receiptId;
  const verified = verifyEvidenceReceipt(checkpoint);

  assert.equal(verified.valid, true);
  assert.equal(verified.coverage.scope, "legacy-v1");
  assert.equal(verified.coverage.fileManifestBound, false);
  assert.equal(verified.coverage.intentAnalysisBound, false);
  assert.equal(verified.coverage.visualAnalysisBound, false);

  checkpoint.analysis.files[0].path = "src/auth/session.ts";
  const legacyScope = verifyEvidenceReceipt(checkpoint);
  assert.equal(legacyScope.valid, true);
  assert.equal(legacyScope.actualReceiptId, originalId);
  assert.equal(legacyScope.coverage.fileManifestBound, false);
});

test("saving a legacy checkpoint preserves its receipt version and identifier", async () => {
  const root = await createRepository();
  const { config } = await initializeStore(root);
  const head = git(root, ["rev-parse", "HEAD"]);
  const checkpoint = checkpointFixture();
  checkpoint.id = "vt_legacy_receipt_resave";
  checkpoint.sessionId = config.currentSessionId;
  checkpoint.repository.head = head;
  checkpoint.before.commit = head;
  checkpoint.after.commit = head;
  checkpoint.analysis.files = [];
  checkpoint.analysis.summary = {
    filesChanged: 0,
    linesChanged: 0,
    additions: 0,
    deletions: 0,
    modulesChanged: 0,
    directoriesChanged: 0,
    binaryFiles: 0,
  };
  checkpoint.receipt = createEvidenceReceipt(checkpoint, { version: 1 });
  const legacyId = checkpoint.receipt.receiptId;

  await saveCheckpoint(root, checkpoint);
  const loaded = await loadCheckpoint(root, checkpoint.id);
  assert.equal(loaded.receipt.evidence.version, 1);
  assert.equal(loaded.receipt.receiptId, legacyId);
  assert.equal(verifyEvidenceReceipt(loaded).valid, true);
});

test("unsupported evidence versions fail explicitly instead of being reinterpreted", () => {
  const checkpoint = withReceipt(checkpointFixture());
  checkpoint.receipt.evidence.version = 99;
  const verification = verifyEvidenceReceipt(checkpoint);
  assert.equal(verification.valid, false);
  assert.equal(verification.reason, "unsupported-evidence-version");
  assert.equal(verification.coverage, null);
});
