# Data pipeline (PLAN 2.1)

How forecast and live data get from the models and gauges to the HUD, stay usable offline, and line up with the time slider. Sources and why each was picked: `docs/OBSERVATIONS.md`. Static layers (depth, reefs, zones): `docs/SEAFLOOR.md`. What the build saves for later (the `history` branch): `docs/HISTORY.md`.

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

`data/forecast/**` is left out of the precache (it changes every few hours and would force an app update each time). `cachedFetch` owns its offline copy instead, so there is one cache and one notion of age. "Sync for trip" (5.1) pre-fills the same cache.

Everything else under `public/data` (seafloor grids, reefs, zones, fishing records, climatology) is precached with the app, so it is on the phone from the first visit.

Map style, fonts, sprites and tiles from OpenFreeMap go through one route: stale-while-revalidate into `map-tiles`, capped at 3,000 entries (oldest evicted). Vector tile keys drop the weekly planet folder (`/planet/20261025_080012_pt/14/…` → `/planet/v/14/…`), so a tile cached last week is still found after OpenFreeMap publishes a new build.

## Sync for trip (PLAN 5.1)

The SYNC FOR TRIP button (`src/sync-ui.ts`, `src/offline/`) gets the phone ready for a day with no signal:

1. **Map** (`offline/tiles.ts`, `offline/sync.ts`): the dark style, its TileJSON, sprites at 1× and 2×, six glyph ranges of Noto Sans Regular, and the tiles of `tripPlan()`: z0–6 over `REGION.viewBounds` (everything you can pan to), z7–10 over `REGION.maxBounds`, z11–14 over `REGION.bounds` (the coast). The hillshade raster stops at its z6. About 2,170 tiles and 23 MB, taking from under a minute to a few minutes depending on signal; 8 downloads at a time, one retry each. They go into their own cache, `trip-v1`, which nothing evicts; the service worker's map route falls back to it when `map-tiles` misses (the `cachedResponseWillBeUsed` plugin in `vite.config.ts`). Sync requests carry `ftsync=1`, which the route skips, so each tile is stored once.
2. **Forecasts and feeds** (`offline/jobs.ts`): wind, waves, currents, satellite SST and ocean colour, weather, catchment rain, river flow, storms, the Limón gauge (now stored under a stable key, since its URL carries the time) and lightning, each fetched once through `cachedFetch`. A feed counts as missing when nothing was published or, for the feeds that report it, when the network failed and the older copy was kept.
3. **Check**: the seafloor manifest, grids and reef files are in the precache.

The result (`{ at, tiles, failed, bytes, feeds, feedsFailed, staticOk, persisted }`) is kept in `localStorage['ft.sync']` and shown in the TRIP row: green within a day of a complete sync, amber after or when something was missing, red after 7 days. The sync also asks the browser to keep the site's storage (`navigator.storage.persist()`), which phones grant to installed apps.

Fishing and rip scores are not stored: they are computed on the phone from the synced inputs (tide, waves, wind, seafloor, habitat model), so they stay right for any time on the slider.

### Every layer, its data, offline and verify (PLAN 7.9)

`src/offline/jobs.test.ts` fails if a feed in the verify list (`src/verify/registry.ts`) has no sync job or precache entry, so a new feed can't be checked daily but missed by the sync.

