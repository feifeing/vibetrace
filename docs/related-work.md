# Related work and differentiation boundary

VibeTrace is built in an active area with substantial prior art. This document records what the project **does not claim as novel** and what technical boundary it is currently exploring.

## Not novelty claims

VibeTrace does not claim to have invented any of the following ideas:

- AI coding checkpoints or rewind;
- Git diff or change-impact analysis;
- prompt / intent tracking;
- path allowlists, protected-file rules, or executable change contracts;
- least-privilege authorization, step-up approval, permission deltas, or policy repair;
- blast-radius analysis;
- code-risk scoring;
- visual regression screenshots;
- developer timelines or session replay;
- evidence packs, audit receipts, cryptographic hashes, or signed attestations as general concepts;
- selective disclosure, redaction policies, or privacy-preserving evidence projection.

Those ideas exist independently in Git tooling, access-control research, visual-regression systems, coding-agent products, CI policy tools, agent-security systems, and earlier vibe-coding projects.

## Closest product overlap

A previously published project also named `vibetrace` includes AI diff tracking, risk scoring, intent-aware watching, and intent-mismatch warnings. Other projects provide coding-session timelines, agent checkpoints, path authorization, executable change contracts, impact graphs, signed or unsigned evidence receipts, PR evidence packs, least-privilege agent permissions, or visual-regression evidence.

Current agent-security guidance also recommends task-scoped authorization and human step-up controls for high-impact operations, while access-control research has long studied policy repair and minimum-permission synthesis. VibeTrace must not relabel those established areas as project inventions.

VibeTrace should therefore be evaluated on its implementation and current evidence composition rather than on a claim that these primitives are new.

## Current technical focus

The project separates several questions that are often collapsed into one agent-risk or trust score:

```text
Prompt intent
(heuristic context)
      ↓
Execution authority
(explicit Change Contract)
      ↓
Observed effect
(recomputable Git + optional visual evidence)
      ↓
Evidence integrity
(deterministic receipt + verification)
      ↓
Disclosure authority
(explicit minimum-disclosure policy)
```

This produces distinct failure signals rather than a single opaque verdict:

- **intent mismatch** — the change is broader or qualitatively different from what transparent prompt rules inferred;
- **authorization drift** — the change violated an explicit user-declared execution boundary;
- **disclosure-policy violation** — a shareable Evidence Capsule contains a class of data its own disclosure policy says should be omitted;
- **integrity mismatch** — captured evidence or an exported projection no longer recomputes to its recorded receipt.

Authorization drift is intentionally treated as stronger evidence than prompt mismatch because it is based on a declared contract rather than an inferred interpretation of natural language.

## Evidence receipts and disclosure receipts

A completed checkpoint can have a deterministic evidence receipt binding the prompt hash, optional authorization contract, Git before/after objects, analysis, and optional visual hashes. A minimum-disclosure Evidence Capsule can separately bind its source receipt, disclosure policy, and exported projection.

Neither mechanism claims authorship, identity, semantic correctness, confidentiality, or non-repudiation. Cryptographic signatures and external trust anchors are separate mechanisms with substantial prior art and should remain separately named if introduced.

## Observed-effect contract delta

When a recorded effect violates a Change Contract, VibeTrace can compute a restricted local contract delta for review. This is **not** a claim to invent permission deltas or access-control policy repair, and it is not a globally minimal policy solver.

The project deliberately constrains the proposal vocabulary to:

- exact observed file additions to an existing allow boundary; and
- numeric-budget increases only to the observed file/line/module totals.

It never proposes removing an explicit deny rule, unprotecting a sensitive surface, or generalizing one observed file into a broader glob. The same Git-derived observed effect is then replayed counterfactually against the candidate contract to determine whether that restricted proposal is sufficient.

The design question VibeTrace is exploring is therefore narrower:

> Can previously captured AI-code-change evidence support a small, inspectable, non-self-applying authorization proposal while preserving a mandatory human decision for protected authority?

That is a project-specific workflow composition, not invention of least privilege itself.

## Why keep intent, authorization, and disclosure separate?

A prompt such as "clean up the checkout flow" is semantically broad. A user can still declare a precise execution boundary:

```text
allow: src/checkout/**
deny:  src/auth/**, migrations/**
max files: 8
max lines: 250
```

If the agent edits an auth module, VibeTrace does not need to guess whether the prompt "really meant" auth. The evidence can state a simpler fact: the observed change crossed a declared boundary.

Likewise, a complete local checkpoint may legitimately contain a confidential prompt or screenshot while a PR reviewer needs only structural evidence. A disclosure policy can make that sharing boundary explicit without pretending that hashes or redaction make the resulting artifact anonymous.

This makes the product less dependent on claiming that its prompt interpretation, permission model, or cryptographic primitives are uniquely intelligent or unprecedented.

## Ongoing review

The maintainers should update this document when a materially similar project or publication is discovered. If VibeTrace adopts implementation ideas, code, assets, or text from third-party projects in the future, the relevant license, patent, attribution, and trademark requirements must be handled explicitly rather than hidden behind a generic "inspired by" statement.
