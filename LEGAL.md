# Legal, privacy, and third-party boundaries

VibeTrace is an open-source developer tool. This document records the project's current legal and privacy boundaries so that implementation claims, release decisions, and community contributions remain conservative and inspectable.

This document is not legal advice and does not replace a jurisdiction-specific trademark, privacy, employment/IP, or open-source license review.

## Project name and trademarks

`VibeTrace` is currently a project name, not a representation that a trademark registration has been obtained or that the name has been cleared for commercial use in every jurisdiction.

Before a public package release, paid offering, company formation, or substantial marketing spend under this name, maintainers should complete a documented trademark clearance review covering at least:

- relevant federal/national trademark databases;
- materially similar software and developer-tool names in actual use;
- relevant domains, package registries, app stores, and developer communities; and
- the jurisdictions in which the project will be offered commercially.

The current repository has a release blocker for naming/distribution clearance. Until it is resolved, the npm package remains private and the project should not describe the name as registered, exclusive, or legally cleared.

Names and marks of third-party products or companies mentioned in documentation are used only to describe compatibility, comparison, or ecosystem context. They remain the property of their respective owners. VibeTrace is not sponsored by, endorsed by, or affiliated with those owners unless an explicit written statement says otherwise.

## Copyright and repository license

The original VibeTrace source and documentation in this repository are distributed under the MIT License in [`LICENSE`](LICENSE).

The MIT License permits broad reuse but requires preservation of its copyright and permission notice in copies or substantial portions of the licensed software. It also contains warranty and liability disclaimers.

Do not copy third-party source, documentation, screenshots, icons, logos, datasets, prompts, or substantial text into this repository merely because they are publicly accessible. A contribution must either be original, be used under an applicable license/permission, or fall within another legally supportable basis that the contributor is prepared to document.

## Contributions and provenance

Contributors must have the right to submit what they contribute. In particular, do not submit:

- proprietary employer/client code without authorization;
- code copied from a source whose license is incompatible with this repository;
- third-party logos, screenshots, fonts, media, or datasets without appropriate rights;
- secrets, personal data, or confidential repository contents; or
- AI-generated material when the contributor cannot reasonably represent that they have the right to submit and license the resulting contribution.

The contribution policy in [`CONTRIBUTING.md`](CONTRIBUTING.md) applies in addition to the MIT License.

## Third-party software

The core packaged CLI currently has no runtime npm dependencies. Development and optional visual tooling listed in the lockfile includes software under permissive open-source licenses, including Apache-2.0 and MIT-licensed packages.

The npm package allowlist intentionally excludes `node_modules`, CI files, tests, and development scripts. Optional browser tooling and browsers installed by Playwright are not represented as VibeTrace-authored software and may have their own licenses and notices.

When adding a runtime dependency, bundled asset, copied code sample, icon, font, browser binary, or other redistributed third-party material, the pull request must identify its source and license and determine whether attribution, notice, source-offer, patent, copyleft, trademark, or redistribution obligations apply before merge.

## Local data and privacy

VibeTrace is designed as a local-first tool. The core repository currently contains no product telemetry or analytics client that sends checkpoint data to a VibeTrace-operated service.

However, `.vibetrace/` can contain sensitive local evidence, including:

- prompt text or prompt-derived metadata;
- repository paths and change summaries;
- Git object identifiers and checkpoint metadata;
- screenshots;
- DOM/layout fingerprints; and
- reports derived from the above.

Users should treat that directory as potentially confidential and review its contents before committing, uploading, attaching, or sharing it.

Visual capture navigates to a URL supplied by the user. Loading that page may itself contact the target application's server and any third-party resources that the page normally loads. VibeTrace does not imply that visiting a URL is private, anonymous, or authorized. Users are responsible for having permission to access and capture the target and for complying with applicable privacy, confidentiality, workplace, and website terms.

## Repository and code authorization

VibeTrace does not grant permission to inspect, copy, modify, capture, or restore a repository that the user is not otherwise authorized to access. The user is responsible for ensuring that their use of VibeTrace is permitted by the repository owner, employer/client policies, applicable licenses, and law.

Guarded restore is an operational safety feature, not a backup service, legal hold mechanism, records-management system, or guarantee against data loss.

## Security, safety, and accuracy claims

Risk, Blast Radius, intent inference, protected-surface classification, visual comparison, and authorization checks have deliberately limited meanings described in the README and architecture documentation.

VibeTrace must not market heuristic output as:

- a guarantee that code is secure, correct, compliant, or non-infringing;
- a substitute for professional security, legal, privacy, or code review;
- proof of authorship or identity;
- proof that a particular AI agent caused a change; or
- proof that a visually unchanged page is semantically unchanged.

Evidence receipts are integrity records, not digital signatures or certificates of legal provenance.

## Release checklist for legal-risk changes

Before a public binary/package release or commercial launch, maintainers should re-check:

1. project and package-name clearance;
2. third-party dependency and bundled-asset licenses;
3. copyright notices and contribution provenance;
4. privacy/data-flow statements against actual code behavior;
5. claims made in README, website, screenshots, launch posts, and badges;
6. use of third-party trademarks/logos and any implied affiliation;
7. whether any new cloud, telemetry, account, payment, or data-retention feature creates additional privacy/consumer-law obligations; and
8. whether a qualified lawyer should review the intended jurisdictions and business model.

If implementation and documentation disagree, the safer claim wins until the discrepancy is resolved.