| Layer (LAYERS panel) | Data | Offline | Verify feeds |
|---|---|---|---|
| WAVES/SWELL | `waves` forecast, waves climatology | sync job `waves`; climatology precached | waves |
| CURRENTS | `currents`, `currents-coast` | sync `currents` | currents |
| WIND | `wind` forecast, wind climatology | sync `wind`; climatology precached | wind, wind-clim |
| WATER TEMP | satellite SST | sync `sst` | sst, sst-coast |
| FRONTS | satellite SST (macro and coast nest) and chlorophyll, newest map | sync `sst` | sst, sst-coast, chl |
| CLARITY | satellite chlorophyll and Kd490, catchment rain, currents, waves, seafloor | sync `sst`, `rain`, `currents`, `waves`; seafloor precached | sst, rain |
| SARGASSUM | AFAI detections, currents, wind, seafloor (coastline) | sync `sargassum`, `currents`, `wind`; seafloor precached | sargassum |
| WEATHER | Open-Meteo weather, NHC storms | sync `weather`, `storms` | weather, storms |
| LIGHTNING | GLM flashes (collector branch) | sync `lightning` (live site only) | lightning |
| LIVE OBS | gauge, airport METAR, satellite passes (SST, colour, ASCAT wind) | sync `gauge`, `metar`, `passes` | gauge, metar, sst-pass, chl-pass, scat-pass |
| RIP RISK, SURF BREAKS | waves, wind, tide (on device), seafloor | from the synced inputs | through waves and wind |
| DEPTH, REEFS, SEAMARKS | seafloor grids, reefs, OSM marks | precached | (static build) |
| FISHING | OBIS/GBIF records, river mouths, plus tide, sun and moon on device; BITE also reads wind, waves, weather, lightning, the gauge, clarity, satellite SST and chlorophyll, sargassum and GloFAS river flow | precached, plus the synced inputs and sync `river` | occurrences, obis, gbif, river |
| FISHING BOATS | Global Fishing Watch effort, last year | sync `effort` | effort |
| PROTECTED, ANCHORAGES | zones GeoJSON, harbours in `region.ts` | precached / built in | (static build) |
| Basemap | OpenFreeMap style, fonts, tiles | sync map step (`trip-v1`) | none |

Checked in the built app (Chromium, `vite preview`): after a sync with the browse cache emptied and the network off, the region map loads at z9 and at z14.5 over Cahuita with no failed map requests, wind and the gauge line draw from the stored copies, and DATA AGE shows OFFLINE.

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
| `sst-pass` | same | ACSPO L3S SST afternoon and night passes (NOAA), not gap-filled | 0.02° over Gandoca–Limón (63×51), last 4 days, two passes a day, each stamped with its pass time; `seaCells` in the manifest so cloud can be told from land | ~6 KB | Every 6 h |
| `chl-pass` | same | NOAA-20 VIIRS chlorophyll NRT 4 km, not gap-filled, stamped at the nominal 18:57 UTC overpass | 34×27 over Gandoca–Limón, last 7 days | ~1 KB | Every 12 h |
| `sargassum` | `scripts/forecast/satellite.ts` | USF Alternative Floating Algae Index, daily, NOAA AOML OceanWatch ERDDAP (`noaa_aoml_atlantic_oceanwatch_AFAI_1D`, 0.015°), flagged here (`src/adapters/sargassum-parse.ts`) | Weed cover (share of the sea surface) per 0.06° cell over `SARG_BOX` (59×47), last 7 days, NaN where cloud, land or the coast hid it | ~1 KB | Every 12 h |
| `scat-pass` | `scripts/forecast/satellite.ts` + `scripts/scat.py` | ASCAT wind on Metop-B and Metop-C, Copernicus Marine `WIND_GLO_PHY_L3_NRT_012_002` (L3 swaths, 0.125°), through the Copernicus Marine Python toolbox with the account in the `COPERNICUSMARINE_USERNAME` / `COPERNICUSMARINE_PASSWORD` Actions secrets | u, v over `SCAT_BOX` (20×18, the coast plus ~120 km of sea), last 4 days, up to four swaths a day, each stamped with its median measurement time | ~4 KB | Every 6 h |
| `effort` | `scripts/forecast/effort.ts` | Global Fishing Watch 4Wings report, `public-global-fishing-effort:latest` (AIS apparent fishing effort), POST with the box as GeoJSON, token in the `GFW_TOKEN` Actions secret; about 4 days late | Fishing hours per 0.1° cell over `EFFORT_BOX` (25×23), summed over the last 365 days and all flags, one frame, kind `observed` | ~1 KB | Every 24 h |
| `mld` | `scripts/forecast/satellite.ts` + `scripts/mld.py` | Mixed-layer depth (`mlotst`), Copernicus Marine global ocean model `GLOBAL_ANALYSISFORECAST_PHY_001_024`, daily means `cmems_mod_glo_phy_anfc_0.083deg_P1D-m`, same toolbox and account as `scat-pass` | Metres over `MLD_BOX` (= `SCAT_BOX`) at 1/12°, yesterday to 10 days ahead, kind `forecast` | ~5 KB | Every 24 h |
| `storms` | `scripts/forecast/storms.ts` | NHC CurrentStorms.json (no CORS, so relayed) | Plain JSON: active Atlantic storms with position, wind, pressure, motion, advisory link; empty list in a quiet season | tiny | Every build (advisories come every 6 h in season) |

