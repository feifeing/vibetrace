<p align="center">
  <img src="docs/vibetrace-mark.svg" width="76" alt="VibeTrace mark" />
</p>

<h1 align="center">VibeTrace</h1>

<p align="center"><strong>Time travel for vibe coding.</strong></p>
<p align="center">See exactly what every AI prompt did to your website.</p>

<p align="center">
  <a href="https://github.com/feifeing/vibetrace/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/feifeing/vibetrace/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-c8ff66.svg" /></a>
  <img alt="Node 20+" src="https://img.shields.io/badge/node-%3E%3D20-9a7cff.svg" />
</p>

![VibeTrace prompt timeline, visual replay, and blast-radius report](docs/vibetrace-dashboard.png)

AI coding tools are excellent at changing code. They are much worse at answering the question that follows:

> “I asked for a button color. Why did the agent touch routing, auth, and twelve files?”

VibeTrace records a prompt-aware before state, captures the after state, then connects intent to evidence:

**Prompt Intent → Code Change → Blast Radius → Visual Change → Regression Risk → Replay / Restore**

It is local-first, agent-agnostic, and deliberately explainable. VibeTrace does not generate code, replace Git, or invent an opaque “AI confidence” score.

## The killer feature: intent-aware Blast Radius

File count alone cannot tell you whether a change is suspicious. VibeTrace first infers a conservative expected scope using inspectable keyword rules, then compares it with what Git actually observed.

```text
Prompt:  “Change the primary button color”
Intent:  styles + UI · small scope · about 1–3 files
Actual:  12 files · 6 modules · routing + auth + dependencies touched
Result:  CRITICAL BLAST RADIUS · explicit intent mismatch
```

Every point in the risk score has a visible reason: file count, changed lines, directory/module spread, sensitive areas, dependency changes, public APIs, global styles, large-refactor shape, or prompt/change mismatch.

## Try the interface

```bash
git clone https://github.com/feifeing/vibetrace.git
cd vibetrace
npm install
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The included report uses realistic fixture data so the product language is understandable before any setup.

## Trace a real AI change

Install the repository CLI locally:

```bash
npm link
cd /path/to/your-project
vibetrace init
```

Start the checkpoint **before** the agent edits:

```bash
vibetrace checkpoint --prompt "Make the hero cinematic"
```

Let your AI tool make the change, preview the live impact, and finish:

```bash
vibetrace diff
vibetrace checkpoint --finish
vibetrace report --open
```

For an existing worktree change, use the safe one-step form:

```bash
vibetrace checkpoint --prompt "Describe the change that just happened" --from-head
```

If the worktree is unchanged, the one-step command refuses to create a meaningless checkpoint.

### Optional visual evidence

Install the pinned Chromium runtime once, keep the website running, then attach its URL when starting the checkpoint:

```bash
npx playwright install chromium
```

```bash
vibetrace checkpoint \
  --prompt "Make the hero cinematic" \
  --url http://localhost:3000

