function normalizePatterns(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function globToRegex(pattern) {
  const normalized = String(pattern).replaceAll("\\", "/");
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char !== "*") {
      source += escapeRegex(char);
      continue;
    }
    if (normalized[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else {
      source += "[^/]*";
    }
  }
  return new RegExp(`^${source}$`, "u");
}

function matchesAny(path, patterns) {
  if (patterns.length === 0) return false;
  const normalized = path.replaceAll("\\", "/");
  return patterns.some((pattern) => globToRegex(pattern).test(normalized));
}

function finiteLimit(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error("Change-contract limits must be non-negative integers.");
  }
  return number;
}

export function createChangeContract({
  allow = [],
  deny = [],
  maxFiles = null,
  maxLines = null,
} = {}) {
  const contract = {
    version: 1,
    mode: "explicit-user-authorization",
    allow: normalizePatterns(allow),
    deny: normalizePatterns(deny),
    maxFiles: finiteLimit(maxFiles),
    maxLines: finiteLimit(maxLines),
  };
  const enabled =
    contract.allow.length > 0 ||
    contract.deny.length > 0 ||
    contract.maxFiles !== null ||
    contract.maxLines !== null;
  return enabled ? contract : null;
}

export function evaluateChangeContract(contract, files = []) {
  if (!contract) {
    return {
      declared: false,
      status: "not-declared",
      violations: [],
      authorizedFiles: files.map((file) => file.path),
      unauthorizedFiles: [],
      protectedFiles: [],
      totals: {
        files: files.length,
        lines: files.reduce(
          (sum, file) => sum + (file.additions || 0) + (file.deletions || 0),
          0,
        ),
      },
    };
  }

  const violations = [];
  const unauthorizedFiles = [];
  const protectedFiles = [];
  const authorizedFiles = [];
  const allowIsRestrictive = contract.allow.length > 0;

  for (const file of files) {
    const path = file.path.replaceAll("\\", "/");
    const denied = matchesAny(path, contract.deny);
    const allowed = !allowIsRestrictive || matchesAny(path, contract.allow);
    if (denied) protectedFiles.push(path);
    if (!allowed) unauthorizedFiles.push(path);
    if (!denied && allowed) authorizedFiles.push(path);
  }

  if (protectedFiles.length > 0) {
    violations.push({
      id: "protected-path-touched",
      detail: `${protectedFiles.length} protected path(s) changed: ${protectedFiles.join(", ")}`,
    });
  }
  if (unauthorizedFiles.length > 0) {
    violations.push({
      id: "outside-authorized-scope",
      detail: `${unauthorizedFiles.length} file(s) fell outside the declared allow scope: ${unauthorizedFiles.join(", ")}`,
    });
  }

  const lines = files.reduce(
    (sum, file) => sum + (file.additions || 0) + (file.deletions || 0),
    0,
  );
  if (contract.maxFiles !== null && files.length > contract.maxFiles) {
    violations.push({
      id: "file-budget-exceeded",
      detail: `${files.length} files changed; contract allows at most ${contract.maxFiles}`,
    });
  }
  if (contract.maxLines !== null && lines > contract.maxLines) {
    violations.push({
      id: "line-budget-exceeded",
      detail: `${lines} lines changed; contract allows at most ${contract.maxLines}`,
    });
  }

  return {
    declared: true,
    status: violations.length === 0 ? "compliant" : "violated",
    violations,
    authorizedFiles,
    unauthorizedFiles,
    protectedFiles,
    totals: { files: files.length, lines },
  };
}
