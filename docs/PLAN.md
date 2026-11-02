# Build plan

Each task is one small PR. **S** = Sonnet medium, **O** = Opus high. Start on Sonnet; move up only if it struggles twice on the same problem.

## Phase 1: Skeleton and look
- [x] 1.1 Vite + TS + MapLibre dark map centered on region, HUD frame with mock data, PWA shell (**S**)
- [x] 1.2 HUD component kit: panel, segmented readout, gauge, alert strip (**S**)
- [x] 1.3 Zoom tiers and the military-satellite zoom transition effect (**O**)
- [x] 1.4 WebGL particle layer for wind/currents on mock vector fields (**O**)
- [x] 1.5 Time slider and forecast-hour state store, with FORECAST / LOW CONF / OUTLOOK confidence bands out to 30 days (**S**)
- [x] 1.6 Deploy to GitHub Pages on merge to main (**S**)
- [x] 1.7 "Enhance" fly-to: pick a beach or coordinate (search box or spot tab) and, from a zoomed-out view, box the target, highlight it, zoom in, resolve block by block, then box again, repeating in 2 to 4 hops until on the beach or ocean point (**O**)
- [x] 1.8 Layer registry, LAYERS drawer and activity presets (FISH, DIVE, SURF, SAIL, ALL) (**S**)
- [x] 1.9 ENHANCE on/off toggle (settings, persisted on the device): off keeps the zoom out, pan, zoom in route but as three smooth eased moves, with finer data fading in as the zoom tiers are crossed; no pixelation, reticle flashes or discrete jumps (see 1.11) (**S**, extends 1.3, 1.7)
- [x] 1.10 i18n scaffold, do early: a small `t(key)` helper with `src/i18n/en.ts`, and move every existing UI string (labels, alerts, layer names, presets, panel text) into it, so all new UI text is translatable from the start; no hard-coded user-facing strings in new code (**S**)
- [x] 1.11 Phone HUD as drawers (top bar tabs FIND / COND / LAYERS, bottom time strip), LAYERS drawer that always closes (tab, X, map tap, Esc), ENHANCE off keeps the zoom out, pan, zoom in route as smooth moves, map bounds widened past the analysed area (**S**, fixes 1.5, 1.8, 1.9)

## Phase 2: Data adapters
- [x] 2.1 Adapter interface, cache layer, data-age tracking (**O**)
- [ ] 2.2 Open-Meteo Marine adapter (waves, swell) (**S**)
- [ ] 2.3 Open-Meteo wind adapter (GFS/ECMWF) (**S**)
- [ ] 2.4 CoastWatch ERDDAP adapter: SST and chlorophyll (**S**)
- [ ] 2.5 Copernicus/HYCOM currents adapter (**S**)
- [x] 2.6 GEBCO bathymetry clipped to region, packed as a tile/grid asset, plus reefs, seamarks and a depth layer (**S**)
- [ ] 2.7 UHSLC Limón gauge fetch for tide validation (**S**)
- [ ] 2.8 Verify tool, automatic: scheduled daily GitHub Action runs one check per adapter (reachability, freshness, schema, physical ranges, cross-source agreement) and opens or updates an issue on failure; checks live in `src/verify/`, shared with 2.9 (**O**, needs 2.1; grow it with each adapter)
- [ ] 2.9 Verify tool, manual: SYSTEM CHECK HUD panel with a green/amber/red row per feed, the failing check and its age, and a re-run button; once 2.11 and 2.12 land it also compares each forecast with what was observed (**S**, needs 2.8)
- [x] 2.10 Research note first (`docs/OBSERVATIONS.md`): confirm which local observation sources are actually reachable and usable for Gandoca to Limón (UHSLC Limón gauge, Limón airport METAR MRLM, IMN stations, any wave or met buoy near the coast, satellite passes), with URLs, update cadence, licence and format; if no wave buoy exists, say so (**S**)
- [ ] 2.11 Live observation adapters: UHSLC Limón tide gauge, Limón airport METAR (MRLM, ID to confirm in 2.10), and IMN stations if reachable; each returns data plus `fetchedAt` and its own observation time (**S**, needs 2.1, 2.10; extends 2.7)
- [ ] 2.12 Satellite observation adapters: SST, chlorophyll/Kd490 and scatterometer wind (e.g. ASCAT) passes over the region, with the pass time and cloud gaps flagged (**S**, needs 2.1, 2.10; extends 2.4)
- [ ] 2.13 LIVE OBS layer and panel: the latest real reading from each station and satellite pass shown on the map and in a HUD panel, each with its age and a green/amber/red freshness state (**S**, needs 2.11, 2.12, 1.8)

## Phase 3: Physics engine
- [x] 3.1 Tide harmonic predictor, validated vs UHSLC (**O**). Constants fitted to the Limón gauge itself; see `docs/TIDES.md`
- [x] 3.2 Dispersion solver and shoaling (**O**). `src/physics/waves.ts`
- [x] 3.3 Refraction ray tracing over bathymetry (**O**). `src/physics/refraction.ts`, see `docs/PHYSICS.md`
- [x] 3.4 Breaking height, breaker type, wave energy and force (**O**). `src/physics/breaking.ts`, `surf-zone.ts`
- [ ] 3.5 Rip risk score with length/strength band (**O**)
- [ ] 3.6 Move heavy physics to a Web Worker (**S**)

