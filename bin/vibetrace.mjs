#!/usr/bin/env node

function contractArguments(argv) {
  const supported = new Set([
    "--allow",
    "--deny",
    "--max-files",
    "--max-lines",
    "--max-modules",
  ]);
  const clean = [];
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [name, inline] = token.split(/=(.*)/su, 2);
    if (!supported.has(name)) {
      clean.push(token);
      continue;
    }
    const value = inline === undefined ? argv[++index] : inline;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    values[name] = value;
  }

  return { clean, values };
}

async function applyCheckpointContract(argv) {
  if (argv[0] !== "checkpoint") return argv;
  const { clean, values } = contractArguments(argv);
  const hasContract = Object.keys(values).length > 0;
  if (!hasContract) return clean;

  if (clean.includes("--finish") || clean.includes("--abort")) {
    throw new Error(
      "Declare --allow/--deny/--max-files/--max-lines/--max-modules when starting a checkpoint, not when finishing it.",
    );
  }

  const { createChangeContract, setRuntimeChangeContract } =
    await import("../src/core/contract.mjs");
  const contract = createChangeContract({
    allow: values["--allow"],
    deny: values["--deny"],
    maxFiles: values["--max-files"],
    maxLines: values["--max-lines"],
    maxModules: values["--max-modules"],
  });
  setRuntimeChangeContract(contract);
  return clean;
}

try {
  if (process.argv[2] === "attest") {
    const { runAttest } = await import("../src/attest.mjs");
    process.exitCode = await runAttest(process.argv.slice(3));
  } else if (process.argv[2] === "verify") {
    const { runVerify } = await import("../src/verify.mjs");
    process.exitCode = await runVerify(process.argv.slice(3));
  } else {
    const argv = await applyCheckpointContract(process.argv.slice(2));
    const { runCli } = await import("../src/cli.mjs");
    process.exitCode = await runCli(argv);
  }
} catch (error) {
  console.error(`error ${error.message}`);
  process.exitCode = 1;
}
