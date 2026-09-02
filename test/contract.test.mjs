import assert from "node:assert/strict";
import test from "node:test";
import {
  createChangeContract,
  evaluateChangeContract,
} from "../src/core/contract.mjs";
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

test("module budgets turn cross-module spread into explicit authorization drift", () => {
  const contract = createChangeContract({ maxModules: 1 });
  const files = [
    { path: "src/components/Button.tsx", additions: 4, deletions: 1 },
    { path: "src/auth/session.ts", additions: 2, deletions: 1 },
  ];

  const result = evaluateChangeContract(contract, files);
  assert.equal(result.status, "violated");
  assert.equal(result.totals.modules, 2);
  assert.deepEqual(
    result.violations.map((violation) => violation.id),
    ["module-budget-exceeded"],
  );
  assert.match(result.violations[0].detail, /src\/components, src\/auth/u);
});

test("module budgets use stable monorepo module names", () => {
  const contract = createChangeContract({ maxModules: 2 });
  const files = [
    { path: "packages/ui/src/Button.tsx", additions: 3, deletions: 0 },
    { path: "packages/ui/src/Card.tsx", additions: 2, deletions: 1 },
    { path: "apps/web/src/page.tsx", additions: 5, deletions: 2 },
  ];

  const result = evaluateChangeContract(contract, files);
  assert.equal(result.status, "compliant");
  assert.equal(result.totals.modules, 2);
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

test("module-budget violations feed the existing authorization-drift risk factor", () => {
  const analysis = analyzeChangeSet({
    prompt: "Refine the checkout card",
    contract: createChangeContract({ maxModules: 1 }),
    files: [
      { path: "src/checkout/Card.tsx", additions: 5, deletions: 2 },
      { path: "src/auth/session.ts", additions: 1, deletions: 1 },
    ],
  });

  assert.equal(analysis.contractCompliance.status, "violated");
  assert.equal(analysis.blastRadius.authorizationDrift, true);
  assert.ok(
    analysis.contractCompliance.violations.some(
      (violation) => violation.id === "module-budget-exceeded",
    ),
  );
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
