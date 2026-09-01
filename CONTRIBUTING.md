# Contributing to VibeTrace

Thanks for helping make vibe coding more inspectable.

## Local setup

VibeTrace currently has no runtime dependencies beyond Node.js 18+.

```bash
git clone https://github.com/feifeing/vibetrace.git
cd vibetrace
npm run dev
```

Then open `http://localhost:4173`.

## Contribution ideas

Good first areas include:

- improving blast-radius heuristics;
- adding screenshot capture with Playwright;
- experimenting with DOM or accessibility diffs;
- adapters for popular AI coding agents;
- turning checkpoints into PR annotations;
- improving the visual timeline and replay UI.

## Pull requests

Please keep pull requests focused, explain the user problem being solved, and include screenshots for visual changes when possible.

For behavior changes, include a short description of how you verified the change.

## Design principles

1. Local-first by default.
2. Agent-agnostic rather than vendor-locked.
3. Explainable risk scoring over opaque claims.
4. Useful output before additional complexity.
