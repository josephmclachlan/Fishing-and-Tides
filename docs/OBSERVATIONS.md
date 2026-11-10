# Live observations and forecast feeds (PLAN 2.10)

Which real readings and model feeds actually exist for **Gandoca to Limón**, checked from the build machine on 2026-11-02. Every URL below was fetched; "CORS" says whether a browser on the deployed site can call it directly, which decides whether the app fetches it itself or the scheduled data build (see `docs/DATA.md`) fetches it and republishes it as static JSON.

## Short answer

- **Tide gauge: yes, two feeds from the same Limón station.** IOC Sea Level Monitoring gives the live gauge every minute (about 10 minutes behind real time, browser-callable). UHSLC gives the quality-controlled hourly record since 2009, about one to two months behind. Together they are the tide truth for this coast.
- **Weather station: yes, one.** The Limón airport METAR is **MRLM** (Limón International, 9.961°N 83.026°W, 2 m), confirmed. It reports hourly but **only while the airport is staffed**: the last report on 2026-11-02 was 00:00 UTC and none came overnight, so expect gaps at night.
- **IMN stations: not usable.** The IMN site is reachable but publishes no machine-readable station feed we could find; meteo.go.cr does not answer from the build machine. Revisit if IMN opens an API.
- **Wave or met buoy: none.** The nearest NDBC buoy is 42057 (western Caribbean, 16.98°N 81.58°W), about **810 km** away, so it says nothing about this coast. 42058 (central Caribbean) is 890 km away. **Waves stay model-only, and the app says so.**
- **Satellite: yes, through NOAA CoastWatch ERDDAP.** SST (MUR, daily, about 3 days late), chlorophyll and Kd490 (VIIRS, daily, often clouded out nearshore). Satellite wind (ASCAT) is no longer on ERDDAP; it comes from Copernicus Marine with a free account (PLAN 2.14).
- **Forecast models: Open-Meteo covers waves, wind, currents and modelled sea level**, browser-callable, free for non-commercial use.

## Local observations

| Feed | What | URL | Cadence and lag | Licence | Format | CORS |
|---|---|---|---|---|---|---|
| IOC Sea Level Monitoring, station `limon` | Live tide gauge at Limón port. Sensors `rad` (radar, primary), `ra2` (second radar), `prs` (pressure), plus housekeeping (`bat`, `sw1`, `sw2`) | `https://www.ioc-sealevelmonitoring.org/service.php?query=data&code=limon&timestart=…&timestop=…&format=json` | 1 min samples, about 9 min behind | Free, credit IOC/VLIZ; raw and unchecked | JSON rows `{slevel, stime, sensor}`, metres on a sensor zero | **Yes** (`*`) |
| UHSLC Limón, station 268 (`limn`) | Hourly sea level, the reference record | Fast delivery: `https://uhslc.soest.hawaii.edu/data/csv/fast/hourly/h268.csv`; research quality: `…/rqds/atlantic/hourly/h268b.csv` | Fast delivery to 2026-09-30 (one to two months late); research quality 2009-10-15 to 2024-12-31 | Free, credit UHSLC | CSV `year,month,day,hour,mm`, `-32767` = missing | No |
| METAR MRLM | Wind, gusts, temperature, dew point, pressure, cloud | `https://aviationweather.gov/api/data/metar?ids=MRLM&format=json&hours=24`; plain text at `https://tgftp.nws.noaa.gov/data/observations/metar/stations/MRLM.TXT` | Hourly when the airport is open; overnight gaps | US Government, public domain | JSON (decoded) or raw METAR | No |

**Gauge cross-check done here.** Over 2026-09-20 to 09-30, IOC `rad` against UHSLC fast-delivery hourly values: correlation 0.999, slope 1.001, residual 5 mm, with **UHSLC = IOC `rad` − 5.990 m**. So the live radar can be put on the UHSLC datum with a fixed offset, and the verify tool should flag it if that offset drifts (a re-levelled sensor). `prs` and `ra2` agree to about 1 cm and are fallbacks.