Bodies are gzipped (`.i16.gz`, `encoding: 'gzip'` in the manifest) because GitHub Pages doesn't compress binary files; `series.ts` unzips with `DecompressionStream` when it sees the gzip magic bytes.

**Call budget.** The workflow runs every 6 h, but each feed has a `refreshH` (wind 6, waves 12, currents 12): a feed whose published copy is younger is copied forward from the live site instead of refetched. That keeps the build around 8,000 Open-Meteo calls a day, under the 10,000 limit. Open-Meteo weights a request by its variable count past 10, so the secondary swell and wind-sea direction (12 wave variables, was 8) add a few hundred calls a day; if the daily limit is ever hit, the waves `refreshH` is the first thing to raise. Directions are stored as unit vectors so blending frames across north works.

Local development: `npm run data:forecast` fills `public/data/forecast/` (gitignored); without it the app uses the mock fields. `npm run data:climatology` rebuilds the committed climatology.

## Satellite SST and ocean colour (PLAN 2.4)

`src/adapters/satellite.ts` loads the `sst`, `sst-coast`, `chl` and `kd490` maps above. They are observations (manifest `kind: 'observed'`, valid times = when observed), so `observedAt` blends between the days inside the week and holds the newest map for any later time: the slider's whole forecast shows the latest satellite picture, and every reading carries its observation time. Gap-filled products are used because afternoon cloud hides this coast most days; the raw passes with their cloud holes and pass times are PLAN 2.12. The HUD's SST is the newest map at the map centre (the 0.01° nest where it has sea), and the WATER TEMP layer (`src/layers/sst.ts`) draws a tinted fill from it (green under 27.5 °C, amber to 29.5 °C, red above, stronger shading for warmer water within each colour) with labelled isotherms on top: every 0.5 °C over the macro view, every 0.25 °C at the coast tier. Bunched isotherms are fronts. The fill is there because the nearshore sea is often within half a degree everywhere, which gives one or two isotherms or none. Chlorophyll and Kd490 feed CLARITY (PLAN 6.1, below).

ERDDAP sends no CORS headers, so these go through the data build. Verify checks per feed: manifest, relay age, how old the newest map is (SST amber past 4 days, chlorophyll 6, Kd490 16) and physical ranges, plus the coast nest against the macro grid.

## Satellite passes (PLAN 2.12)

