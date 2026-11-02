# Data pipeline (PLAN 2.1)

How forecast and live data get from the models and gauges to the HUD, stay usable offline, and line up with the time slider. Sources and why each was picked: `docs/OBSERVATIONS.md`. Static layers (depth, reefs, zones): `docs/SEAFLOOR.md`.

## Two paths

**1. Gridded forecasts go through a scheduled data build.** A GitHub Action runs `scripts/fetch-forecast.ts` every few hours. It fetches each model grid once (Open-Meteo for wind, waves, currents and modelled sea level; ERA5 for climatology), packs it into a small binary file plus a JSON manifest under `public/data/forecast/`, and redeploys the Pages site. Phones only ever download those files.

Why not let each phone call Open-Meteo directly:
- **Rate limits.** Open-Meteo counts every grid point as a call, about 10,000 a day per IP. One wind grid is several hundred points; a handful of users scrubbing the slider would exhaust it. The build fetches once for everyone.
- **Offline.** One file per feed is easy to cache and to ship in "Sync for trip" (PLAN 5.1).
- **Size.** Packed Int16 grids are about a tenth the size of the JSON.
- **CORS.** Some sources (UHSLC, ERDDAP, aviationweather.gov) don't allow browser calls at all, so they need the build anyway.

If a fetch fails, the build keeps the previous files from the live site, so the app shows older data with an amber or red DATA AGE rather than nothing.

**2. Live point readings can come straight from the source** when it allows browser calls (the IOC Limón gauge does). They go through the same cache helper, so the last reading is still there offline.

## The pieces (`src/adapters/`)

| File | Job |
|---|---|
| `pack.ts` | The packed grid-series format: `SeriesMeta` manifest (feed, kind, fetchedAt, model run, grid, valid times, variables with scale/offset, which model covered which hours, licence) and an Int16 body, −32768 = no data. `encodeSeries` (build) and `decodeSeries` (app), plus `validateMeta`, which the verify tool's schema check reuses. No imports, so the Node build loads it directly. |
| `cache.ts` | `cachedFetch(url)`: network first with a timeout; good responses are stored in Cache Storage with an `x-fetched-at` header; offline or on an HTTP error it returns the stored copy with `fromCache: true` and its original fetch time. |
| `series.ts` | `loadSeries('wind')`: fetch manifest and body through the cache, validate, decode, report the age. |
| `frames.ts` | Time and band logic: `bracket` finds the frames either side of the slider's valid time, `vectorAt` gives a blended `VectorField` (what `layers/flow.ts` draws), `scalarAt` samples one value at a point, NaN-aware so readings next to the coast still work. `pickSeries` decides which series answers (below). |
| `data-age.ts` | `dataAge.report(feed, fetchedAt)` from every adapter; the HUD's DATA AGE shows the oldest live feed, green under 12 h, amber to 48 h, red after (DESIGN §7). Static assets (depth, zones) are not reported, since their age isn't a freshness problem. |

Rules every adapter follows (from CLAUDE.md, made concrete):
- Return data plus `fetchedAt`, and report it to `dataAge`.
- Fetch only through `cachedFetch` (directly or via `loadSeries`).
- Vector fields are `physics/flow.ts` `VectorField` in m/s, u east, v north; scalars in SI (m, s, °C, degrees true for directions, "from" for wind and waves, "toward" for currents).
- Export its verify checks (below). An adapter without checks is incomplete (DESIGN §10).

## Time slider bands

Each feed can publish two series: `<feed>.json` (kind `forecast`) and `<feed>-clim.json` (kind `climatology`, daily means for the coming 30 days' calendar dates, averaged over past years). `pickSeries(band, validMs, forecast, clim)`:

| Band | Answer |
|---|---|
| FORECAST, LOW CONF | The forecast series while it covers the valid time (within 3 h of its ends), otherwise climatology. Waves and currents models stop near day 9, so late LOW CONF shows climatology for them and the HUD says so. |
| OUTLOOK | Always climatology. |

Tides don't use series: they are a harmonic prediction on the device, exact in every band.

Between frames, values blend linearly in time, so the 3-hourly late forecast and the daily climatology still scrub smoothly hour by hour.

## Verify hooks (`src/verify/types.ts`)

A `Check` is `{ feed, kind, label, run() → { status, detail } }`, with `kind` one of reach, fresh, schema, range, agree, and status pass (green), warn (amber) or fail (red). Helpers: `freshness(ageMs, cadenceMs)`, `inRange(values, min, max)`, `agreement(a, b, tol)`, `runChecks(checks)`. Each adapter exports its list; the daily Action (2.8) and the SYSTEM CHECK panel (2.9) run the same lists.

## Service worker

`data/forecast/**` is left out of the precache (it changes every few hours and would force an app update each time). `cachedFetch` owns its offline copy instead, so there is one cache and one notion of age. "Sync for trip" (5.1) will pre-fill the same cache.
