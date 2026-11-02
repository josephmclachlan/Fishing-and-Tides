# CLAUDE.md

Ocean conditions + fishing app for Costa Rica's Caribbean coast (Gandoca to Limón). Read `docs/DESIGN.md` for the product and `docs/PLAN.md` for the task list; tick tasks off in PLAN.md in the PR that completes them.

## Stack
- Vite + TypeScript (strict), no UI framework; plain DOM modules.
- MapLibre GL JS for the map (OpenFreeMap dark style, no API key).
- WebGL (or deck.gl if needed) for particles.
- vite-plugin-pwa for the service worker and manifest.
- Vitest for unit tests (add with the first physics task).

## Commands
- `npm run dev` / `npm run build` / `npm run preview` / `npm test` (Vitest)
- Build must pass (`tsc` + `vite build`) before every PR.

## Layout
- `src/main.ts` entry, `src/map.ts` map setup, `src/hud.ts` HUD, `src/mock.ts` mock data.
- Future: `src/adapters/` (one file per data source), `src/physics/` (pure, tested, no DOM), `src/layers/`.

## Rules
- Region bounds and constants live in `src/region.ts`; never hard-code coordinates elsewhere.
- Physics code is pure functions with SI units, documented formulas, and tests.
- Every data adapter returns data plus a `fetchedAt` timestamp (feeds DATA AGE).
- Keep PRs small: one PLAN.md task per PR.
- No new dependencies without a reason in the PR description.

## Style
- Colours via CSS variables in `src/style.css`: `--amber`, `--green`, `--red`, `--bg`. No other colours.
- Numbers use the `.seg` segmented-digit class; labels are monospace caps.
- Panels use `.panel` with corner brackets; glow via `text-shadow`, not images.
- Must stay readable on a phone in sunlight.
