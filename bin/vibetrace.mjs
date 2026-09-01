#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const args = process.argv.slice(2);
const command = args[0];
const promptIndex = args.indexOf('--prompt');
const prompt = promptIndex >= 0 ? args[promptIndex + 1] : '';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function parseNumstat(text) {
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => {
    const [addedRaw, deletedRaw, ...rest] = line.split('\t');
    const path = rest.join('\t');
    const added = Number.isFinite(Number(addedRaw)) ? Number(addedRaw) : 0;
    const deleted = Number.isFinite(Number(deletedRaw)) ? Number(deletedRaw) : 0;
    return { path, added, deleted };
  });
}

function classify(path) {
  const p = path.toLowerCase();
  if (/(package(-lock)?\.json|pnpm-lock|yarn\.lock|vite\.config|next\.config|tsconfig|eslint|prettier|\.github\/workflows)/.test(p)) return 'config';
  if (/(auth|login|session|oauth)/.test(p)) return 'auth';
  if (/(route|router|middleware)/.test(p)) return 'routing';
  if (/(schema|migration|database|prisma|sql)/.test(p)) return 'data';
  if (/\.(css|scss|sass|less)$/.test(p)) return 'styles';
  if (/\.(tsx|jsx|vue|svelte|html)$/.test(p)) return 'ui';
  if (/\.(test|spec)\./.test(p)) return 'tests';
  return 'code';
}

function scoreRisk(files) {
  const categories = new Set(files.map((f) => classify(f.path)));
  const lines = files.reduce((sum, f) => sum + f.added + f.deleted, 0);
  let score = 8;
  score += Math.min(files.length * 6, 36);
  score += Math.min(Math.round(lines / 20), 24);
  score += Math.max(0, categories.size - 1) * 6;
  const sensitive = files.filter((f) => ['config', 'auth', 'routing', 'data'].includes(classify(f.path))).length;
  score += Math.min(sensitive * 8, 24);
  score = Math.min(score, 100);
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, level, lines, categories: [...categories] };
}

async function checkpoint() {
  if (!prompt) {
    console.error('Missing --prompt. Example: vibetrace checkpoint --prompt "Make the hero cinematic"');
    process.exit(1);
  }

  let root;
  try {
    root = git(['rev-parse', '--show-toplevel']);
  } catch {
    console.error('VibeTrace must run inside a Git repository.');
    process.exit(1);
  }

  const unstaged = parseNumstat(git(['diff', '--numstat']));
  const staged = parseNumstat(git(['diff', '--cached', '--numstat']));
  const merged = new Map();
  for (const file of [...unstaged, ...staged]) {
    const current = merged.get(file.path) || { path: file.path, added: 0, deleted: 0 };
    current.added += file.added;
    current.deleted += file.deleted;
    merged.set(file.path, current);
  }
  const files = [...merged.values()];
  const risk = scoreRisk(files);
  const now = new Date();
  const id = now.toISOString().replace(/[:.]/g, '-');
  const head = git(['rev-parse', '--short', 'HEAD']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);

  const payload = {
    schemaVersion: 1,
    id,
    prompt,
    createdAt: now.toISOString(),
    repo: basename(root),
    branch,
    head,
    summary: {
      filesChanged: files.length,
      linesChanged: risk.lines,
      categories: risk.categories,
      riskScore: risk.score,
      riskLevel: risk.level
    },
    files: files.map((file) => ({ ...file, category: classify(file.path) }))
  };

  const outDir = join(root, '.vibetrace', 'checkpoints');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${id}.json`);
  await writeFile(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`\n✦ VibeTrace checkpoint created`);
  console.log(`  prompt: ${prompt}`);
  console.log(`  files:  ${files.length}`);
  console.log(`  risk:   ${risk.level.toUpperCase()} (${risk.score}/100)`);
  console.log(`  saved:  ${outFile}\n`);
}

if (command === 'checkpoint') {
  await checkpoint();
} else {
  console.log(`VibeTrace\n\nUsage:\n  vibetrace checkpoint --prompt "Describe the AI change"`);
}
