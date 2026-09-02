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

export function createEvidenceReceipt(checkpoint) {
  if (!checkpoint?.before?.commit || !checkpoint?.after?.commit) return null;

  const evidence = {
    version: 1,
    checkpointId: checkpoint.id,
    sessionId: checkpoint.sessionId,
    prompt: {
      sha256: sha256(checkpoint.prompt?.text || ""),
      source: checkpoint.prompt?.source || null,
    },
    authorization: checkpoint.authorization
      ? { sha256: sha256(checkpoint.authorization), contract: checkpoint.authorization }
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

  return {
    algorithm: "sha256",
    receiptId: `vtr_${sha256(evidence).slice(0, 24)}`,
    evidence,
  };
}
