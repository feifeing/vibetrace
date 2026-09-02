import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  collectCommitDiff,
  parseDiffOutputs,
  snapshotForScope,
} from "../src/git/diff.mjs";
import { createRepository, git } from "../test-support/helpers.mjs";

test("NUL-delimited Git output preserves rename and binary metadata", () => {
  const files = parseDiffOutputs({
    nameStatus: "M\0src/app.js\0R100\0old name.js\0new name.js\0A\0logo.png\0",
    numstat:
      "4\t2\tsrc/app.js\0 1\t0\t\0old name.js\0new name.js\0-\t-\tlogo.png\0".trimStart(),
  });

  assert.deepEqual(files[0], {
    path: "src/app.js",
    oldPath: null,
    status: "modified",
    additions: 4,
    deletions: 2,
    binary: false,
  });
  assert.equal(files[1].status, "renamed");
  assert.equal(files[1].oldPath, "old name.js");
  assert.equal(files[1].path, "new name.js");
  assert.equal(files[2].binary, true);
});

test("all-scope snapshots do not double-count a file changed in index and worktree", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "app.js"), "export const value = 2;\n", "utf8");
  git(root, ["add", "app.js"]);
  await writeFile(join(root, "app.js"), "export const value = 3;\n", "utf8");
  await writeFile(join(root, "new file.txt"), "untracked\n", "utf8");

  const snapshot = await snapshotForScope(root, "all");
  const files = collectCommitDiff(root, snapshot.before, snapshot.after);
  assert.equal(files.filter((file) => file.path === "app.js").length, 1);
  assert.ok(
    files.some(
      (file) => file.path === "new file.txt" && file.status === "added",
    ),
  );
});

test("staged and unstaged scopes are distinct", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "app.js"), "export const value = 2;\n", "utf8");
  git(root, ["add", "app.js"]);
  await writeFile(join(root, "notes.txt"), "only working tree\n", "utf8");

  const staged = await snapshotForScope(root, "staged");
  const unstaged = await snapshotForScope(root, "unstaged");
  assert.deepEqual(
    collectCommitDiff(root, staged.before, staged.after).map(
      (file) => file.path,
    ),
    ["app.js"],
  );
  assert.deepEqual(
    collectCommitDiff(root, unstaged.before, unstaged.after).map(
      (file) => file.path,
    ),
    ["notes.txt"],
  );
});
