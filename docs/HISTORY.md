# History archive (PLAN 8.1)

The live feeds only look a few days back, and our own forecasts are gone once the next run replaces them. So every hourly Pages run saves a small sample of what the app saw to the **`history` branch**, one CSV per UTC day. Public ocean data only: nothing from anyone's phone (catches, pins, tracks, coral sites) ever goes here, because the repo and site are public. Private logs wait for the Supabase step (8.2).

Plan and options: [History storage plan](https://claude.ai/artifact/KVyU7RUq2UP2XZes71ATSL).

## How it runs

1. The `build` job runs `npm run data:forecast` as before and uploads `public/data/forecast` as a one-day artifact.
2. The `archive` job (`.github/workflows/pages.yml`, the only job with `contents: write`) checks out the `history` branch as a worktree in `history/` (creating it as an orphan branch on the first run), runs `npm run data:archive` (`scripts/archive.ts`), and commits and pushes whatever is new. A failure there never holds up the deploy.
3. Rows go into `data/YYYY/YYYY-MM-DD.csv` by the UTC day of their valid time. A row whose key (every column but the value) is already in the file is skipped, so the hourly reruns and feeds copied forward from the live site add nothing twice. Logic and tests: `src/history/archive.ts`.

Locally: `npm run data:forecast && HISTORY_DIR=/tmp/history npm run data:archive` (add `-- --models` to fetch the per-model weather at any hour).

## Format

```csv
t,site,source,model,var,value,issued
2026-11-04T15:00Z,CAHUITA,wind,,u,2.7954,2026-11-04T15:24Z
2026-11-04T17:00Z,MRLM,metar,,tempC,29,
```

| Column | Meaning |
|---|---|
| `t` | Valid time (forecast) or observation time, UTC, to the minute |
| `site` | A `SPOTS` name from `src/region.ts`, a station (`MRLM`, `limon`), an NHC storm id, a `PLUME_RIVERS` name (`RÍO SIXAOLA`), `SARG_BOX`, or `lng;lat` for a sargassum cell |
| `source` | The feed (`docs/DATA.md`) or service |
| `model` | Weather model for `openmeteo` rows (`gfs_seamless`, `ecmwf_ifs025`, `icon_seamless`), else empty |
| `var` | Variable, below |
| `value` | Five significant figures |
| `issued` | Forecasts only: the run time, else when the build fetched it. Empty for observations |

## What is saved

| Source | Sites | Variables (units) | Times kept |
|---|---|---|---|
| `wind` | 8 spots | `u`, `v` (m/s, toward east and north) | First 24 h of each run, 3-hourly (4 runs a day) |
| `waves` | 8 spots | `hs` (m), `tm` (s), `du`/`dv` (unit vector of travel), primary swell `swh`/`swt`/`swu`/`swv`, wind sea `wwh`/`wwt`, secondary swell `s2h`/`s2t` | Same, 2 runs a day |
| `currents` | 8 spots | `u`, `v` (m/s), coastal nest where it has sea | Same, 2 runs a day |
| `mld` | 8 spots | `mld` (m) | Daily means in the first 24 h |
| `sst`, `chl`, `kd490` | 8 spots | `sst` (°C, coastal nest first), `chl` (mg/m³), `kd490` (1/m) | Every daily map, each saved once |
| `sargassum` | Cells with weed; `SARG_BOX` | `cover` (share of the sea surface); `cellsSeen` (cells not hidden by cloud, so a cloudy day isn't read as clear) | Every daily map |
| `metar` | `MRLM` | `windFromDeg`, `windKt`, `gustKt`, `tempC`, `dewC`, `pressureHpa` | Every report |
| `gauge` | `limon` | `levelM` (10-minute mean above MSL), `tideM` (our harmonic prediction at the bin centre) | Last 90 min each run |
| `openmeteo` | `MRLM` | `temperature_2m` (°C), `wind_speed_10m`, `wind_gusts_10m` (kn), `wind_direction_10m` (°), `pressure_msl` (hPa) per model | Next 24 h hourly, at the 00, 06, 12 and 18 UTC runs |
| `nhc` | Storm id | `lng`, `lat`, `windKt`, `pressureMb`, `movementDeg`, `movementKt` | Each advisory |
| `imerg` | Each `PLUME_RIVERS` river | `rainMm` (NASA GPM IMERG Early satellite rain over the river's catchment cells, mm in the UTC day), `halfHours` (how many of the day's 48 it had; the total is their mean rate × 24 h) | Each finished UTC day, saved once 12 h after it ends, when it has at least 44 half hours (PLAN 7.51) |

About 4,000 to 5,000 rows a day, roughly 200 KB of CSV, which git compresses to a few tens of MB a year.

## Not yet saved

- Our own scores (BITE, surf quality, clarity, dive and sail ratings). They can be recomputed from the inputs above and will be labelled "recomputed" (8.5).
- Lightning counts (the lightning workflow runs on its own schedule; to add).
- Anything private: waits for 8.2.
- Years before today: backfilled from the archives in 8.5 (MUR SST from 2002, Coral Reef Watch heat stress from 1985, ERA5 waves and wind from 1940, GloFAS river flow from 1984).

The app can read this branch directly from `raw.githubusercontent.com` (CORS allowed) until 8.4 moves it into Supabase.
