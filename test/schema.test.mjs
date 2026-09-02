import assert from "node:assert/strict";
import test from "node:test";
import { validateCheckpoint } from "../src/core/schema.mjs";

test("completed checkpoints require both snapshots and analysis", () => {
  const result = validateCheckpoint({
    schemaVersion: 2,
    id: "vt_example",
    sessionId: "session_example",
    status: "completed",
    prompt: { text: "Change the button color" },
    repository: { head: "abc" },
    before: { commit: "abc" },
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("after.commit")));
  assert.ok(result.issues.some((issue) => issue.includes("analysis.files")));
});

test("recording checkpoints are valid before an after snapshot exists", () => {
  const result = validateCheckpoint({
    schemaVersion: 2,
    id: "vt_example",
    sessionId: "session_example",
    status: "recording",
    prompt: { text: "Change the button color" },
    repository: { head: "abc" },
    before: { commit: "abc" },
  });
  assert.deepEqual(result, { valid: true, issues: [] });
});
