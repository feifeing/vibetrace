import { dirname, extname } from "node:path";

const SIGNAL_RULES = [
  [
    "ci",
    /(^|\/)(\.github\/workflows|\.circleci|buildkite|jenkins|azure-pipelines)|(^|\/)(dockerfile|compose\.ya?ml)$/i,
  ],
  [
    "dependencies",
    /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|requirements\.txt|poetry\.lock|cargo\.lock|go\.(mod|sum))$/i,
  ],
  [
    "auth",
    /(^|\/)(auth|authentication|login|logout|oauth|session|permissions?)(\/|\.|$)/i,
  ],
  [
    "database",
    /(^|\/)(database|db|migrations?|schema|prisma)(\/|\.|$)|\.sql$/i,
  ],
  ["routing", /(^|\/)(routes?|router|middleware|navigation)(\/|\.|$)/i],
  [
    "public-api",
    /(^|\/)(api|sdk|exports?|public-api)(\/|\.|$)|(^|\/)index\.d\.ts$/i,
  ],
  [
    "global-styles",
    /(^|\/)(global|globals|theme|tokens?|variables?|reset)\.(css|scss|sass|less)$/i,
  ],
  [
    "config",
    /(^|\/)(vite|next|nuxt|astro|webpack|rollup|eslint|prettier|tsconfig|jsconfig|babel|vitest|jest|playwright)\.(config\.)?[cm]?[jt]s(on)?$/i,
  ],
  [
    "tests",
    /(^|\/)(__tests__|tests?|specs?|e2e)(\/|\.|$)|\.(test|spec)\.[cm]?[jt]sx?$/i,
  ],
  [
    "docs",
    /(^|\/)(docs?|readme|contributing|security|changelog)(\/|\.|$)|\.mdx?$/i,
  ],
  ["styles", /\.(css|scss|sass|less|styl)$/i],
  ["ui", /\.(html|jsx|tsx|vue|svelte|astro)$/i],
];

const PRIMARY_PRIORITY = [
  "ci",
  "dependencies",
  "auth",
  "database",
  "routing",
  "public-api",
  "global-styles",
  "config",
  "tests",
  "docs",
  "styles",
  "ui",
  "code",
];

export function normalizeRepoPath(path) {
  return String(path).replaceAll("\\", "/").replace(/^\.\//u, "");
}

export function moduleForPath(path) {
  const normalized = normalizeRepoPath(path);
  const parts = normalized.split("/");
  if (parts.length === 1) return "(root)";
  if (
    ["apps", "packages", "services", "modules", "features"].includes(
      parts[0],
    ) &&
    parts[1]
  ) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (
    ["src", "app", "web", "lib"].includes(parts[0]) &&
    parts[1] &&
    !parts[1].includes(".")
  ) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

export function classifyFile(path) {
  const normalized = normalizeRepoPath(path);
  const signals = SIGNAL_RULES.filter(([, pattern]) =>
    pattern.test(normalized),
  ).map(([signal]) => signal);
  if (signals.length === 0) signals.push("code");
  const category =
    PRIMARY_PRIORITY.find((candidate) => signals.includes(candidate)) || "code";

  return {
    category,
    signals,
    module: moduleForPath(normalized),
    directory: normalizeRepoPath(dirname(normalized)) || "(root)",
    extension: extname(normalized).toLowerCase() || "(none)",
  };
}