`src/adapters/passes.ts` reads `sst-pass` and `chl-pass`: `passList` gives each pass its time, the share of the sea it saw (cells with a value / the manifest's `seaCells`) and its mean, and `latestSeen` the newest pass that saw a point. These are what LIVE OBS (2.13) shows and what the bias correction (7.10) will learn from. Checks: newest pass age, a clear pass within 3 days for SST and 7 for chlorophyll (amber only: cloud is weather, not a fault), and the mean pass-minus-MUR SST over clear cells (amber past 0.8 °C). 

**Scatterometer wind (PLAN 2.14).** `scat-pass` holds every ASCAT swath that crossed `SCAT_BOX` in the last 4 days: Metop-B and Metop-C, each with a morning (descending, ~14:00–15:30 UTC) and an evening (ascending, ~02:00–03:30 UTC) pass. The Copernicus Marine toolbox is Python, so `scripts/scat.py` reads the four datasets (ARCO zarr, subset server-side) and writes JSON that `buildScatPass` packs; the workflow installs the toolbox from `scripts/requirements.txt` and hands the two secrets to the data build step only. ASCAT is radar, so its holes are swath gaps and the ~20 km band along the coast it cannot see, not cloud; "clear" in `passList` means covered. The files are interim daily, so the newest pass is usually 12 to 36 h old. Checks: relay age (a stale relay usually means the login failed), newest pass under 2 days, a covering pass in 3 days, speeds 0..50 m/s, and the newest covering pass against Open-Meteo best match (the model behind the wind feed) at the pass time on up to 12 cells: amber past 3.5 m/s RMS vector difference, red past 6.

## LIVE OBS (PLAN 2.13)

`src/live-obs.ts` shows the newest real measurement from each source, with its age and a freshness lamp: the Limón tide gauge (level above MSL and departure from the predicted tide), the Limón airport METAR (wind, gust, air temperature), the newest SST and chlorophyll passes that saw at least 10% of the sea (mean, clear share, afternoon or night), and the newest ASCAT swath that covered at least 10% of `SCAT_BOX` (vector-mean direction, mean speed in knots, coverage, morning or evening). The limits follow each source's normal cadence:

| Source | Green up to | Amber up to |
|---|---|---|
| Gauge | 30 min | 3 h |
| METAR | 90 min | 14 h (the airport is closed overnight) |
| SST pass | 48 h | 4 days |
| Chlorophyll pass | 4 days | 8 days |
| Satellite wind pass | 36 h | 4 days |

It is a drawer behind an OBS tab whose lamp shows the stalest source; on phones the tab sits in SET with SYSTEM CHECK. It also shows as map labels (catalog layer `obs`, style ids `ob-`) at the stations and at the centre of what each pass saw.

## Corrections from observations (PLAN 7.10)

Two corrections are learnt on the phone each time their data loads, held in `src/corrections.ts`, and shown with their confidence under MODEL CORRECTIONS in the LIVE OBS drawer.

**Wind map vs satellite** (`src/adapters/wind-fix.ts`). For every ASCAT pass in the last 4 days, the wind feed's model (Open-Meteo best match, read at up to 20 cells seen by two or more passes, one multi-point call with `past_days`) is compared with the satellite at the pass time. The fit is a speed scale k = Σ|obs||model| / Σ|model|², shrunk toward 1 by P/(P+2) for P passes and clamped to 0.8..1.25. The forecast wind's u and v are multiplied by k when they load, so the particles, readouts, BITE, surf and sargassum drift all see the same corrected wind. The climatology (OUTLOOK band) is not touched. A scale is used rather than an offset because model wind errors over the sea grow with the wind. Passes, not cells, set the confidence, since the cells of one pass share the same weather: HIGH with 4 or more passes and ≤2.5 m/s RMS left, MEDIUM up to 4 m/s, LOW beyond. A LOW fit is shown but not applied: that much error left means the model has the pattern wrong, not just the strength. ASCAT reports equivalent-neutral wind, about 0.2 m/s above the true 10 m wind in warm seas, which is left in. The fix is for the open sea; ASCAT sees nothing within ~20 km of land, so the land and sea breezes at the coast are not corrected by it.

**Tide vs gauge** (`src/physics/tide-fix.ts`). The IOC Limón gauge minus the harmonic prediction, as hourly means over the last 24 h. Their mean is the offset (spikes over 0.5 m are dropped, and an offset over 0.3 m is not applied because it more likely means a gauge or datum fault). It is added to the predicted tide in full up to the newest reading, then fades as exp(−Δt / 2 days), on the TIDE readout, the tide chart, next high and low, spot pages, surf-break physics and dive depth. The 24 h mean averages out the harmonics running slightly early or late, which swings the residual both ways within a day. The fade is persistence: sea-level anomalies from pressure, wind set-up, river outflow and seasonal warming last days here, but not a month. Confidence: HIGH with 20+ hours and a spread of 6 cm or less, MEDIUM up to 12 cm. LIVE OBS still shows the raw gauge reading against the uncorrected tide.

**Sea temperature** needs no correction: the app shows the satellite analysis itself (MUR, with the passes as a cross-check); there is no SST model forecast to correct.

**Air temperature and gusts** are the PLAN 7.4 blend (docs/WEATHER.md), scored against the airport.

Checks (amber only): the wind scale with its pass count and RMS before and after (amber at the clamp or with fewer than two passes), and the 24 h gauge offset within ±0.15 m.

The windows are short on purpose: 24 h of gauge and 4 days of passes are what the app has without a history store. Longer windows belong with the history archive being planned in its own thread, not a separate store here.

## Water clarity (PLAN 6.1)

`src/physics/clarity.ts` turns everything into a diffuse attenuation coefficient and adds the causes, since attenuation from separate causes adds: Kd = Kd490 (satellite; chlorophyll through Morel and Maritorena 2001 where the map has none; 0.11/m background with neither) + river plume + swell resuspension. Visibility is the Secchi depth 1.7 / Kd. Green 8 m or more, amber 3 to 8 m, red under 3 m.

- **River flow** (PLAN 7.15): `src/adapters/river-flow.ts` fetches daily GloFAS discharge and its long-term median for each `PLUME_RIVERS` mouth from Open-Meteo's flood API (7 days back, 16 ahead, one call, no key). GloFAS runs on a ~5 km grid, so a small river's mouth may land in a neighbour's cell; fishing uses only the flow as a share of that cell's own median. Not validated against gauged flows here.
- **River plumes**: `PLUME_RIVERS` in `src/region.ts` (Sixaola, Estrella, Banano, Bananito) each have a mouth, an approximate catchment area and a rain point inside the catchment. `src/adapters/catchment-rain.ts` fetches hourly rain for those points straight from Open-Meteo (3 days back, 16 ahead, one call). Rain before the valid time is weighted by exp(−age / 24 h). A plume reaches full strength (Kd 3/m, about 0.6 m visibility) at 60 mm of that weighted rain, and spreads as a Gaussian 6 km wide for a 1000 km² catchment, scaling with √(area × strength).
- **Resuspension**: the bed orbital velocity from the waves adapter's Hs and period at the cell's depth (Soulsby 1997). It adds up to 1.1/m between 0.15 and 0.5 m/s.

These constants are round-number rules of thumb, not fitted: there are no local dive logs or turbidity records to calibrate against yet.

**Forecast and confidence (PLAN 7.2, `src/physics/clarity-forecast.ts`).** The satellite term no longer freezes at the newest map, which runs days late (gap-filled Kd490 about a week, chlorophyll two or three days):

- Per cell, the daily maps give a median, the newest value and the trend over the last three days, all in ln Kd. Ahead of the newest map the trend carries on for up to 2 days, and the departure from the median fades with an e-folding time of 3 days.
- Its 1σ spread grows from the retrieval error (±30%) to the cell's own day-to-day spread.
- River plumes now drift. The tip is the mouth plus the surface current at the mouth (averaged over the plume's rain-weighted age) times that age, capped at 30 km. The plume is the same Gaussian around the mouth-to-tip segment, so after rain it smears up or down the coast with the current.
- The band adds the low and high ends of each term: satellite ×/÷ e^σ, plume ×/÷ (2 + 0.5 per day of lead), and resuspension with the wave height ±(15% + 5% per day).
- It reads as the likely range, about 1σ. Confidence is HIGH when high/low visibility is under 2, MEDIUM under 3.5, LOW above.

In the HUD, VIS shows the estimate, then the range and the cause (`5 M 3–9 PLANKTON`, confidence in the tooltip). VIS +DAYS gives midday visibility at the cross-hair for the next three days, with `?` on a low-confidence day. The CLARITY layer (`src/layers/clarity.ts`) computes this every 0.004° over the region for the slider's hour, so plumes grow and clear as you scrub through forecast rain. The VIS readout under SST gives the value at the cross-hair and names the main cause (RIVER, SWELL or PLANKTON).

## Sargassum (PLAN 7.1)

**Detection** (`src/adapters/sargassum-parse.ts`, run by the data build). The daily USF AFAI map (Hu et al. 2015; Wang and Hu 2016) at 0.015° over `SARG_BOX`. A pixel is weed when its AFAI stands more than max(8e-4, 5 σ) above the median of its 0.3° block, σ being the day's robust noise. Wang and Hu's MODIS cut (1.79e-4) flags 15–20% of clear sea in this product, so the cut is set from the noise instead. Not judged: pixels within ~3 km of cloud, ~9 km of land or shallower than 20 m; blocks whose background is turbid (plume water, more than 3e-4 above the day's median); lone flagged pixels; and any 6 km cell more than half flagged (glint or a processing stripe: one sat off Punta Gorda on 2026-10-29). A flagged pixel's weed fraction is ΔAFAI / 0.02 (the AFAI of a fully covered pixel), and each 0.06° cell publishes the mean over its judged pixels, NaN when fewer than 4 were judged. On 2026-10-26 to 11-01 this found mats in 0 to 16 cells a day, the clearest a streak 30–60 km off Limón; the first, looser cut had put most detections along the Tortuguero–San Juan plume front. Treat it as indicative: it is not validated against USF's own SaWS product.

**Forecast** (`src/physics/drift.ts`, `src/layers/sargassum.ts`, on the phone). Each cell's newest sighting in the last 5 days seeds a mat (up to 400, largest first) with its weed area (cover × cell area, km²). Mats move with dx/dt = current + α · wind10, midpoint steps of an hour, for α = 1, 2 and 3% (published drift studies of pelagic Sargassum find 1–3%). The current is the `currents` feed (SMOC, which already includes tides and Stokes drift) with the coastal nest; between the model's last sea cell and the beach the nearest current within two cells is used, else wind only. Before the forecasts begin (sightings are 1 to 5 days old) their first hour stands in, i.e. persistence. A mat that reaches the coast within 8 km of a named spot lands there; each beach gets the weed area per day for 5 days (averaged over the three windages), its first arrival and how many windages agree. Levels per day: LOW from 0.01 km², MOD from 0.1, HIGH from 0.5 (a few kg of weed per m², so 0.1 km² is a few hundred tonnes; uncalibrated).

**Display.** Amber cells where weed was last seen (stronger with more), faint hatching over sea not seen in 5 days (unknown, not clear), dim dashed tracks of the 2% member with a dot at the slider's time, and beach labels when a landing is forecast. The SARG readout under VIS gives the level at the spot nearest the cross-hair for the slider's day and the first arrival day, or ASHORE; it says CLOUD instead of NONE when under a fifth of the sea was seen. On 2026-11-02 the mats seen off Limón and Tortuguero all drift south-east toward Bocas del Toro and Colón with the coastal current, so no beach here gets a landing.

Checks: manifest, relay age (12 h cadence), newest map under 3 days (red past 6), a fifth of the sea seen in 5 days (amber only: cloud is weather), cover within 0..1.

## Weather (PLAN 7.3)

`src/adapters/weather.ts` fetches rain, cloud, UV and air temperature live from Open-Meteo's multi-model endpoint (GFS, ECMWF IFS, ICON) for one point at the region centre, through the offline cache, and keeps the models separate for the ensemble blend (PLAN 7.4). Models reach different horizons and ECMWF has no UV, so missing hours are NaN. A point is enough for HUD readouts; a gridded radar and cloud layer comes with PLAN 7.5. Storms are relayed by the data build (table above) because NHC sends no CORS headers; the forecast cone needs NHC's GIS files and is left to 7.5. Both feeds have verify checks.

**Currents past day 9.** SMOC stops near day 9 and there is no currents climatology yet, so late LOW CONF and OUTLOOK show the mean of the forecast days (`meanSeries`), which also averages out the tidal currents. A real climatology (Open-Meteo's SMOC archive sampled per month, like the waves one) can replace it once the call budget allows.

## Daily verify run (PLAN 2.8)

`.github/workflows/verify.yml` runs `npm run verify` every day at 06:40 UTC (and on demand). That runs `scripts/verify/live.verify.ts` under Vitest, which executes `allChecks()` from `src/verify/registry.ts` (the same list the SYSTEM CHECK panel runs) against the live site and writes `verify-report.md`/`.json`. The report goes into the run summary; while any feed is red, one issue labelled `verify` is opened and updated, and it closes itself when everything recovers. Amber results are listed but don't open an issue. Run it locally with `npm run verify` (`VERIFY_BASE` picks the site).
