#!/usr/bin/env node

if (process.argv[2] === "attest") {
  const { runAttest } = await import("../src/attest.mjs");
  try {
    process.exitCode = await runAttest(process.argv.slice(3));
  } catch (error) {
    console.error(`error ${error.message}`);
    process.exitCode = 1;
  }
} else {
  const { runCli } = await import("../src/cli.mjs");
  process.exitCode = await runCli();
}
