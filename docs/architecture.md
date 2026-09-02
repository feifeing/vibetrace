# VibeTrace architecture

VibeTrace v0.2 is deliberately a small local CLI plus a standalone report. Its architecture optimizes for an end-to-end evidence loop, not speculative integrations.

## Core invariants

1. Creating a snapshot must not move `HEAD`, change the real index, stash files, or modify the working tree.
2. Every risk point must map to an inspectable factor.
3. Prompt intent is an inference with disclosed rules, never ground truth.
4. User authorization is separate from inferred intent: VibeTrace must never pretend it knows what the user permitted unless the user declared a contract.
5. Pixel, layout, DOM, and semantic evidence are distinct layers.
6. A completed checkpoint has stable before and after Git objects.
7. A no-op one-step checkpoint is rejected.
8. The browser report renders stored analysis; it does not silently rescore it.

## Three-layer evidence model

VibeTrace deliberately separates three questions that are often collapsed into one AI-risk score:

1. **Intent — what was asked?** `src/core/intent.mjs` conservatively infers likely domains and scale from the prompt. This is heuristic context, not authorization.
2. **Authorization — what was explicitly allowed?** `src/core/contract.mjs` represents optional user-declared path and change-budget constraints. A contract can allow path globs, protect path globs, and cap file/line counts.
3. **Effect — what actually happened?** Git objects, normalized diffs, visual captures, and deterministic analysis describe the observed result.

This distinction matters because a prompt can be vague while an authorization boundary is precise. An inferred prompt mismatch is therefore reported separately from **authorization drift**.

For ad-hoc verification, `vibetrace attest` evaluates the current `HEAD → worktree` change against an explicit contract:

```bash
vibetrace attest \
  --prompt "Change the button color" \
  --allow "src/components/**,src/styles/**" \
  --deny "src/auth/**,src/router/**" \
  --max-files 3 \
  --max-lines 80
```

The command exits with status `2` when the declared contract is violated, which makes it usable in scripts without pretending to be an autonomous policy engine.

## Evidence receipts

`src/core/receipt.mjs` creates a deterministic SHA-256 receipt over the evidence envelope rather than signing a vague risk label. The receipt binds together:

- a hash of the prompt text;
- the explicit authorization contract, when present;
- repository `HEAD` plus before/after Git object IDs;
- the stored analysis summary, contract-compliance result, Blast Radius, and risk factors; and
- visual DOM/image hashes when visual capture exists.

The receipt is an integrity aid, not a cryptographic identity signature. It answers “does this receipt still describe the same captured evidence?” rather than “who authored this code?” A future signed-attestation layer can build on this without changing the evidence semantics.

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
- optional explicit authorization data;
- contract-compliance and authorization-drift evidence when a contract exists;
- Blast Radius and prompt-intent mismatch;
- risk factors with exact point contributions; and
- optional visual capture, comparison layers, and image hashes.

New authorization and receipt fields are additive so existing v2 checkpoint readers can continue to read older files. Writes use a temporary file plus atomic rename so an interrupted process does not leave half-written JSON.

## Risk and Blast Radius

Blast Radius answers “how far did this change spread?” Risk answers “what deserves review?” They share evidence but are separate outputs.

Prompt-intent mismatch compares inferred expected signals and scale with actual file signals and module count. **Authorization drift** is stronger evidence because it compares observed files and budgets with boundaries the user explicitly declared. The two are intentionally never collapsed into the same concept.

Sensitive classifications include CI, dependencies, auth, database, routing, public APIs, global styles, and configuration. All rules and caps live in importable modules with unit tests.

## Visual adapter

Playwright captures a fixed Chromium viewport with reduced motion and transitions disabled. `pngjs` decodes before/after PNGs for a basic absolute-RGBA threshold comparison and a generated diff image. Each captured PNG also receives a SHA-256 content hash for evidence receipts.

Layout evidence compares bounded visible-element rectangles by stable-enough selector paths. DOM evidence compares a hash and visible-node count. Both are heuristics. VibeTrace does not interpret semantic correctness.

## Restore boundary

The private before/after refs make rollback possible, but safe restore must also detect drift after the checkpoint, preview created/deleted paths, account for untracked files, and require explicit confirmation. Until those invariants are implemented and tested, v0.2 exposes the evidence and refs without an automatic destructive restore command.

## Related work boundary

AI change monitoring, intent tracking, path allowlists, Git checkpointing, visual regression, and blast-radius analysis all have prior art. VibeTrace does not claim those primitives as inventions. Its current technical focus is the **separation and binding of inferred intent, explicit authorization, and observed effect into one locally verifiable evidence record**. See [`related-work.md`](related-work.md) for the project's non-novelty claims and differentiation boundary.
