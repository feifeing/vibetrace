# VibeTrace ✦

> **Time travel for vibe coding.**
>
> Your AI changed the code. VibeTrace tells you what it actually changed.

VibeTrace is an open-source, local-first developer tool for recording AI coding prompts and turning every vibe-coding session into an inspectable checkpoint: **prompt → files changed → blast radius → risk score → replayable timeline**.

The goal is simple: make AI-assisted frontend work easier to understand, review, and undo.

## Why VibeTrace?

Vibe coding is fast, but it is often hard to answer a basic question:

> “I asked for a small UI tweak. Why did the agent touch half my app?”

VibeTrace makes that visible.

- **Prompt Timeline** — preserve the intent behind every AI-generated change.
- **Blast Radius** — see how far a seemingly small request spread through the codebase.
- **Risk Score** — flag large, cross-cutting, or infrastructure-heavy edits.
- **Before / After Replay** — inspect a visual story of what changed.
- **Local-first Checkpoints** — checkpoint data stays in your repository.
- **AI-tool agnostic** — designed to sit beside Codex, Claude Code, Cursor, Copilot, Windsurf, or any other coding agent.

## The idea

```text
Prompt
  │
  ▼
AI edits your project
  │
  ▼
VibeTrace checkpoint
  ├── changed files
  ├── git diff summary
  ├── blast radius
  ├── risk score
  └── timeline entry
```

A request like:

```text
Make the primary button blue.
```

should not silently become:

```text
11 files changed · theme rewritten · routing touched · HIGH blast radius
```

VibeTrace is built to make that mismatch obvious.

## Quick start

VibeTrace currently has **zero runtime dependencies**.

```bash
git clone https://github.com/feifeing/vibetrace.git
cd vibetrace
npm run dev
```

Open `http://localhost:4173`.

Create a real checkpoint from the current Git working tree:

```bash
npm run checkpoint -- --prompt "Make the hero section cinematic"
```

VibeTrace writes a JSON checkpoint into `.vibetrace/checkpoints/` containing the prompt, changed files, diff statistics, timestamp, and computed risk.

You can also call the CLI directly:

```bash
node bin/vibetrace.mjs checkpoint --prompt "Refine the navbar glass effect"
```

## Current MVP

The first public build focuses on the smallest useful loop:

1. record the prompt;
2. inspect changed files from Git;
3. calculate a transparent blast-radius score;
4. save a portable checkpoint;
5. explore the concept in an interactive browser dashboard.

The dashboard also lets you create local demo checkpoints in the browser so the product idea is immediately understandable without setup.

## Risk model

The MVP intentionally uses a simple, explainable heuristic instead of pretending to have magical AI certainty.

Risk increases when a change:

- touches many files;
- crosses several project areas;
- modifies dependency, configuration, CI, routing, auth, or database-related files;
- has a high number of inserted/deleted lines.

The scoring model is deliberately easy to audit and will evolve with community feedback.

## Roadmap

- [x] Prompt-aware checkpoints
- [x] Git diff + file-change capture
- [x] Blast-radius scoring
- [x] Interactive timeline prototype
- [x] Local browser checkpoint playground
- [ ] Automatic agent hooks
- [ ] Screenshot capture with Playwright
- [ ] Pixel-level visual diff
- [ ] DOM / accessibility diff
- [ ] Lighthouse performance regression guard
- [ ] One-click Git restore
- [ ] Shareable `.vibe` session bundles
- [ ] GitHub PR report integration

## Project principles

**Local first.** Your prompts and code history should not require a hosted service.

**Explainable over magical.** If VibeTrace labels something risky, you should be able to see why.

**Agent agnostic.** The project should describe what changed, not force you into one AI vendor.

**Visual by default.** Vibe coding is often frontend-heavy; the debugging experience should be visual too.

## Contributing

Ideas, issues, experiments, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Good first contribution areas include:

- better risk heuristics;
- adapters for AI coding tools;
- visual diff experiments;
- richer checkpoint schemas;
- GitHub Actions / PR annotations;
- design improvements to the timeline.

## License

MIT © VibeTrace contributors

---

**VibeTrace** — *See exactly what every AI prompt did to your website.*