Data gaps to know about: UHSLC research quality is missing about 70% of 2021 and 2022 and 13% of 2023, so a harmonic fit should use 2010 to 2020 plus 2024. The 2012 and 2019 gaps are small.

**Not found or not reachable:**
- IMN (Instituto Meteorológico Nacional): website only, no open station API. `meteo.go.cr` is refused by the build machine's network.
- No coastal radar (HF), no wave rider, no surf cam feed with an API.
- INCOPESCA and SINAC have no live sensors.

## Satellite passes (for PLAN 2.12)

All on NOAA CoastWatch ERDDAP (`https://coastwatch.pfeg.noaa.gov/erddap/` and `https://coastwatch.noaa.gov/erddap/`), griddap CSV/JSON, public domain, **no CORS header** so they go through the data build.

| Variable | Dataset ID | Resolution | Lag | Note |
|---|---|---|---|---|
| SST | `jplMURSST41` | 0.01° daily, gap-free analysis | about 3 days (latest 2026-10-29 on 11-02) | Blends satellites, so no cloud holes, but it is an analysis, not a pass |
| Chlorophyll | `noaacwN20VIIRSchlaDaily` (NOAA-20 NRT, raw passes), `noaacwNPPN20VIIRSDINEOFDaily` (gap-filled NRT, **used by 2.4**) | 4 km / 9 km daily | 3 days | Nearshore pixels are often cloud or river-plume flagged (NaN) in the raw product |
| Kd490 (clarity) | `noaacwNPPVIIRSkd490Daily` (NRT, raw), `noaacwNPPN20S3AkdSCIDINEOF2kmDaily` (gap-filled science quality 2 km, **used by 2.4**) | 4 km / 2 km daily | NRT 1 to 3 days; gap-filled about 10 days | The nearshore cells tested on 2026-10-29 were all NaN (cloud), so the gap-filled product matters here |
| Kd490 (clarity, PLAN 7.47) | Copernicus Marine GlobColour `cmems_obs-oc_glo_bgc-transp_nrt_l4-gapfree-multi-4km_P1D` (NRT) and `…_my_l4-gapfree-multi-4km_P1D` (multi-year, 1997 on), merged sensors, gap-free | 4 km daily | NRT about 1 day | What CLARITY reads since PLAN 7.47; needs the free Copernicus Marine account. Off Cocles on 2026-11-08 and 11-09 it gave 0.046 to 0.056/m (Secchi 16 to 20 m) |
| Scatterometer wind | Copernicus Marine `WIND_GLO_PHY_L3_NRT_012_002`, Metop-B and Metop-C ASCAT, ascending and descending, 0.125° (**used by 2.14**, free account) | 12.5 km swaths, up to four a day | interim daily files, newest pass 12 to 36 h old | No ERDDAP product is live and keyless: `noaacwBlendednrtWinds6hr` stopped on 2023-03-05 and the ASCAT-only `erdQMwind1day` on 2022-12-31. On 2026-10-29 to 11-01 ten swaths crossed the box around Gandoca–Limón (3 to 191 of 360 cells each); ASCAT sees nothing within ~20 km of land |

**Raw passes (PLAN 2.12).** NOAA ACSPO super-collated L3S SST at 0.02° comes as separate afternoon (`noaacwLEOACSPOSSTL3SnrtPMDay`, about 18:30–19:15 UTC) and night (`…PMNight`, about 06:50–07:15 UTC) passes, one to two days late, with a per-pixel `sst_dtime` that gives the real pass time. On 2026-10-28 to 11-01 the eight passes saw between 7% and 90% of the sea off Gandoca–Limón, and the clear pixels ran 0.18 °C warmer than MUR. NOAA-20 raw chlorophyll (`noaacwN20VIIRSchlaDaily`, 4 km) saw this coast on only one day in seven (15% clear), which is why the gap-filled products carry the maps.

S-NPP is at end of mission (the dataset titles say so); prefer the NOAA-20/21 or merged products. The `nesdisVHN…` ids listed here earlier no longer answer on coastwatch.noaa.gov (checked 2026-11-02).

