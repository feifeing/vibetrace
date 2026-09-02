# Related work and differentiation boundary

VibeTrace is built in an active area with substantial prior art. This document records what the project **does not claim as novel** and what technical boundary it is currently exploring.

## Not novelty claims

VibeTrace does not claim to have invented any of the following ideas:

- AI coding checkpoints or rewind;
- Git diff or change-impact analysis;
- prompt / intent tracking;
- path allowlists or protected-file rules;
- blast-radius analysis;
- code-risk scoring;
- visual regression screenshots;
- developer timelines or session replay.

Those ideas exist independently in Git tooling, visual-regression systems, coding-agent products, CI policy tools, and earlier vibe-coding projects.

## Closest product overlap

A previously published project also named `vibetrace` includes AI diff tracking, risk scoring, intent-aware watching, and intent-mismatch warnings. Other projects provide coding-session timelines, agent checkpoints, path authorization, impact graphs, or visual-regression evidence.

VibeTrace should therefore be evaluated on its implementation and current evidence model rather than on a claim that these primitives are new.

## Current technical focus

The project currently separates three evidence layers:

```text
Prompt intent           Explicit authorization          Observed effect
(heuristic context)  →  (user-declared contract)  →   (Git + visual evidence)
```

That distinction produces two different failure signals:

- **intent mismatch** — the change is broader or qualitatively different from what transparent prompt rules inferred;
- **authorization drift** — the change violated an explicit user-declared path or size boundary.

Authorization drift is intentionally treated as stronger evidence because it is based on a declared contract rather than an inferred interpretation of natural language.

The second focus is an **evidence receipt** that deterministically binds the prompt hash, optional authorization contract, Git before/after objects, analysis, and optional visual hashes. The receipt is designed for local reproducibility and auditability; it is not a signature of authorship and does not claim semantic correctness.

## Why keep both intent and authorization?

A prompt such as "clean up the checkout flow" is semantically broad. A user can still declare a precise operational boundary:

```text
allow: src/checkout/**
deny:  src/auth/**, migrations/**
max files: 8
max lines: 250
```

If the agent edits an auth module, VibeTrace does not need to guess whether the prompt "really meant" auth. The evidence can state a simpler fact: the observed change crossed a declared boundary.

This makes the product less dependent on claiming that its prompt interpretation is uniquely intelligent.

## Ongoing review

The maintainers should update this document when a materially similar project is discovered. If VibeTrace adopts implementation ideas or code from third-party projects in the future, the relevant license and attribution requirements must be handled explicitly rather than hidden behind a generic "inspired by" statement.
