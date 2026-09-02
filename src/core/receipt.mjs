import { createHash } from "node:crypto";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

function sha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function evidenceForCheckpoint(checkpoint) {
  if (!checkpoint?.before?.commit || !checkpoint?.after?.commit) return null;
  return {
    version: 1,
    checkpointId: checkpoint.id,
    sessionId: checkpoint.sessionId,
    prompt: {
      sha256: sha256(checkpoint.prompt?.text || ""),
      source: checkpoint.prompt?.source || null,
    },
    authorization: checkpoint.authorization
      ? {
          sha256: sha256(checkpoint.authorization),
          contract: checkpoint.authorization,
        }
      : null,
    git: {
      headAtStart: checkpoint.repository?.head || null,
      beforeCommit: checkpoint.before.commit,
      afterCommit: checkpoint.after.commit,
    },
    effect: {
      summary: checkpoint.analysis?.summary || null,
      contractCompliance: checkpoint.analysis?.contractCompliance || null,
      blastRadius: checkpoint.analysis?.blastRadius || null,
      risk: checkpoint.analysis?.risk || null,
    },
    visual: checkpoint.visual
      ? {
          beforeImageSha256: checkpoint.visual.before?.imageSha256 || null,
          afterImageSha256: checkpoint.visual.after?.imageSha256 || null,
          beforeDomHash: checkpoint.visual.before?.dom?.hash || null,
          afterDomHash: checkpoint.visual.after?.dom?.hash || null,
        }
      : null,
  };
}

export function createEvidenceReceipt(checkpoint) {
  const evidence = evidenceForCheckpoint(checkpoint);
  if (!evidence) return null;
  return {
    algorithm: "sha256",
    receiptId: `vtr_${sha256(evidence).slice(0, 24)}`,
    evidence,
  };
}

export function verifyEvidenceReceipt(checkpoint) {
  const stored = checkpoint?.receipt;
  const recomputed = createEvidenceReceipt(checkpoint);
  if (!stored || !recomputed) {
    return {
      valid: false,
      reason: "missing-receipt",
      expectedReceiptId: recomputed?.receiptId || null,
      actualReceiptId: stored?.receiptId || null,
    };
  }
  if (stored.algorithm !== "sha256") {
    return {
      valid: false,
      reason: "unsupported-algorithm",
      expectedReceiptId: recomputed.receiptId,
      actualReceiptId: stored.receiptId || null,
    };
  }
  const idMatches = stored.receiptId === recomputed.receiptId;
  const evidenceMatches =
    sha256(stored.evidence) === sha256(recomputed.evidence);
  return {
    valid: idMatches && evidenceMatches,
    reason: idMatches && evidenceMatches ? "verified" : "evidence-mismatch",
    expectedReceiptId: recomputed.receiptId,
    actualReceiptId: stored.receiptId || null,
  };
}