## Forecast models (for PLAN 2.2, 2.3, 2.5)

Open-Meteo, CORS `*`, JSON, free for non-commercial use with credit (CC BY 4.0 data). Rate limits are per IP (about 600 calls/minute, 10,000/day, with long or many-variable requests counting as several calls), which is why the grids are fetched once by the data build and not by every phone.

| Use | Endpoint and model | Grid | Reach (checked 2026-11-02) |
|---|---|---|---|
| Waves and swell | `marine-api.open-meteo.com/v1/marine`, `meteofrance_wave` (MFWAM) | 1/12° | to 2026-11-10 23:00, **about 9 days** |
| Waves, longer | `ncep_gfswave016` (GFS-Wave 0.16°), `ecmwf_wam025` | 0.16° / 0.25° | GFS-Wave **16 days**; ECMWF WAM 14.5 days |
| Currents and sea level | same endpoint, `meteofrance_currents` (SMOC): `ocean_current_velocity`, `ocean_current_direction`, `sea_level_height_msl` (includes tide) | 1/12° | **about 9 days** |
| SST forecast | `sea_surface_temperature` (best match) | 1/12° | about 9 days |
| Wind | `api.open-meteo.com/v1/forecast`: `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`, best match (ICON/GFS/ECMWF blend) | about 0.1° to 0.25° | 16 days |
| Climatology (OUTLOOK band) | `archive-api.open-meteo.com/v1/archive` (ERA5) and the marine endpoint with past dates (ERA5-Ocean) | 0.25° / 0.5° | 1940 to about 5 days ago |
| Ensembles (later, 7.4) | `ensemble-api.open-meteo.com/v1/ensemble` | | 16 days or more |

Notes:
- `swell_wave_peak_period` came back empty here; use `swell_wave_period`.
- Requesting several nearby points with `cell_selection=sea` snaps them to the model's sea cells, so two close inshore points can return the same cell. The currents and waves grids are 1/12°, which is coarser than the bays at Cahuita and Puerto Viejo; nearshore detail comes from our own physics (Phase 3).
- MFWAM and SMOC stop at about 9 days, which is inside the LOW CONF band. Past that the data build switches waves to GFS-Wave and currents to climatology, and the HUD shows which source a frame came from.

## What this means for the bands

| Band | Tide | Waves | Wind | Currents |
|---|---|---|---|---|
| FORECAST (0 to 7 d) | Harmonic prediction (exact) | MFWAM | Open-Meteo best match | SMOC |
| LOW CONF (7 to 16 d) | Harmonic | MFWAM to day 9, then GFS-Wave | Open-Meteo best match | SMOC to day 9, then climatology |
| OUTLOOK (16 to 30 d) | Harmonic | ERA5-Ocean climatology for the date | ERA5 climatology for the date | Climatology (mean of the SMOC days we have, until a currents reanalysis is wired) |

The live gauge and METAR do not feed the forecast directly; they feed LIVE OBS (2.13), the verify tool (2.8, 2.9) and the bias correction (7.10).

## In the app (PLAN 2.11)

- **Gauge** (`src/adapters/gauge.ts`): fetched straight from IOC by the phone (last 24 h, 1-minute radar), put on mean sea level with `LIVE_GAUGE.mslOnSensorM` = 6.60 m (the 5.990 m radar-to-UHSLC offset plus UHSLC's 2025–26 mean of 0.61 m), and paired with the harmonic prediction. On 2026-11-02 the last day matched the predicted tide's shape to 2.2 cm RMS, with the sea standing 11 to 12 cm above the tide (weather and seasonal level). The verify checks flag a shape mismatch over 8 cm or a mean departure over 25 cm (a datum change, or a real surge).
- **METAR** (`src/adapters/metar.ts`): relayed hourly by the data build as `data/forecast/metar.json` (the Pages workflow now runs every hour; the model grids still refresh only every 6 or 12 h). The verify cross-check compares the latest airport wind with the forecast wind at the airport for that hour.
- Both feed LIVE OBS (2.13), SYSTEM CHECK (2.9) and the daily verify Action (2.8).
