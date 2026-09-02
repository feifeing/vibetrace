import { verifyEvidenceReceipt } from "./core/receipt.mjs";
import { listCheckpoints } from "./core/store.mjs";
import { findRepositoryRoot } from "./git/git.mjs";

const HELP = `vibetrace verify [checkpoint] [--json]\n\nRecompute a completed checkpoint's Evidence Receipt from its stored evidence.\nThe command exits 0 when the receipt verifies and 2 when evidence no longer matches.\n\nOptions:\n  --json     Emit machine-readable verification output\n  -h, --help Show help`;

function parse(argv) {
  const options = new Set();
  const positionals = [];
  for (const token of argv) {
    if (token === "--json" || token === "--help" || token === "-h") {
      options.add(token);
      continue;
    }
    if (token.startsWith("-")) throw new Error(`Unknown option: ${token}`);
    positionals.push(token);
  }
  if (positionals.length > 1) throw new Error(`Unexpected argument: ${positionals[1]}`);
  return { checkpoint: positionals[0] || null, options };
}

function resolve(checkpoints, token) {
  const completed = checkpoints.filter((checkpoint) => checkpoint.status === "completed");
  if (!token) {
    if (!completed[0]) throw new Error("No completed checkpoint exists yet.");
    return completed[0];
  }
  const matches = completed.filter(
    (checkpoint) => checkpoint.id === token || checkpoint.id.startsWith(token),
  );
  if (matches.length === 0) throw new Error(`Checkpoint ${token} was not found.`);
  if (matches.length > 1) throw new Error(`Checkpoint prefix ${token} is ambiguous.`);
  return matches[0];
}

export async function runVerify(argv = process.argv.slice(3), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    parsed = parse(argv);
  } catch (error) {
    stderr.write(`error ${error.message}\n`);
    return 1;
  }

  if (parsed.options.has("--help") || parsed.options.has("-h")) {
    stdout.write(`${HELP}\n`);
    return 0;
  }

  try {
    const root = findRepositoryRoot(io.cwd || process.cwd());
    const checkpoint = resolve(await listCheckpoints(root), parsed.checkpoint);
    const verification = verifyEvidenceReceipt(checkpoint);
    const result = {
      checkpointId: checkpoint.id,
      ...verification,
    };

    if (parsed.options.has("--json")) {
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (verification.valid) {
      stdout.write(`verified ${checkpoint.id}\n`);
      stdout.write(`receipt  ${verification.actualReceiptId}\n`);
      stdout.write("evidence matches the stored receipt\n");
    } else {
      stdout.write(`failed   ${checkpoint.id}\n`);
      stdout.write(`reason   ${verification.reason}\n`);
      if (verification.actualReceiptId)
        stdout.write(`stored   ${verification.actualReceiptId}\n`);
      if (verification.expectedReceiptId)
        stdout.write(`current  ${verification.expectedReceiptId}\n`);
    }
    return verification.valid ? 0 : 2;
  } catch (error) {
    stderr.write(`error ${error.message}\n`);
    return 1;
  }
}
