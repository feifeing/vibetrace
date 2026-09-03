#!/usr/bin/env node

import { brandedIo } from "../src/core/brand-io.mjs";

function contractArguments(argv) {
  const supported = new Set([
    "--allow",
    "--deny",
    "--protect-surface",
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
      "Declare change-contract options when starting a checkpoint, not when finishing it.",
    );
  }

  const { createChangeContract, setRuntimeChangeContract } =
    await import("../src/core/contract.mjs");
  const contract = createChangeContract({
    allow: values["--allow"],
    deny: values["--deny"],
    protectedSurfaces: values["--protect-surface"],
    maxFiles: values["--max-files"],
    maxLines: values["--max-lines"],
    maxModules: values["--max-modules"],
  });
  setRuntimeChangeContract(contract);
  return clean;
}

const io = brandedIo();

try {
  if (process.argv[2] === "attest") {
    const { runAttest } = await import("../src/attest.mjs");
    process.exitCode = await runAttest(process.argv.slice(3), io);
  } else if (process.argv[2] === "verify") {
    const { runVerify } = await import("../src/verify.mjs");
    process.exitCode = await runVerify(process.argv.slice(3), io);
  } else if (process.argv[2] === "restore") {
    const { runRestore } = await import("../src/restore.mjs");
    process.exitCode = await runRestore(process.argv.slice(3), io);
  } else if (process.argv[2] === "capsule") {
    const { runCapsule } = await import("../src/capsule.mjs");
    process.exitCode = await runCapsule(process.argv.slice(3), io);
  } else if (process.argv[2] === "contract-delta") {
    const { runContractDelta } = await import("../src/contract-delta.mjs");
    process.exitCode = await runContractDelta(process.argv.slice(3), io);
  } else if (process.argv[2] === "review") {
    const { runReview } = await import("../src/review.mjs");
    process.exitCode = await runReview(process.argv.slice(3), io);
  } else {
    const argv = await applyCheckpointContract(process.argv.slice(2));
    const { runCli } = await import("../src/cli.mjs");
    process.exitCode = await runCli(argv, io);
  }
} catch (error) {
  io.stderr.write(`error ${error.message}\n`);
  process.exitCode = 1;
}