# AI edits the code; your dev server reloads
vibetrace checkpoint --finish
vibetrace report --open
```

Playwright records the same Chromium viewport before and after. VibeTrace v0.2 reports only what it can measure:

| Layer               | v0.2 support | Meaning                                                  |
| ------------------- | ------------ | -------------------------------------------------------- |
| Pixel difference    | Yes          | Thresholded RGBA pixels changed                          |
| Layout change       | Basic        | Visible elements added, removed, moved, or resized       |
| DOM change          | Basic        | DOM fingerprint and visible-node delta                   |
| Semantic regression | **No**       | VibeTrace does not claim the change is correct or broken |

Browser rendering can vary by OS, browser build, fonts, and hardware. Compare captures from the same environment for meaningful results.

## CLI

| Command                                         | What it does                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `vibetrace init`                                | Creates local state and adds `/.vibetrace/` to `.git/info/exclude`  |
| `vibetrace checkpoint --prompt "…"`             | Records a before snapshot and opens a prompt-aware checkpoint       |
| `vibetrace checkpoint --finish`                 | Records the after snapshot, analyzes it, and closes the checkpoint  |
| `vibetrace checkpoint --abort`                  | Removes the active checkpoint metadata, artifacts, and private refs |
| `vibetrace checkpoint --prompt "…" --from-head` | Captures existing changes relative to `HEAD`                        |
| `vibetrace diff [id]`                           | Shows the live or saved change map, Blast Radius, and risk factors  |
| `vibetrace diff --scope staged\|unstaged\|all`  | Normalizes a specific Git change source                             |
| `vibetrace diff --json`                         | Emits analysis for agents and future integrations                   |
| `vibetrace replay`                              | Replays the prompt timeline for the current session                 |
| `vibetrace session new --name "…"`              | Starts a separate prompt timeline without touching Git history      |
| `vibetrace report [id]`                         | Generates a standalone local visual report                          |

Run `vibetrace --help` for all options.

## How checkpoints work

VibeTrace does **not** commit to your branch, stash your work, or replace the real index. It builds each snapshot with a temporary Git index, writes a local Git tree/commit object, and anchors it under:

```text
refs/vibetrace/checkpoints/<id>/before
refs/vibetrace/checkpoints/<id>/after
```

This captures tracked, staged, unstaged, renamed, deleted, and untracked non-ignored files without moving `HEAD`. Checkpoint JSON remains human-readable in `.vibetrace/checkpoints/`.

The refs establish a reliable rollback foundation. A guarded one-command restore is intentionally still on the roadmap: v0.2 will not overwrite a developer's later work merely to advertise a “restore” button.

See [the architecture and data model](docs/architecture.md) for module boundaries and invariants.

## Risk model

The deterministic `vibetrace-explainable-risk-v1` model is a review prioritizer, not a probability of failure.

```text
risk = file scope
     + line churn
     + directory/module spread
     + sensitive-area weights
     + large-refactor shape
     + prompt/change mismatch
     + unexpected visual movement (when captured)
```

Each contribution is capped, stored in the checkpoint, printed by the CLI, and rendered beside the report. The engine lives independently from Git parsing and UI code so a future model can replace it without changing the schema contract.

## Architecture

| Module                  | Responsibility                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| `src/git/`              | Safe snapshot creation and NUL-delimited Git diff parsing         |
| `src/core/intent.mjs`   | Transparent prompt-scope inference                                |
| `src/core/classify.mjs` | File, module, and sensitive-area classification                   |
| `src/core/risk.mjs`     | Explainable Blast Radius and regression-risk factors              |
| `src/core/store.mjs`    | Atomic checkpoint/session persistence                             |
| `src/visual/`           | Optional Playwright capture and basic pixel/layout/DOM comparison |
| `src/report/` + `web/`  | Standalone report generation and zero-framework UI                |
| `bin/vibetrace.mjs`     | Thin executable boundary                                          |

The core CLI has no production framework or database. Playwright and PNG decoding are optional development adapters because they directly support the product's visual-evidence loop.

## What is real in v0.2

- [x] Two-phase prompt-aware checkpoints
- [x] Non-mutating Git worktree snapshots, including untracked files
- [x] Working tree / staged / unstaged / commit diff normalization
- [x] Intent-aware Blast Radius and explainable risk factors
- [x] Stable checkpoint schema, sessions, timeline, and JSON output
- [x] Playwright before/after screenshots
- [x] Basic pixel, layout, and DOM regression evidence
- [x] Standalone interactive reports
- [x] Unit, integration, CLI, visual, and browser tests
- [x] Pull-request CI

## Roadmap

- [ ] Guarded restore with drift detection, dry-run, and explicit confirmation
- [ ] Agent hooks that attach prompt metadata without vendor lock-in
- [ ] PR annotations and portable `.vibe` session bundles
- [ ] Deterministic masking for volatile screenshot regions
- [ ] Accessibility-tree diff and user-authored regression assertions

VibeTrace will not claim semantic regression detection until it has an evidence model that can defend that claim.

## Philosophy

**Intent before telemetry.** A change is only “too large” relative to what was asked.

**Explainable before intelligent.** A visible heuristic is more useful than a mysterious score.

**Git-compatible, not Git-shaped.** VibeTrace adds prompt and visual context without becoming another Git GUI.

**One complete loop before a platform.** The core workflow should be trustworthy before integrations multiply.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Focused issues and pull requests are welcome, especially around diff edge cases, intent rules, risk calibration, and deterministic capture.

Security reports belong in [SECURITY.md](SECURITY.md), not public issues.

## License

[MIT](LICENSE) © VibeTrace contributors
