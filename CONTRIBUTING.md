# Contributing to VibeTrace

VibeTrace should make AI-generated changes easier to inspect, not add another layer of mystery. Contributions are welcome when they strengthen this evidence chain:

`Prompt intent → code change → Blast Radius → visual evidence → risk → replay / restore`

## Before opening a pull request

1. Explain the developer problem, not only the implementation.
2. Keep the change inside VibeTrace's core positioning; general chat, IDE, and Git-GUI features are out of scope.
3. Add or update tests for behavior changes.
4. Include before/after images for interface changes.
5. Do not describe a heuristic as AI certainty or a pixel change as a semantic regression.

## Local setup

```bash
git clone https://github.com/feifeing/vibetrace.git
cd vibetrace
npm install
npx playwright install chromium
npm run verify
```

Useful focused commands:

```bash
npm test             # core, Git, schema, CLI, and visual unit tests
npm run test:e2e     # Chromium interaction and responsive checks
npm run check        # JavaScript syntax and JSON validation
npm run format       # apply repository formatting
npm run dev          # run the interactive report at 127.0.0.1:4173
```

## Architecture boundaries

- Git commands belong in `src/git/`; use `execFileSync` argument arrays, never shell-interpolated commands.
- Prompt inference and risk scoring must remain deterministic and separately testable.
- Schema changes require a version change and migration/compatibility discussion.
- The CLI executable should stay thin; behavior belongs in importable modules.
- The browser report consumes checkpoint data. Do not duplicate risk logic in the UI.
- Optional visual dependencies must fail with an actionable message while the core Git workflow keeps working.

## Testing Git behavior

Git parsing needs tests for unusual paths, renames, binary files, staged plus unstaged edits to the same file, and untracked files. Use temporary repositories; never depend on the VibeTrace repository's own worktree state.

## Pull-request scope

Prefer one coherent capability per pull request. A good description answers:

- What user question becomes easier to answer?
- Which evidence is captured or improved?
- What could be misclassified?
- How was the change verified?
- Did the checkpoint schema or risk score move?

Maintainers may ask broad feature proposals to begin as an issue so the product boundary stays sharp.
