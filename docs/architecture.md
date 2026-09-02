# VibeTrace architecture

VibeTrace v0.2 is deliberately a small local CLI plus a standalone report. Its architecture optimizes for an end-to-end evidence loop, not speculative integrations.

## Core invariants

1. Creating a snapshot must not move `HEAD`, change the real index, stash files, or modify the working tree.
2. Every risk point must map to an inspectable factor.
3. Prompt intent is an inference with disclosed rules, never ground truth.
4. Pixel, layout, DOM, and semantic evidence are distinct layers.
5. A completed checkpoint has stable before and after Git objects.
6. A no-op one-step checkpoint is rejected.
7. The browser report renders stored analysis; it does not silently rescore it.

## Snapshot algorithm

For a before or after worktree snapshot, VibeTrace:

1. creates a temporary Git index outside the repository;
2. loads `HEAD` into that index with `git read-tree`;
3. stages the current worktree into the temporary index with `git add -A`;
4. writes a tree and local commit object;
5. deletes the temporary index; and
6. anchors completed evidence beneath `refs/vibetrace/checkpoints/<id>/…`.

The repository's real index is never used for these writes. Ignored files remain ignored; tracked, staged, unstaged, deleted, renamed, and untracked non-ignored files are represented in the snapshot.

## Diff normalization

`src/git/diff.mjs` compares two Git objects using `--name-status -z` and `--numstat -z`. NUL delimiters preserve tabs, newlines, spaces, and quoted characters in paths. Status and line statistics are merged into one model:

```json
{
  "path": "src/components/Button.tsx",
  "oldPath": null,
  "status": "modified",
  "additions": 18,
  "deletions": 5,
  "binary": false
}
```

The same parser handles checkpoint-to-checkpoint, `HEAD`-to-index, index-to-worktree, and `HEAD`-to-worktree comparisons.

## Checkpoint schema v2

A checkpoint contains:

- stable identity and session membership;
- prompt text and source metadata;
- repository branch and `HEAD` at capture time;
- before/after object IDs and private refs;
- normalized files and summary statistics;
- inferred intent;
- Blast Radius and intent mismatch;
- risk factors with exact point contributions; and
- optional visual capture and comparison layers.

Writes use a temporary file plus atomic rename so an interrupted process does not leave half-written JSON.

## Risk and Blast Radius

Blast Radius answers “how far did this prompt spread?” Risk answers “what deserves review?” They share evidence but are separate outputs.

Intent mismatch compares inferred expected signals and scale with actual file signals and module count. Sensitive classifications include CI, dependencies, auth, database, routing, public APIs, global styles, and configuration. All rules and caps live in importable modules with unit tests.

## Visual adapter

Playwright captures a fixed Chromium viewport with reduced motion and transitions disabled. `pngjs` decodes before/after PNGs for a basic absolute-RGBA threshold comparison and a generated diff image.

Layout evidence compares bounded visible-element rectangles by stable-enough selector paths. DOM evidence compares a hash and visible-node count. Both are heuristics. VibeTrace does not interpret semantic correctness.

## Restore boundary

The private before/after refs make rollback possible, but safe restore must also detect drift after the checkpoint, preview created/deleted paths, account for untracked files, and require explicit confirmation. Until those invariants are implemented and tested, v0.2 exposes the evidence and refs without an automatic destructive restore command.
