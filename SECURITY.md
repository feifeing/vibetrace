# Security policy

VibeTrace reads Git state, writes local checkpoint metadata, and can capture a locally served website. A vulnerability that executes unintended commands, escapes repository boundaries, exposes prompt/code data, or overwrites developer work is considered security-sensitive.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/feifeing/vibetrace/security/advisories/new). Do not open a public issue with exploit details, repository contents, credentials, or private screenshots.

Include the affected command, operating system, Node and Git versions, expected behavior, observed behavior, and a minimal reproduction if it is safe to share. You should receive an initial response within seven days.

## Supported versions

Until the first tagged stable release, only the current `main` branch receives security fixes. This policy will be updated when versioned releases begin.

## Security boundaries

- VibeTrace executes Git through argument arrays rather than interpolated shell commands.
- `.vibetrace/` is local by default and may contain prompts, paths, screenshots, and DOM fingerprints; review it before sharing.
- Visual capture visits only an explicit `http://` or `https://` URL supplied by the user.
- VibeTrace v0.2 creates private Git refs but does not automatically restore or overwrite a worktree.
