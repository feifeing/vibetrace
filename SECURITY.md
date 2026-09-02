# Security policy

VibeTrace reads Git state, writes local checkpoint metadata, can capture a locally served website, and can explicitly restore a completed checkpoint's worktree state. A vulnerability that executes unintended commands, escapes repository boundaries, exposes prompt/code data, or overwrites developer work is considered security-sensitive.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/feifeing/vibetrace/security/advisories/new). Do not open a public issue with exploit details, repository contents, credentials, or private screenshots.

Include the affected command, operating system, Node and Git versions, expected behavior, observed behavior, and a minimal reproduction if it is safe to share. You should receive an initial response within seven days.

## Supported versions

Until the first tagged stable release, only the current `main` branch receives security fixes. This policy will be updated when versioned releases begin.

## Security boundaries

- VibeTrace executes Git through argument arrays rather than interpolated shell commands.
- `.vibetrace/` is local by default and may contain prompts, paths, screenshots, and DOM fingerprints; review it before sharing.
- Visual capture visits only an explicit `http://` or `https://` URL supplied by the user.
- Snapshot capture uses a temporary Git index and does not move `HEAD`, rewrite the real index, stash files, or modify the worktree.
- `vibetrace restore` is a dry run unless the user explicitly supplies `--apply`.
- Restore is blocked when the current worktree differs from the checkpoint after-state, and the guard is checked again immediately before mutation.
- Restore uses a temporary Git index and verifies that `HEAD` and the real index remain unchanged.
- After an applied restore, VibeTrace snapshots the resulting worktree and verifies that it exactly matches the checkpoint before-state.
- There is intentionally no force-restore mode. VibeTrace refuses to overwrite post-checkpoint work instead of silently stashing, resetting, merging, or discarding it.

A successful guarded restore proves a narrow operational property: VibeTrace observed the expected checkpoint after-state immediately before restore and produced a worktree matching the recorded before-state without intentionally changing `HEAD` or the real index. It is not a substitute for backups, repository permissions, code review, or semantic correctness checks.
