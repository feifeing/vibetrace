# Contributing to VibeTrace

VibeTrace should make AI-generated changes easier to inspect, not add another layer of mystery. Contributions are welcome when they strengthen this evidence chain:

`Intent → Authority → Effect → Review → Disclosure`

## Before opening a pull request

1. Explain the developer problem, not only the implementation.
2. Keep the change inside VibeTrace's core positioning; general chat, IDE, and Git-GUI features are out of scope.
3. Add or update tests for behavior changes.
4. Include before/after images for interface changes.
5. Do not describe a heuristic as AI certainty or a pixel change as a semantic regression.
6. Identify any third-party code, assets, datasets, examples, or generated material introduced by the change and document the source and applicable license/permission.
7. Run the rights/release gate when dependencies, package metadata, web assets, fonts, notices, or release behavior change.

## Contribution rights and provenance

By intentionally submitting a contribution for inclusion in this project, you agree that the contribution may be distributed under the repository's MIT License and represent that you have the right to submit it on those terms.

Do not submit:

- proprietary employer or client code unless you are authorized to contribute it;
- copied code or documentation whose license is incompatible with this repository;
- third-party logos, screenshots, fonts, media, datasets, or substantial text without appropriate rights;
- secrets, credentials, confidential material, or personal data that should not become public; or
- AI-generated material when you cannot reasonably represent that you have the right to submit and license the resulting contribution.

If a contribution is derived from another open-source project, identify the source repository, relevant file(s), upstream license, and any notices that must be preserved. When provenance or licensing is uncertain, open an issue before submitting the material.

Maintainers may require a Developer Certificate of Origin (DCO) sign-off or another contribution mechanism before accepting third-party contributions as the project matures. A sign-off is not currently a substitute for actually having the rights described above.

See [`LEGAL.md`](LEGAL.md), [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md), and [`docs/asset-provenance.md`](docs/asset-provenance.md) for the project's broader copyright, trademark, privacy, dependency, and asset boundaries.

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
npm run rights:check # dependency/license, package-notice, and asset-release baseline
npm run format       # apply repository formatting
npm run dev          # run the interactive report at 127.0.0.1:4173
```

## Architecture boundaries

- Git commands belong in `src/git/`; use `execFileSync` argument arrays, never shell-interpolated commands.
- Prompt inference and risk scoring must remain deterministic and separately testable.
- Explicit authorization, inferred intent, review proposals, and disclosure authority must remain semantically distinct.
- Schema/evidence-version changes require a migration/compatibility discussion.
- The CLI executable should stay thin; behavior belongs in importable modules.
- The browser report consumes checkpoint data. Do not duplicate policy or risk logic in the UI.
- Optional visual dependencies must fail with an actionable message while the core Git workflow keeps working.

## Testing Git behavior

Git parsing needs tests for unusual paths, renames, binary files, staged plus unstaged edits to the same file, and untracked files. Use temporary repositories; never depend on the VibeTrace repository's own worktree state.

## Pull-request scope

Prefer one coherent capability per pull request. A good description answers:

- What user question becomes easier to answer?
- Which evidence is captured or improved?
- What could be misclassified?
- How was the change verified?
- Did the checkpoint schema, evidence coverage, authorization model, or risk score move?
- Did the change introduce any third-party material, new data flow, external service, telemetry, or redistribution obligation?

Maintainers may ask broad feature proposals to begin as an issue so the product boundary stays sharp.
