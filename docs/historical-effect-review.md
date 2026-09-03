# Historical Effect Review Records

`vibetrace review` records a human review outcome for an **already-observed, already-recorded** checkpoint effect.

It exists to keep one important distinction explicit:

```text
accept this historical effect
            ≠
grant the coding agent future authority
```

The feature deliberately avoids the broader term “Decision Receipt”. Approval/decision receipts, human-in-the-loop records, signed approval chains, and policy-decision logs already have substantial prior art across AI governance and software-change systems. VibeTrace does not claim to invent those concepts.

## Create a review

```bash
vibetrace review --accept-effect
vibetrace review vt_204718_a91f3c --reject-effect
vibetrace review --needs-follow-up --note "Security review required"
```

Optional reviewer labels are local assertions only:

```bash
vibetrace review \
  --accept-effect \
  --reviewer "Maintainer A" \
  --note "Accepted for this checkpoint only"
```

VibeTrace records the label but does **not** authenticate that identity.

## Verification prerequisite

Before VibeTrace creates a review record, the source checkpoint must pass the same verification path used by:

```bash
vibetrace verify
```

That includes the deterministic Evidence Receipt and, when present, the referenced Git evidence and visual artifact bytes.

If the source evidence no longer verifies, VibeTrace refuses to create a new review record. This prevents a modified or incomplete checkpoint from being retrospectively legitimized through the review command.

## Separate storage

Review records live under:

```text
.vibetrace/reviews/
```

They are intentionally stored **outside** checkpoint JSON.

Recording a review must not rewrite:

- the checkpoint;
- its Evidence Receipt;
- its Change Contract;
- its protected surfaces;
- its before/after Git object references; or
- the Contract Delta derived from that historical effect.

This separation is covered by regression tests that compare the checkpoint bytes before and after recording a review.

## Dispositions

Current review dispositions are:

```text
accept-effect
reject-effect
needs-follow-up
```

`accept-effect` is intentionally narrower than `approve`.

It means only that a reviewer chose to record acceptance of the exact historical effect bound to the source Evidence Receipt. It does not mean that the same files, modules, sensitive surfaces, or line budget are authorized for a future agent action.

`reject-effect` records rejection of the historical effect. It does not automatically restore the worktree.

`needs-follow-up` records that additional human review or remediation is needed. It is not a security finding or a guarantee that a problem exists.

## Review Record integrity

A record binds:

```text
checkpoint ID
source Evidence Receipt ID
source evidence version
historical review disposition
timestamp
optional note
optional claimed reviewer label
explicit no-future-authority boundary
```

It receives an ID of the form:

```text
vrr_<sha256-derived-id>
```

The hash is an integrity mechanism, not a digital signature or identity proof.

Verify a record with:

```bash
vibetrace review --verify vrr_...
```

Verification checks both the review record integrity and the current source checkpoint evidence. Tampering with the review record or invalidating the source checkpoint causes verification to fail.

## List records

```bash
vibetrace review --list
vibetrace review vt_204718_a91f3c --list --json
```

## Authority invariant

Every review record carries an explicit authority statement equivalent to:

```text
scope: historical-effect-only
mutatesChangeContract: false
grantsFutureAuthority: false
changesProtectedSurfaces: false
```

This is not merely explanatory text. Verification rejects a record whose stored authority boundary has been changed.

A future feature that grants or changes execution authority must therefore use a separately named mechanism and cannot silently reinterpret a Historical Effect Review Record as permission.

## Privacy boundary

Notes and reviewer labels can themselves be sensitive. They remain local evidence and should not automatically flow into a minimum-disclosure Evidence Capsule.

If review metadata becomes shareable in a future Capsule version, it should require an explicit Disclosure Policy field rather than being added through object spreading or an implicit schema expansion.
