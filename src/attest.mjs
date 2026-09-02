import { createChangeContract } from "./core/contract.mjs";
import { createEvidenceReceipt } from "./core/receipt.mjs";
import { analyzeChangeSet } from "./core/risk.mjs";
import { collectCommitDiff } from "./git/diff.mjs";
import { findRepositoryRoot, repositoryMetadata } from "./git/git.mjs";
import { createWorktreeSnapshot } from "./git/snapshot.mjs";

const HELP = `VibeTrace attest — verify an explicit change contract against the current worktree

Usage:
  vibetrace attest --prompt "Change the button color" \\
    --allow "src/components/**,src/styles/**" \\
    --deny "src/auth/**,src/router/**" \\
    --max-files 3 --max-lines 80 [--json]

The contract is user-declared authorization, not inferred intent. VibeTrace compares it with
HEAD → current worktree, reports scope drift, and emits a deterministic evidence receipt.`;

function parse(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (["--json", "--help", "-h"].includes(token)) {
      options[token] = true;
      continue;
    }
    if (
      !["--prompt", "--allow", "--deny", "--max-files", "--max-lines"].includes(
        token,
      )
    ) {
      throw new Error(`Unknown attest option: ${token}`);
    }
    const value = argv[++index];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${token} requires a value.`);
    }
    options[token] = value;
  }
  return options;
}

function printHuman(checkpoint) {
  const analysis = checkpoint.analysis;
  const contract = checkpoint.authorization;
  const compliance = analysis.contractCompliance;
  console.log("");
  console.log(`✦ VibeTrace scope attestation ${checkpoint.receipt.receiptId}`);
  console.log(`  prompt       ${checkpoint.prompt.text}`);
  console.log(
    `  contract     allow=${contract.allow.join(",") || "*"} deny=${contract.deny.join(",") || "none"}`,
  );
  console.log(
    `  observed     ${analysis.summary.filesChanged} files · ${analysis.summary.linesChanged} lines`,
  );
  console.log(`  compliance   ${compliance.status.toUpperCase()}`);
  for (const violation of compliance.violations) {
    console.log(`  ! ${violation.detail}`);
  }
  console.log(
    `  blast        ${analysis.blastRadius.level.toUpperCase()} (${analysis.blastRadius.score}/100)`,
  );
  console.log(
    `  risk         ${analysis.risk.level.toUpperCase()} (${analysis.risk.score}/100)`,
  );
  console.log(`  before       ${checkpoint.before.commit}`);
  console.log(`  after        ${checkpoint.after.commit}`);
  console.log("");
}

export async function runAttest(argv) {
  const options = parse(argv);
  if (options["--help"] || options["-h"]) {
    console.log(HELP);
    return 0;
  }

  const prompt = options["--prompt"]?.trim();
  if (!prompt) throw new Error("attest requires --prompt.");
  const authorization = createChangeContract({
    allow: options["--allow"],
    deny: options["--deny"],
    maxFiles: options["--max-files"],
    maxLines: options["--max-lines"],
  });
  if (!authorization) {
    throw new Error(
      "attest requires an explicit contract: use --allow, --deny, --max-files, or --max-lines.",
    );
  }

  const root = findRepositoryRoot(process.cwd());
  const repository = repositoryMetadata(root);
  const afterSnapshot = await createWorktreeSnapshot(root, "attestation after");
  const files = collectCommitDiff(root, repository.head, afterSnapshot.commit);
  if (files.length === 0) {
    throw new Error("No worktree changes were detected relative to HEAD.");
  }

  const checkpoint = {
    id: `attest_${afterSnapshot.commit.slice(0, 12)}`,
    sessionId: "ad-hoc-attestation",
    prompt: { text: prompt, source: "manual-cli" },
    authorization,
    repository,
    before: { commit: repository.head },
    after: { commit: afterSnapshot.commit },
    visual: null,
    analysis: analyzeChangeSet({ prompt, files, contract: authorization }),
  };
  checkpoint.receipt = createEvidenceReceipt(checkpoint);

  if (options["--json"]) console.log(JSON.stringify(checkpoint, null, 2));
  else printHuman(checkpoint);
  return checkpoint.analysis.contractCompliance.status === "violated" ? 2 : 0;
}

export { HELP as ATTEST_HELP };
