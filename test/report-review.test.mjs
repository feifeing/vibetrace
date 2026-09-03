import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { createEvidenceReceipt } from "../src/core/receipt.mjs";
import { generateReport } from "../src/report/generate.mjs";
import { createRepository, git } from "../test-support/helpers.mjs";

function analysisFixture() {
  return {
    files: [],
    summary: {
      filesChanged: 2,
      linesChanged: 2,
      additions: 2,
      deletions: 0,
      modulesChanged: 2,
      directoriesChanged: 2,
      binaryFiles: 0,
    },
    contractCompliance: {
      declared: true,
      status: "violated",
      violations: [
        {
          id: "outside-authorized-scope",
          detail: "One file fell outside the declared allow scope.",
        },
      ],
    },
    blastRadius: {
      score: 34,
      level: "expanded",
      intentMismatch: { detected: false },
      authorizationDrift: true,
    },
    risk: {
      score: 19,
      level: "low",
      model: "vibetrace-evidence-risk-v2",
      factors: [],
    },
    visual: null,
  };
}

async function checkpointFixture() {
  const root = await createRepository();
  const before = git(root, ["rev-parse", "HEAD"]);
  await mkdir(join(root, "src", "ui"), { recursive: true });
  await mkdir(join(root, "src", "shared"), { recursive: true });
  await writeFile(
    join(root, "src", "ui", "button.js"),
    "export const button = 1;\n",
    "utf8",
  );
  await writeFile(
    join(root, "src", "shared", "helper.js"),
    "export const helper = 1;\n",
    "utf8",
  );
  git(root, ["add", "src"]);
  git(root, ["commit", "-m", "observed review effect"]);
  const after = git(root, ["rev-parse", "HEAD"]);

  const checkpoint = {
    schemaVersion: 2,
    id: "vt_report_review_fixture",
    sessionId: "session_report_review",
    status: "completed",
    createdAt: "2026-09-03T09:00:00.000Z",
    completedAt: "2026-09-03T09:01:00.000Z",
    prompt: {
      text: "Adjust the UI without exposing Project Nightjar",
      source: "manual-cli",
    },
    authorization: {
      version: 1,
      mode: "explicit-user-authorization",
      allow: ["src/ui/**"],
      deny: ["src/auth/**"],
      protectedSurfaces: ["auth"],
      maxFiles: 1,
      maxLines: 1,
      maxModules: 1,
    },
    repository: { head: before },
    before: { commit: before },
    after: { commit: after },
    analysis: analysisFixture(),
    visual: null,
  };
  checkpoint.receipt = createEvidenceReceipt(checkpoint);
  return { root, checkpoint };
}

function parseReportData(source) {
  const prefix = "window.__VIBETRACE_REPORT__ = ";
  assert.ok(source.startsWith(prefix));
  return JSON.parse(source.slice(prefix.length).replace(/;\s*$/u, ""));
}

test("generated reports derive review evidence from receipt-bound Git objects", async () => {
  const { root, checkpoint } = await checkpointFixture();
  const report = await generateReport(root, [checkpoint], checkpoint.id);
  const source = await readFile(
    join(report.directory, "report-data.js"),
    "utf8",
  );
  const payload = parseReportData(source);
  const rendered = payload.checkpoints[0];

  assert.equal(rendered.review.sourceReceipt.valid, true);
  assert.equal(rendered.review.gitEffect.recomputed, true);
  assert.equal(rendered.review.gitEffect.files, 2);
  assert.equal(rendered.review.contractDelta.status, "proposal-ready");
  assert.deepEqual(rendered.review.contractDelta.delta.exactAllowAdditions, [
    {
      path: "src/shared/helper.js",
      representable: true,
      rationale: "exact-observed-path-only",
    },
  ]);
  assert.equal(rendered.review.contractDelta.delta.budgets.maxFiles.to, 2);
  assert.equal(rendered.review.contractDelta.delta.budgets.maxLines.to, 2);
  assert.equal(rendered.review.contractDelta.delta.budgets.maxModules.to, 2);
  assert.equal(
    rendered.review.contractDelta.counterfactual.status,
    "compliant",
  );

  assert.equal(rendered.review.disclosure.status, "verified");
  assert.equal(rendered.review.disclosure.mode, "minimum-disclosure");
  assert.ok(rendered.review.disclosure.omitted.includes("promptText"));
  assert.ok(rendered.review.disclosure.omitted.includes("filePaths"));
  assert.match(rendered.review.disclosure.receiptId, /^vtd_[a-f0-9]{24}$/u);

  assert.match(source, /Project Nightjar/u);
  const html = await readFile(report.index, "utf8");
  assert.match(html, /review\.css/u);
  assert.match(html, /review-ui\.js/u);
  await readFile(join(report.directory, "review.css"), "utf8");
  await readFile(join(report.directory, "review-ui.js"), "utf8");
});

test("report review plane refuses derived proposals when the source receipt is invalid", async () => {
  const { root, checkpoint } = await checkpointFixture();
  checkpoint.prompt.text = "tampered prompt";

  const report = await generateReport(root, [checkpoint], checkpoint.id);
  const payload = parseReportData(
    await readFile(join(report.directory, "report-data.js"), "utf8"),
  );
  const review = payload.checkpoints[0].review;

  assert.equal(review.sourceReceipt.valid, false);
  assert.equal(review.contractDelta.status, "unavailable");
  assert.equal(review.contractDelta.reason, "source-receipt-unverified");
  assert.equal(review.disclosure.status, "unavailable");
  assert.equal(review.disclosure.reason, "source-receipt-unverified");
  assert.equal(review.gitEffect.recomputed, false);
});