## Phase 4: Forecast and fishing UI
- [ ] 4.1 Tide chart panel and spot pages (**S**)
- [ ] 4.2 Rip risk overlay and spot-tier breaker readouts (**S**)
- [x] 4.3 Protected-zone overlays: Gandoca-Manzanillo, Cahuita (**S**)
- [ ] 4.4 Species habitat model framework and scoring (**O**)
- [x] 4.5 Fishing layer: shore/kayak mode (**S**)
- [ ] 4.6 Fishing layer: boat mode, GPS track, drop-pin log (**S**)
- [ ] 4.7 OBIS/GBIF and Global Fishing Watch data folded into scores (**S**)

## Phase 5: Offline and polish
- [ ] 5.1 "Sync for trip": tiles, bathymetry, 7-day forecasts, scores to IndexedDB (**O**)
- [ ] 5.2 Offline fallback paths and DATA AGE colour states (**S**)
- [ ] 5.3 Mobile layout and sunlight-readability pass (**S**)
- [ ] 5.4 Performance pass (**O**)
- [ ] 5.5 Optional UI sounds (**S**)
- [ ] 5.6 EN/ESP language toggle: full Spanish in `src/i18n/es.ts` using local Costa Rican marine and fishing terms, a toggle in the HUD with small UK and Costa Rica flag graphics in the HUD style, choice persisted on the device and the browser language used as the first-run default; units, dates and number formats follow the language where they differ (**S**, needs 1.10, and all UI text in place)

## Phase 6: Activity data (see DESIGN.md section 6)
- [ ] 6.1 Water clarity: Kd490 and chlorophyll from ERDDAP/Copernicus, plus a rain-plume estimate from river-mouth rainfall, as the CLARITY layer (**S**, builds on 2.4)
- [ ] 6.2 Dive surge: bottom orbital velocity per spot from the shoaling solver, shown as a calm/surgy/dangerous band (**O**, needs 3.2)
- [ ] 6.3 Surf break model: per-break orientation, swell window and offshore-wind angle give a quality score; seed the SURF BREAKS layer (**O**, needs 3.3, 3.4)
- [ ] 6.4 Surf break catalog: curated Caribbean breaks (type, orientation, hazards), verified against map tiles (**S**)
- [ ] 6.5 Marine wind detail: gusts, CAPE squall flag, NHC tropical alerts into the alert strip (**S**, needs 2.3)
- [ ] 6.6 Sea state comfort index from wind-wave and swell partitions (**S**, needs 2.2)
- [ ] 6.7 Anchorages and harbours layer: OSM seamarks, NGA World Port Index, shelter from wind direction (**S**)
- [x] 6.8 Spearfishing and protected-area rules: SINAC/INCOPESCA zones, closed seasons, rules card per zone (**S**, extends 4.3)
- [ ] 6.9 Register wind, currents and waves with the layer store when the particle layer lands (**S**, needs 1.4). Wind and currents done in 1.4; waves waits for a swell field (2.2)

## Phase 7: Final additions (see DESIGN.md sections 9 and 10)
Built last, once Phases 2 to 6 are in. Each reuses the adapters, the layer registry and the SYSTEM CHECK panel.
- [ ] 7.1 Sargassum/seaweed layer: ingest satellite detections (USF SaWS AFAI, NOAA AOML Sargassum Inundation Report) and advect the mats with currents, Stokes drift and about 1 to 3% of wind, giving a 1 to 5 day beaching forecast per beach (**O**, needs 1.4, 2.5, 2.3)
- [ ] 7.2 Water clarity predictions: forecast visibility a few days ahead from Kd490, chlorophyll and turbidity trends, river plume transport after rain (Sixaola, Estrella, Banano) and swell resuspension, with a confidence band (**O**, extends 6.1, needs 2.2)
- [ ] 7.3 Weather adapters: GFS, ECMWF and ICON via Open-Meteo for rain, cloud, UV and temperature, plus the NHC feeds (active storms, forecast cone) (**S**, needs 2.1)
- [ ] 7.4 Ensemble blend with local bias correction: weight the models per variable by their recent error against the Limón gauge, nearby stations and buoys, and report spread as a confidence value (**O**, needs 7.3)
- [ ] 7.10 Local bias correction from observations: extend 7.4 to wind, tides and SST by learning the model-minus-observed error at the Limón airport station, tide gauge and satellite SST, apply it to the forecast, and show the correction and its confidence (**O**, needs 2.11, 2.12, 7.4)
- [ ] 7.5 Weather tracker UI: rain radar and accumulation, cloud, sun/UV index, and hurricane tracks with cone and wind radii, as layers and an alert-strip feed (**S**, needs 7.3)
- [ ] 7.6 Lightning alerts: GOES GLM strike layer plus a "strike within N km" warning in the alert strip (**S**, needs 2.1)
- [ ] 7.7 Sun, moon and solunar: sunrise/sunset, golden hour, moon phase and rise/set, solunar windows, computed on device so they work offline (**O**, pure physics module with tests)
- [ ] 7.8 Go/no-go verdict per activity (Fishing, Diving/Snorkel/Spear, Surfing, Sailing): combine the activity's inputs into GO, MARGINAL or NO-GO with the top reasons, shown on the HUD and in each preset (**O**, needs 3.5, 6.2, 6.3, 6.6, 7.2, 7.4, 7.6)
- [ ] 7.9 Register the new layers (sargassum, weather, lightning) and offline-sync them; add their feeds to the verify checks (**S**, needs 5.1, 2.8)
