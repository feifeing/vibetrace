# Review Control Plane

VibeTrace separates five stages that are easy to blur together in AI-assisted coding:

```text
Intent → Authority → Effect → Review → Disclosure
```

The stages are deliberately different kinds of evidence.

| Stage | Question | Evidence type |
| --- | --- | --- |
| Intent | What did the prompt appear to ask for? | Transparent heuristic context |
| Authority | What did the developer explicitly allow? | User-declared Change Contract |
| Effect | What actually changed? | Git objects + optional visual evidence |
| Review | What narrow contract delta would cover this exact observed effect? | Evidence-bound proposal, never approval |
| Disclosure | What evidence is permitted to leave the local review context? | Explicit Disclosure Policy + Capsule |

## Why add a review plane?

Authorization Drift is a useful stop signal, but it does not answer the next review question:

> If a human really intends to accept this exact already-observed effect, what narrowly expressible change to the original contract would be sufficient?

`vibetrace contract-delta` answers that question inside an intentionally restricted proposal vocabulary.

It may propose:

- an exact observed path that fell outside an existing allow scope;
- a file budget raised only to the exact observed file count;
- a changed-line budget raised only to the exact observed total; or
- a module budget raised only to the exact observed module count.

It never proposes:

- removing an explicit deny rule;
- unprotecting a sensitive surface;
- replacing an exact observed path with a broader glob; or
- applying or persisting the candidate contract.

A protected-path or protected-surface violation therefore remains a human-review blocker even when a mechanical delta can be computed for other parts of the same change.

## The observed effect is recomputed

The report does not use cached `analysis.files` as authority for Contract Delta.

When a standalone report is generated, VibeTrace:

1. recomputes the checkpoint's Evidence Receipt and refuses derived review proposals if that receipt no longer matches;
2. reads the receipt-bound before/after Git object IDs;
3. recomputes the actual Git diff from those objects;
4. evaluates the original Change Contract against that recomputed effect; and
5. computes the restricted local Contract Delta and counterfactual replay from that same effect.

This is important because a UI cache, report summary, or stored file list should not be able to manufacture a permission recommendation that the Git evidence does not support.

The Dashboard therefore reports verification scope precisely:

- **Source receipt verified** means the deterministic Evidence Receipt currently recomputes;
- **Git effect recomputed** means the before/after object pair was diffed again for the Review Plane;
- neither statement means every check performed by `vibetrace verify` necessarily ran inside report generation.

For example, `vibetrace verify` additionally checks referenced private refs and available visual artifact bytes. The Review Plane does not collapse those separate checks into a generic “trusted” badge.

## Counterfactual replay is not approval

A Contract Delta can be evaluated against the same already-observed effect:

```text
original contract + observed effect → violated
candidate contract + same effect   → compliant
```

When the second evaluation is compliant, VibeTrace can label the restricted proposal `proposal-ready`.

That means only:

> the candidate is sufficient for this exact historical effect inside VibeTrace's restricted proposal language.

It does **not** mean:

- the change is safe;
- the code is correct;
- the developer should approve it;
- the agent should receive this authority in the future; or
- the proposal is a globally minimal access-control policy.

The Proposal Receipt (`vtcd_*`) is likewise an integrity record over the source receipt, original contract, recomputed effect, delta, blockers, and replay result. It is not an approval token.

## The browser report is full local evidence

A VibeTrace standalone browser report is designed for local review. It can contain sensitive material such as:

- full prompt text;
- changed file paths;
- Change Contract patterns;
- screenshots;
- DOM/layout evidence; and
- other checkpoint metadata.

Therefore:

> **A browser report is not a share-safe Evidence Capsule.**

The Dashboard intentionally says this explicitly rather than presenting a “share” button that silently exports the current page.

Use a separate minimum-disclosure Capsule when evidence needs to leave the local review context:

```bash
vibetrace capsule <checkpoint>
```

By default the Capsule omits:

```text
promptText
filePaths
contractPatterns
gitPatch
visualArtifactBytes
```

Expanded disclosure requires explicit CLI flags. Capsule construction uses an allowlist projection rather than cloning a checkpoint and attempting to redact it afterward, so newly added checkpoint fields do not become shareable automatically.

The Disclosure Receipt (`vtd_*`) binds the source Evidence Receipt, disclosure-policy hash, and disclosed projection hash. It is not encryption, anonymity, a digital signature, or a zero-knowledge proof.

## Two independent authority boundaries

The resulting architecture has two separate authority questions:

```text
Execution authority
  Change Contract
      ↓
  Did the agent's effect cross the declared coding boundary?

Disclosure authority
  Disclosure Policy
      ↓
  Did the exported evidence cross the declared sharing boundary?
```

The first protects developer work from unintended execution scope. The second reduces accidental over-disclosure of the evidence collected to review that work.

Keeping them separate is more important than giving either one a clever name: a tool can enforce a coding boundary correctly and still leak sensitive review evidence, or disclose a carefully minimized evidence package about a change that was never authorized in the first place.

## Non-novelty boundary

Least privilege, step-up authorization, access-control policy repair, evidence packs, selective disclosure, cryptographic hashes, receipts, and signed attestations all have substantial prior art.

VibeTrace does not claim those primitives as inventions.

The project-specific design being explored is their composition into one local AI-code-change evidence workflow in which:

- inferred intent is not permission;
- execution authority is explicit;
- observed effect is recomputed from Git evidence for review proposals;
- protected boundaries are never automatically relaxed from observed effect alone;
- counterfactual sufficiency is separated from human approval; and
- evidence-disclosure authority is modeled separately from execution authority.

See [Related work and differentiation boundary](related-work.md) for the broader originality boundary.
