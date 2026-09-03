# Release readiness gate

This checklist is intentionally conservative. Passing engineering CI does not by itself mean a public package or commercial launch is legally, operationally, or security-ready.

## Current release blockers

- [ ] **Project/package naming clearance resolved.** The working name `VibeTrace` is not currently treated as legally cleared. A public-use scan has found multiple earlier exact or near-exact software/developer-tool uses and an existing public npm package named `vibetrace`. Resolve this by a deliberate rename or by completing jurisdiction-appropriate trademark/name clearance before a public npm release, paid launch, or substantial marketing spend.
- [x] npm package remains `private: true` while naming clearance is unresolved.

## Rights and provenance

- [x] Repository source is licensed under MIT.
- [x] Current npm dependency licenses are recorded in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
- [x] Current project visual assets are recorded in [`docs/asset-provenance.md`](asset-provenance.md).
- [ ] Any new third-party source, text, screenshots, icons, fonts, datasets, or generated material has documented provenance and redistribution rights.
- [ ] If outside contributors are accepted at scale, decide whether to require DCO sign-off or another contribution provenance mechanism.

## Product and claim review

- [ ] README, website, launch posts, package metadata, screenshots, and badges use the same conservative capability claims as the implemented code.
- [ ] No claim says or implies that VibeTrace invented prompt tracking, AI diff tracking, blast-radius analysis, risk scoring, change authorization, policy repair, evidence receipts, session replay, or selective disclosure as general concepts.
- [ ] Third-party products are named only where needed for compatibility, comparison, or ecosystem context, without logos or endorsement language unless separately authorized.
- [ ] Security/risk output is not marketed as a guarantee of safety, legal compliance, non-infringement, authorship, or semantic correctness.

## Package and dependency review

- [x] Distribution allowlist excludes `node_modules`, tests, CI files, and development scripts.
- [x] Release package includes `LICENSE`, `LEGAL.md`, and `THIRD_PARTY_NOTICES.md`.
- [ ] Any new runtime/optional dependency has a deliberate packaging model and license review.
- [ ] Optional Playwright/PNG tooling has an install path that works for the intended release channel without implying that browser binaries are VibeTrace-authored or MIT-licensed.

## Privacy and security review

- [ ] Local evidence disclosure behavior still matches [`LEGAL.md`](../LEGAL.md) and the disclosure-boundary documentation.
- [ ] Any future telemetry, cloud sync, accounts, payments, hosted reports, or data retention is reviewed before implementation claims or launch.
- [ ] Security-sensitive reports do not expose private repository contents, credentials, or screenshots in public issues.

## Commercialization review

Before a paid US/EU or multi-jurisdiction launch, obtain appropriate professional review for the intended name/mark, business model, privacy obligations, and—where material to the launch—patent/freedom-to-operate questions. A public prior-art search is useful engineering diligence but is not a substitute for jurisdiction-specific legal analysis.

A checked box records a repository fact at the time it was reviewed; it is not a permanent legal conclusion. Re-run the review when dependencies, assets, distribution model, product name, data flow, or commercial scope changes.
