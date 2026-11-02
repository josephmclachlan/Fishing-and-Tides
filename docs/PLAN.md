# Build plan

Each task is one small PR. **S** = Sonnet medium, **O** = Opus high. Start on Sonnet; move up only if it struggles twice on the same problem.

## Phase 1: Skeleton and look
- [x] 1.1 Vite + TS + MapLibre dark map centered on region, HUD frame with mock data, PWA shell (**S**)
- [x] 1.2 HUD component kit: panel, segmented readout, gauge, alert strip (**S**)
- [x] 1.3 Zoom tiers and the military-satellite zoom transition effect (**O**)
- [ ] 1.4 WebGL particle layer for wind/currents on mock vector fields (**O**)
- [ ] 1.5 Time slider and forecast-hour state store (**S**)
- [x] 1.6 Deploy to GitHub Pages on merge to main (**S**)
- [x] 1.7 "Enhance" fly-to: pick a beach or coordinate (search box or spot tab) and, from a zoomed-out view, box the target, highlight it, zoom in, resolve block by block, then box again, repeating in 2 to 4 hops until on the beach or ocean point (**O**)

## Phase 2: Data adapters
- [ ] 2.1 Adapter interface, cache layer, data-age tracking (**O**)
- [ ] 2.2 Open-Meteo Marine adapter (waves, swell) (**S**)
- [ ] 2.3 Open-Meteo wind adapter (GFS/ECMWF) (**S**)
- [ ] 2.4 CoastWatch ERDDAP adapter: SST and chlorophyll (**S**)
- [ ] 2.5 Copernicus/HYCOM currents adapter (**S**)
- [x] 2.6 GEBCO bathymetry clipped to region, packed as a tile/grid asset, plus reefs, seamarks and a depth layer (**S**)
- [ ] 2.7 UHSLC Limón gauge fetch for tide validation (**S**)

## Phase 3: Physics engine
- [ ] 3.1 Tide harmonic predictor from TPXO/FES constituents, validated vs UHSLC (**O**)
- [ ] 3.2 Dispersion solver and shoaling (**O**)
- [ ] 3.3 Refraction ray tracing over bathymetry (**O**)
- [ ] 3.4 Breaking height, breaker type, wave energy and force (**O**)
- [ ] 3.5 Rip risk score with length/strength band (**O**)
- [ ] 3.6 Move heavy physics to a Web Worker (**S**)

## Phase 4: Forecast and fishing UI
- [ ] 4.1 Tide chart panel and spot pages (**S**)
- [ ] 4.2 Rip risk overlay and spot-tier breaker readouts (**S**)
- [ ] 4.3 Protected-zone overlays: Gandoca-Manzanillo, Cahuita (**S**)
- [ ] 4.4 Species habitat model framework and scoring (**O**)
- [ ] 4.5 Fishing layer: shore/kayak mode (**S**)
- [ ] 4.6 Fishing layer: boat mode, GPS track, drop-pin log (**S**)
- [ ] 4.7 OBIS/GBIF and Global Fishing Watch data folded into scores (**S**)

## Phase 5: Offline and polish
- [ ] 5.1 "Sync for trip": tiles, bathymetry, 7-day forecasts, scores to IndexedDB (**O**)
- [ ] 5.2 Offline fallback paths and DATA AGE colour states (**S**)
- [ ] 5.3 Mobile layout and sunlight-readability pass (**S**)
- [ ] 5.4 Performance pass (**O**)
- [ ] 5.5 Optional UI sounds (**S**)
