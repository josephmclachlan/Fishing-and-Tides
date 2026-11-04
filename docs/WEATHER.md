# Weather tracker (PLAN 7.5)

**Shown:** rain now and over the next 24 h, cloud, UV and air temperature at the slider's valid time, from GFS, ECMWF IFS and ICON (`src/weather.ts`). Air temperature and gusts are the ensemble blend below; rain, cloud, UV and CAPE are the plain mean. When the models' rain rates differ by 2 mm/h or more the panel says MODELS DISAGREE. The WEATHER layer shows active Atlantic tropical storms from NHC as a red ring with name and category.

**Rain by town (PLAN 7.24):** under the weather rows, RAIN BY TOWN gives Cahuita, Playa Negra, Puerto Viejo and Manzanillo the rain over the 3 hours from the slider's time: the mean of ECMWF 9 km, UK Met Office 10 km, ICON and GFS, and the share of those models with at least 0.5 mm (`src/rain/town.ts`). A model votes only if it covers half the window. With four models the share moves in 25 % steps; it is model agreement, not a calibrated chance (that needs town gauges, 7.24 item 5). When one town's models are mostly dry (≤25 %) and another's mostly wet (≥75 %) the note says SHOWERS PATCHY. The models are 9 to 13 km wide, so Cahuita and Puerto Viejo sit in neighbouring cells: the towns differ, but less than real showers do.

**Rain cells (PLAN 7.24 item 3):** a satellite nowcast for the next 2 hours.
- *Collector:* `scripts/rain-cells.py`, job `rain` in `.github/workflows/lightning.yml` (same 10-minute trigger as lightning), publishes `rain.json` on the `data-rain` branch: the last 7 GOES-19 full-disk scans (one hour) cropped to `RAIN_BOX` on a 0.02° grid, one byte per cell (0.25 mm/h steps, 255 = no data). It reads only the needed row strips with HTTP range requests (4 requests, about 1 MB a scan). Source: NOAA's rain-rate product RRQPE when it is under 40 minutes old, otherwise band 13 IR through the Auto-Estimator (Vicente et al. 1998). RRQPE was down on AWS from 2026-11-02 16 UTC, which is why the fallback exists. The scan-angle maths reproduces the GOES-R PUG worked example.
- *Nowcast:* `src/rain/nowcast.ts`. Motion from whole-grid block matching of ln(1+R) between consecutive scans (±6 cells, wet-weighted mean after dropping outliers), then the newest scan moved along it (no growth or decay). Each town reads the largest rate within one cell (~2 km). RAINING at ≥ 1 mm/h now, RAIN IN ~N MIN if that arrives within 2 h, else DRY NEXT 2H. The row under them gives the motion (CELLS MOVING NW 20 KM/H) and the source with its age. The scan time counts: a 20-minute-old scan is moved on 20 minutes before reading "now".
- *Map:* part of the WEATHER layer (`rn-` ids): the rain image (faint green under 1 mm/h, green to 5, amber to 15, red above) and dashed arrows to where each cell will be in 30 minutes. In the last hour the slider shows the nearest scan; up to 2 h ahead, the extrapolation.
- *Alert:* RAIN CELL REACHING {TOWN} IN ~N MIN when a cell of 5 mm/h or more is due within 30 minutes.
- *Limits:* showers here grow and die within the hour, so under 1 h is usually close and 1 to 2 h is rough. IR sees cold cloud tops and misses warm, low trade-wind showers (the IR ESTIMATE label says when it is in use). The feed is only as fresh as the collector: GitHub's own 10-minute schedule runs late, so it needs the external dispatch set up for lightning. Not verified against gauges yet (7.24 items 4 and 5).

**Alerts** (alert strip, after the rip warning): a tropical system within 1500 km of the region, and heavy rain (mean model rate of 10 mm/h or more) in the next 3 hours. Both are advisory and say so; follow NHC and the IMN.

**Not built, and why:**
- Ground radar: tested 2026-11-04 (PLAN 7.24 item 2). Costa Rica's only weather radar is IMN's at Aranjuez, San José, carried by RainViewer. RainViewer's coverage mask (`/v2/coverage/0/256/7/34/60/0/0_0.png`) covers the coast from Limón south only to about 9.82° N (near Penshurst and the Estrella mouth). Cahuita, Playa Negra, Puerto Viejo and Manzanillo are all outside it; the Talamanca range sits between the radar and the south coast. So there is no radar layer: the satellite rain cells below replace it. Worth re-checking if IMN adds a Caribbean radar.
- Storm forecast cone, track and wind radii: need NHC's GIS products (shapefile or KMZ). The data build relays only the active-storm list today.
- Gridded cloud and UV maps: the adapter is one point at the region centre, which is honest for a 90 km coast but not for a map layer.

## Gusts and squall flag (PLAN 6.5)

GUSTS (kt) and CAPE (J/kg) are rows beside the other weather readings, from the same three models. The SQUALL 6H row looks at the next six hours: WATCH when mean CAPE is 1000 J/kg or more and either gusts reach 25 kt or rain reaches 5 mm/h in the same hour; HIGH when CAPE is 2500 or more with the same gates. The thresholds are common usage for convective instability plus two gates to avoid firing on dry unstable air; they are a heuristic and have not been tuned against Limón observations (PLAN 7.4 and 7.10 are where that learning belongs). Both levels add an alert-strip message. Advisory only.

## Ensemble blend (PLAN 7.4)

Each time the app loads the weather it also asks Open-Meteo what the three models said for the Limón airport over the last 3 days (`past_days=3`, `src/adapters/weather-skill.ts`) and scores them against the airport's METAR reports, which the data build now relays for 96 h instead of 36. Per variable (air temperature, mean wind, sea-level pressure), `src/blend.ts`:

- bias = mean(model − observed), shrunk toward 0 by n / (n + 6) so a handful of reports cannot swing it;
- σ = RMS error left once the bias is removed;
- weight ∝ 1 / max(σ, floor)², normalised and capped at 70% so every model stays in (floors 0.5 °C, 2 kt, 0.5 hPa);
- blend = Σ weight · (model − bias), and its expected error √(spread² + 1 / Σ 1/σ²), where spread is the weighted disagreement of the corrected models.

AIR TEMP is blended with the temperature weights and biases. GUSTS take the wind weights without a bias (the airport only reports gusts when there are some, so a mean gust error would be skewed). Rain, cloud, UV and CAPE stay the plain mean: the airport does not measure them, and skill on wind says little about skill on rain. The same blended gusts and temperature feed BITE, the squall flag and the WATCH metrics.

CONFIDENCE is the worse of the temperature and wind confidences for that hour: HIGH when the blend's expected error is within 1 °C and 3 kt, MEDIUM within 2 °C and 6 kt, LOW beyond. It drops with lead time as the models spread. The note under it names the model with the largest wind weight and its share (for example `3 MODELS · ECMWF 52%`). With fewer than 8 matched hours for two models (overnight, when the airport is closed, or offline with no cached hindcast), every weight is equal and nothing is corrected.

Limits: `past_days` output is each model's latest short-range run, so the scores measure short-range skill and the forecast days further out lean more on the spread. One airport is one point; the bias of the airport's model cell is applied to the region-centre forecast. Model errors are correlated, which is why the weights are capped. Longer scoring windows need the history archive (see the database storage thread) and belong with PLAN 7.10. The SYSTEM CHECK has a "Models scored against MRLM" row listing each model's bias, error and weight.
