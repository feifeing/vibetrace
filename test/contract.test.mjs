import assert from "node:assert/strict";
import test from "node:test";
import { createChangeContract, evaluateChangeContract } from "../src/core/contract.mjs";
import { createEvidenceReceipt } from "../src/core/receipt.mjs";
import { analyzeChangeSet } from "../src/core/risk.mjs";

test("explicit authorization is evaluated independently from prompt inference", () => {
  const contract = createChangeContract({
    allow: "src/components/**,src/styles/**",
    deny: "src/auth/**,src/router/**",
    maxFiles: 3,
    maxLines: 80,
  });
  const files = [
    { path: "src/components/Button.tsx", additions: 4, deletions: 1 },
    { path: "src/auth/session.ts", additions: 10, deletions: 2 },
  ];

  const result = evaluateChangeContract(contract, files);
  assert.equal(result.status, "violated");
  assert.deepEqual(result.protectedFiles, ["src/auth/session.ts"]);
  assert.deepEqual(result.unauthorizedFiles, ["src/auth/session.ts"]);
});

test("risk analysis distinguishes inferred mismatch from declared authorization drift", () => {
  const contract = createChangeContract({
    allow: "src/components/**",
    deny: "src/auth/**",
    maxFiles: 2,
  });
  const analysis = analyzeChangeSet({
    prompt: "Change the button color",
    contract,
    files: [
      { path: "src/components/Button.tsx", additions: 2, deletions: 1 },
      { path: "src/auth/session.ts", additions: 20, deletions: 4 },
    ],
  });

  assert.equal(analysis.contractCompliance.status, "violated");
  assert.equal(analysis.blastRadius.authorizationDrift, true);
  assert.ok(
    analysis.risk.factors.some((factor) => factor.id === "authorization-drift"),
  );
});

test("evidence receipts are deterministic for the same evidence", () => {
  const checkpoint = {
    id: "vt_example",
    sessionId: "session-example",
    prompt: { text: "Change the button color", source: "manual-cli" },
    authorization: createChangeContract({ allow: "src/components/**" }),
    repository: { head: "a".repeat(40) },
    before: { commit: "b".repeat(40) },
    after: { commit: "c".repeat(40) },
    analysis: {
      summary: { filesChanged: 1, linesChanged: 2 },
      contractCompliance: { declared: true, status: "compliant" },
      blastRadius: { score: 10, level: "contained" },
      risk: { score: 5, level: "low" },
    },
    visual: null,
  };

  const first = createEvidenceReceipt(checkpoint);
  const second = createEvidenceReceipt(structuredClone(checkpoint));
  assert.equal(first.receiptId, second.receiptId);
  assert.match(first.receiptId, /^vtr_[a-f0-9]{24}$/u);
});
