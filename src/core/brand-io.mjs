const REPLACEMENTS = [
  [/VibeTrace/gu, "PatchOath"],
  [/vibetrace/gu, "patchoath"],
  [/\.vibetrace/gu, ".patchoath"],
  [/\b0\.2\.0\b/gu, "0.3.0"],
  [/time travel for vibe coding/gu, "evidence-backed change control for AI coding"],
];

export function brandText(value) {
  let text = String(value);
  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function brandedStream(stream) {
  return {
    get isTTY() {
      return stream.isTTY;
    },
    write(value) {
      return stream.write(brandText(value));
    },
  };
}

export function brandedIo(io = {}) {
  return {
    ...io,
    stdout: brandedStream(io.stdout || process.stdout),
    stderr: brandedStream(io.stderr || process.stderr),
  };
}
