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
| `data-age.ts` | `dataAge.report(feed, fetchedAt)` from every adapter; the HUD's DATA AGE shows the oldest live feed, green under 12 h, amber to 48 h, red after (DESIGN §7); `describeAge` gives the state, text and cached flag, `src/net.ts` the online state. Static assets (depth, zones) are not reported, since their age isn't a freshness problem. |

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

## Feeds

| Feed | Built by | Source | Grid and times | Size | Refresh |
|---|---|---|---|---|---|
| `wind` | `scripts/forecast/wind.ts` | Open-Meteo best match (ICON/GFS/ECMWF), 10 m wind | 0.25° over the macro view (29×23); hourly to day 7, 3-hourly to day 16 | ~450 KB | Every 6 h (Pages workflow, `17 */6 * * *`) |
| `wind-clim` | `scripts/fetch-climatology.ts` | NOAA NCEI Blended Sea Surface Winds v2, monthly means 2015–2024 (ERDDAP) | Same grid, 12 months | ~20 KB | Static, committed, precached |
| `waves` | `scripts/forecast/waves.ts` | Météo-France MFWAM (to ~day 9), then NOAA GFS-Wave 0.25° (to day 16), via Open-Meteo Marine | 0.25° grid, 518 sea points (land skipped using the GEBCO grid); 3-hourly; Hs, mean period, direction, primary and secondary swell (height, period, direction each), wind sea (height, period, direction) | ~520 KB | Every 12 h (MFWAM updates twice a day) |
| `waves-clim` | `scripts/fetch-climatology.ts` | ERA5 ocean waves via Open-Meteo, days 8–21 of each month 2020–2024 | 1° grid at sea points, 12 months; Hs, mean period, direction only (no swell partitions in ERA5 there) | small | Static, committed, precached |
| `currents`, `currents-coast` | `scripts/forecast/currents.ts` | Météo-France SMOC 1/12° (Copernicus Marine; includes tides and Stokes drift) via Open-Meteo Marine, to ~day 9 | `currents`: 0.25° grid at 518 sea points; `currents-coast`: SMOC's own 1/12° over Gandoca–Limón (115 sea points). Hourly to day 7, then 3-hourly. The app overlays the nest on the regional grid (`overlayFields`) into one particle field | ~150 KB + ~20 KB | Every 12 h |
| `sst`, `sst-coast` | `scripts/forecast/satellite.ts` | MUR SST v4.1 (NASA JPL) via CoastWatch ERDDAP `jplMURSST41`: gap-free daily analysis, about 2 days late | `sst`: 0.05° over the macro view (141×111); `sst-coast`: the full 0.01° over Gandoca–Limón (126×101). Last 7 daily maps, kind `observed` | ~80 KB + ~16 KB | Every 12 h |
| `chl` | same | Chlorophyll-a, gap-filled (DINEOF) VIIRS NOAA-20/S-NPP, NRT, `noaacwNPPN20VIIRSDINEOFDaily`, about 3 days late | Native 9 km over the macro view (85×67), last 7 daily maps | ~35 KB | Every 12 h |
| `kd490` | same | Kd490, gap-filled VIIRS + OLCI, science quality 2 km, `noaacwNPPN20S3AkdSCIDINEOF2kmDaily`, about 10 days late | Native 2 km over Gandoca–Limón (61×49), last 7 daily maps | ~15 KB | Every 24 h |
| `storms` | `scripts/forecast/storms.ts` | NHC CurrentStorms.json (no CORS, so relayed) | Plain JSON: active Atlantic storms with position, wind, pressure, motion, advisory link; empty list in a quiet season | tiny | Every build (advisories come every 6 h in season) |

Bodies are gzipped (`.i16.gz`, `encoding: 'gzip'` in the manifest) because GitHub Pages doesn't compress binary files; `series.ts` unzips with `DecompressionStream` when it sees the gzip magic bytes.

**Call budget.** The workflow runs every 6 h, but each feed has a `refreshH` (wind 6, waves 12, currents 12): a feed whose published copy is younger is copied forward from the live site instead of refetched. That keeps the build around 8,000 Open-Meteo calls a day, under the 10,000 limit. Open-Meteo weights a request by its variable count past 10, so the secondary swell and wind-sea direction (12 wave variables, was 8) add a few hundred calls a day; if the daily limit is ever hit, the waves `refreshH` is the first thing to raise. Directions are stored as unit vectors so blending frames across north works.

Local development: `npm run data:forecast` fills `public/data/forecast/` (gitignored); without it the app uses the mock fields. `npm run data:climatology` rebuilds the committed climatology.

## Satellite SST and ocean colour (PLAN 2.4)

`src/adapters/satellite.ts` loads the `sst`, `sst-coast`, `chl` and `kd490` maps above. They are observations (manifest `kind: 'observed'`, valid times = when observed), so `observedAt` blends between the days inside the week and holds the newest map for any later time: the slider's whole forecast shows the latest satellite picture, and every reading carries its observation time. Gap-filled products are used because afternoon cloud hides this coast most days; the raw passes with their cloud holes and pass times are PLAN 2.12. The HUD's SST is the newest map at the map centre (the 0.01° nest where it has sea), and the WATER TEMP layer (`src/layers/sst.ts`) draws isotherms from it: every 0.5 °C over the macro view, every 0.25 °C at the coast tier. Bunched isotherms are fronts. Chlorophyll and Kd490 have no layer yet; CLARITY (PLAN 6.1) builds on them (Secchi depth ≈ 1.7 / Kd490).

ERDDAP sends no CORS headers, so these go through the data build. Verify checks per feed: manifest, relay age, how old the newest map is (SST amber past 4 days, chlorophyll 6, Kd490 16) and physical ranges, plus the coast nest against the macro grid.

## Weather (PLAN 7.3)

`src/adapters/weather.ts` fetches rain, cloud, UV and air temperature live from Open-Meteo's multi-model endpoint (GFS, ECMWF IFS, ICON) for one point at the region centre, through the offline cache, and keeps the models separate for the ensemble blend (PLAN 7.4). Models reach different horizons and ECMWF has no UV, so missing hours are NaN. A point is enough for HUD readouts; a gridded radar and cloud layer comes with PLAN 7.5. Storms are relayed by the data build (table above) because NHC sends no CORS headers; the forecast cone needs NHC's GIS files and is left to 7.5. Both feeds have verify checks.

**Currents past day 9.** SMOC stops near day 9 and there is no currents climatology yet, so late LOW CONF and OUTLOOK show the mean of the forecast days (`meanSeries`), which also averages out the tidal currents. A real climatology (Open-Meteo's SMOC archive sampled per month, like the waves one) can replace it once the call budget allows.

## Daily verify run (PLAN 2.8)

`.github/workflows/verify.yml` runs `npm run verify` every day at 06:40 UTC (and on demand). That runs `scripts/verify/live.verify.ts` under Vitest, which executes `allChecks()` from `src/verify/registry.ts` (the same list the SYSTEM CHECK panel runs) against the live site and writes `verify-report.md`/`.json`. The report goes into the run summary; while any feed is red, one issue labelled `verify` is opened and updated, and it closes itself when everything recovers. Amber results are listed but don't open an issue. Run it locally with `npm run verify` (`VERIFY_BASE` picks the site).
