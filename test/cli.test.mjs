import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseArguments, runCli } from "../src/cli.mjs";
import { listCheckpoints } from "../src/core/store.mjs";
import { createRepository, memoryStream } from "../test-support/helpers.mjs";

async function invoke(root, args) {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const code = await runCli(args, { cwd: root, stdout, stderr });
  return { code, stdout: stdout.value(), stderr: stderr.value() };
}

test("help works outside a repository", async () => {
  const result = await invoke("/", ["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Time travel for vibe coding/iu);
});

test("version works outside a repository without printing help", async () => {
  const result = await invoke("/", ["--version"]);
  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "0.2.0");
});

test("CLI argument parsing supports inline values and rejects malformed options", () => {
  assert.deepEqual(
    parseArguments([
      "checkpoint",
      "--prompt=Make the hero cinematic",
      "--from-head",
    ]),
    {
      command: "checkpoint",
      options: {
        "--prompt": "Make the hero cinematic",
        "--from-head": true,
      },
      positionals: [],
    },
  );
  assert.throws(
    () => parseArguments(["checkpoint", "--prompt"]),
    /requires a value/iu,
  );
  assert.throws(
    () => parseArguments(["diff", "--mystery"]),
    /Unknown option/iu,
  );
});

test("two-phase CLI creates a readable checkpoint and rejects an empty finish", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));

  assert.equal((await invoke(root, ["init"])).code, 0);
  const started = await invoke(root, [
    "checkpoint",
    "--prompt",
    "Change the button color",
  ]);
  assert.equal(started.code, 0);
  assert.match(started.stdout, /Checkpoint recording/iu);

  const emptyFinish = await invoke(root, ["checkpoint", "--finish"]);
  assert.equal(emptyFinish.code, 1);
  assert.match(emptyFinish.stderr, /No code changes/iu);

  await writeFile(join(root, "app.js"), "export const value = 2;\n", "utf8");
  await writeFile(
    join(root, "src-router.js"),
    'export const route = "/";\n',
    "utf8",
  );
  const preview = await invoke(root, ["diff", "--json"]);
  assert.equal(preview.code, 0);
  const previewJson = JSON.parse(preview.stdout);
  assert.equal(previewJson.analysis.summary.filesChanged, 2);

  const finished = await invoke(root, ["checkpoint", "--finish"]);
  assert.equal(finished.code, 0);
  const checkpoints = await listCheckpoints(root);
  assert.equal(checkpoints.length, 1);
  assert.equal(checkpoints[0].status, "completed");
  assert.equal(checkpoints[0].analysis.files.length, 2);
  assert.equal(
    checkpoints[0].analysis.risk.model,
    "vibetrace-evidence-risk-v2",
  );
  const raw = JSON.parse(
    await readFile(
      join(root, ".vibetrace", "checkpoints", `${checkpoints[0].id}.json`),
      "utf8",
    ),
  );
  assert.equal(raw.schemaVersion, 2);

  assert.equal(
    (await invoke(root, ["session", "new", "--name", "Second pass"])).code,
    0,
  );
  const emptyReplay = await invoke(root, ["replay"]);
  assert.equal(emptyReplay.code, 1);
  assert.match(emptyReplay.stderr, /No checkpoints exist/iu);
  const emptyReport = await invoke(root, ["report"]);
  assert.equal(emptyReport.code, 1);
  assert.match(emptyReport.stderr, /No completed checkpoint/iu);
  const explicitOldReport = await invoke(root, ["report", checkpoints[0].id]);
  assert.equal(explicitOldReport.code, 0);
  assert.match(explicitOldReport.stdout, /index\.html/iu);
});

test("from-head refuses to create a meaningless clean checkpoint", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await invoke(root, [
    "checkpoint",
    "--prompt",
    "No-op",
    "--from-head",
  ]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /No changes were detected/iu);
  assert.equal((await listCheckpoints(root)).length, 0);
});

test("sessions create separate replay timelines and block rollover while recording", async (context) => {
  const root = await createRepository();
  context.after(() => rm(root, { recursive: true, force: true }));

  const created = await invoke(root, [
    "session",
    "new",
    "--name",
    "Landing page pass",
    "--json",
  ]);
  assert.equal(created.code, 0);
  const session = JSON.parse(created.stdout);
  assert.equal(session.name, "Landing page pass");

  const current = await invoke(root, ["session", "--json"]);
  assert.equal(current.code, 0);
  assert.equal(JSON.parse(current.stdout).id, session.id);

  assert.equal(
    (await invoke(root, ["checkpoint", "--prompt", "Make the hero cinematic"]))
      .code,
    0,
  );
  const blocked = await invoke(root, ["session", "new"]);
  assert.equal(blocked.code, 1);
  assert.match(blocked.stderr, /Finish or abort active checkpoint/iu);

  assert.equal((await invoke(root, ["checkpoint", "--abort"])).code, 0);
  const afterAbort = await invoke(root, ["session", "--json"]);
  assert.equal(JSON.parse(afterAbort.stdout).checkpoints.length, 0);
});

test("checkpoint gives a clear error in a repository without a first commit", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "vibetrace-empty-repo-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: root });

  const result = await invoke(root, ["checkpoint", "--prompt", "Start here"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /at least one Git commit/iu);
  assert.match(result.stdout, /Create an initial commit/iu);
});
