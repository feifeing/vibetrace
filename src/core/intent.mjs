const RULES = [
  {
    signal: "styles",
    terms: [
      "color",
      "colour",
      "spacing",
      "padding",
      "margin",
      "font",
      "typography",
      "theme",
      "dark mode",
      "css",
      "style",
      "glass",
      "cinematic",
      "颜色",
      "间距",
      "字体",
      "样式",
      "主题",
    ],
  },
  {
    signal: "ui",
    terms: [
      "button",
      "hero",
      "navbar",
      "modal",
      "dialog",
      "card",
      "layout",
      "page",
      "component",
      "empty state",
      "empty-state",
      "responsive",
      "mobile",
      "按钮",
      "页面",
      "组件",
      "布局",
      "响应式",
    ],
  },
  {
    signal: "routing",
    terms: [
      "route",
      "router",
      "navigation",
      "redirect",
      "middleware",
      "路由",
      "跳转",
    ],
  },
  {
    signal: "auth",
    terms: [
      "auth",
      "login",
      "logout",
      "oauth",
      "permission",
      "session",
      "登录",
      "鉴权",
      "权限",
    ],
  },
  {
    signal: "database",
    terms: [
      "database",
      "schema",
      "migration",
      "query",
      "sql",
      "prisma",
      "数据库",
      "迁移",
      "数据表",
    ],
  },
  {
    signal: "dependencies",
    terms: [
      "dependency",
      "package",
      "library",
      "upgrade",
      "install",
      "依赖",
      "升级包",
    ],
  },
  {
    signal: "ci",
    terms: [
      "ci",
      "pipeline",
      "deploy",
      "deployment",
      "github action",
      "docker",
      "部署",
      "流水线",
    ],
  },
  {
    signal: "public-api",
    terms: [
      "public api",
      "endpoint",
      "sdk",
      "export",
      "breaking change",
      "接口",
      "端点",
    ],
  },
  {
    signal: "tests",
    terms: ["test", "spec", "coverage", "e2e", "测试", "覆盖率"],
  },
  {
    signal: "docs",
    terms: [
      "readme",
      "documentation",
      "docs",
      "copy",
      "wording",
      "文档",
      "说明",
      "文案",
    ],
  },
];

const SMALL_TERMS = [
  "only",
  "just",
  "small",
  "tiny",
  "color",
  "colour",
  "copy",
  "wording",
  "spacing",
  "rename",
  "仅",
  "只",
  "小改",
  "颜色",
  "文案",
  "重命名",
];

const BROAD_TERMS = [
  "redesign",
  "rewrite",
  "refactor",
  "migrate",
  "architecture",
  "across the app",
  "entire app",
  "all pages",
  "重新设计",
  "重写",
  "重构",
  "迁移",
  "架构",
  "全站",
];

function matchingTerms(text, terms) {
  return terms.filter((term) => text.includes(term));
}

export function inferPromptIntent(prompt = "") {
  const normalized = String(prompt).trim().toLowerCase();
  const expectedSignals = new Set();
  const matches = [];

  for (const rule of RULES) {
    const terms = matchingTerms(normalized, rule.terms);
    if (terms.length > 0) {
      expectedSignals.add(rule.signal);
      matches.push(...terms.map((term) => ({ signal: rule.signal, term })));
    }
  }

  const broadMatches = matchingTerms(normalized, BROAD_TERMS);
  const smallMatches = matchingTerms(normalized, SMALL_TERMS);
  let scale = "medium";
  if (broadMatches.length > 0) scale = "broad";
  else if (smallMatches.length > 0) scale = "small";

  if (expectedSignals.size === 0) {
    expectedSignals.add("code");
  }

  if (expectedSignals.has("styles")) expectedSignals.add("ui");

  const limits = {
    small: { files: 3, modules: 2 },
    medium: { files: 8, modules: 4 },
    broad: { files: 20, modules: 8 },
  }[scale];

  return {
    method: "transparent-keyword-rules",
    scale,
    expectedSignals: [...expectedSignals],
    expectedMaxFiles: limits.files,
    expectedMaxModules: limits.modules,
    confidence:
      matches.length === 0 ? "low" : matches.length >= 3 ? "high" : "medium",
    matchedTerms: matches,
    note:
      matches.length === 0
        ? "No specific intent terms matched; mismatch penalties are conservative."
        : "Intent is inferred with inspectable keyword rules, not an AI certainty score.",
  };
}
