export const CHECKPOINT_SCHEMA_VERSION = 2;
export const CONFIG_SCHEMA_VERSION = 1;

export function validateCheckpoint(value) {
  const issues = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, issues: ["Checkpoint must be an object."] };
  }
  if (value.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${CHECKPOINT_SCHEMA_VERSION}.`);
  }
  if (typeof value.id !== "string" || !/^vt_[a-zA-Z0-9_-]+$/u.test(value.id)) {
    issues.push("id must be a stable vt_* identifier.");
  }
  if (typeof value.sessionId !== "string" || value.sessionId.length < 4) {
    issues.push("sessionId is required.");
  }
  if (!["recording", "completed"].includes(value.status)) {
    issues.push("status must be recording or completed.");
  }
  if (
    !value.prompt ||
    typeof value.prompt.text !== "string" ||
    value.prompt.text.trim() === ""
  ) {
    issues.push("prompt.text is required.");
  }
  if (!value.repository || typeof value.repository.head !== "string") {
    issues.push("repository.head is required.");
  }
  if (!value.before || typeof value.before.commit !== "string") {
    issues.push("before.commit is required.");
  }
  if (value.status === "completed") {
    if (!value.after || typeof value.after.commit !== "string")
      issues.push("after.commit is required when completed.");
    if (!value.analysis || !Array.isArray(value.analysis.files)) {
      issues.push("analysis.files is required when completed.");
    }
  }
  return { valid: issues.length === 0, issues };
}

export function assertValidCheckpoint(value) {
  const result = validateCheckpoint(value);
  if (!result.valid)
    throw new Error(`Invalid checkpoint: ${result.issues.join(" ")}`);
  return value;
}
