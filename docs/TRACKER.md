# Metric tracker and custom forecast (PLAN 7.13): design proposal

Status: **proposal, not built.** Nothing here is implemented until Joseph approves it.

## Goal
Let a user pick exactly which metrics they care about, for a place they care about, and get a forecast of just those, in a form they can read in seconds on a phone in sunlight. The model is a Bloomberg terminal watchlist: choose, pin, drill down.

## What the user sees
1. **WATCH** button in the top bar (drawer via `src/sheets.ts` on phone, side panel on desktop).
2. **Pick metrics.** A searchable checklist grouped like CONDITIONS (WAVES, WATER, WEATHER, FISHING, PLACE, plus SARGASSUM). Each row: name, unit, one-line meaning (same text as the tap-to-explain card). Presets: SURF, FISH, DIVE, BOAT, or CUSTOM. Max about 8 so the popup stays readable.
3. **Pick a place.** The spot nearest the cross-hair by default, or any named spot. Saved per device.
4. **Generate forecast.** Button opens a popup card: one row per metric, one column per day for 5 days (7 optional).
   - Each cell: a big segmented-digit value, plus a small tone dot (green good, amber caution, red bad) from the same thresholds the HUD already uses.
   - Each row ends with a sparkline of the hourly values over the 5 days with the best window shaded.
   - Header line: "BEST DAY: THU" chosen from the metrics' tones, and the top reason.
   - Rows with low confidence (days 4 to 5 for some feeds) show the value dimmed with a LOW CONF tag, matching the slider's bands.
5. **Export.** SHARE as an image (canvas) and PRINT, so a captain or guide can send it.

## Architecture
- `src/metrics/registry.ts`: one entry per metric `{ id, group, labelKey, unit, helpId, sample(spot, ms) -> number | null, tone(value) -> 'green'|'amber'|'red', dayAgg: 'max'|'mean'|'min' }`. `sample` reuses the existing adapters (`wavesAt`, `windAt`, `tideAt`, SST, clarity forecast, BITE score, sargassum `beachDay`), so there is no second data path and everything keeps working offline from the synced feeds.
- `src/metrics/forecast.ts` (pure, tested, no DOM): `buildForecast(metricIds, spot, startMs, days)` returns `{ rows: { id, hourly: number|null[], daily: { value, tone, conf }[] }[], bestDay }`.
- `src/metrics/watch-ui.ts`: picker drawer and the popup card, using `.panel`, `.seg`, CSS variables only; picker uses `sheets.ts`.
- `src/metrics/store.ts`: selection and place persisted in localStorage, wrapped in try/catch.
- All labels and explanations in `src/i18n` EN and ESP.
- New metrics added later only need a registry entry, which also makes them selectable here. This is the hook for the 7.11 sync pass.

## Not in the first version
Alerts when a watched metric crosses a threshold, multiple saved watchlists, comparing places side by side. Each is a small extension of the same registry.

## Decisions (Joseph, 2026-11-04)
- Layout: shown as two mockups (table A, cards B) for him to pick; see PR #72.
- Place: the user selects a **region** (click-highlight an area on the map), and the forecast lists the **best spots per metric** inside it, not one fixed spot. Registry `sample` runs for every named spot in the region and the popup ranks them per metric.
- SHARE as an image is in the first version.
- Best time (Joseph, 2026-11-04): the forecast names the best two local hours of the best day, not just the day. Each hour is scored by the tone of every hourly metric with a better end (swell, wind, gusts, rain, UV, BITE ...), plus a small bonus for sitting toward the better end of that day's range; window 05:00 to 19:00 (`bestTime` in `src/metrics/forecast.ts`). Daily-only metrics (visibility, sargassum) and metrics with no better end (period, tide) do not vote.
