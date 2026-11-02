# Design: Fishing and Tides

A Windy-style ocean conditions and fishing app with a retrofuturistic HUD look, built first for one stretch of coast and designed to work offline on the water.

## 1. Region

Costa Rica Caribbean coast, **Gandoca to Limón city only** (approx. 9.55°N to 10.02°N, 82.55°W to 83.08°W). Key places: Gandoca-Manzanillo, Punta Uva, Puerto Viejo (Salsa Brava), Playa Negra, Cahuita, Westfalia, Playa Bonita, Limón. River mouths: Sixaola, Estrella, Banano. Macro view extends out to the western Caribbean so incoming swell and fronts are visible.

Tides here are small (microtidal, under about 0.5 m), so tide *timing* matters more than height. NOAA networks barely cover the area, so we rely on global models and validate against the few local observations.

## 2. Data sources

| Domain | Source | Use |
|---|---|---|
| Tides | TPXO9 or FES2014 harmonic constituents | Tide height and timing computed on device, forever offline |
| Tide validation | UHSLC Limón tide gauge | Check and tune the harmonic constants |
| Waves and swell | WaveWatch III, Open-Meteo Marine | Offshore Hs, Tp, direction, swell partitions (Open-Meteo is the easy default) |
| Currents | Copernicus Marine, HYCOM | Offshore surface currents; nearshore currents modeled by us |
| Wind | GFS, ECMWF via Open-Meteo | Wind field and particles |
| Sea temp, chlorophyll | NOAA CoastWatch ERDDAP (VIIRS, MODIS) | SST, temperature fronts, chlorophyll edges |
| Bathymetry | GEBCO 2026 (15″), OSM coastline mask; see `docs/SEAFLOOR.md` | Shoaling, refraction, depth contours, fishing depth |
| Reefs, seamarks | Allen Coral Atlas, OpenStreetMap | Reef zones and bottom cover, named reefs, wrecks, lights |
| Species | OBIS, GBIF | Occurrence records to fit habitat models |
| Fishing pressure | Global Fishing Watch | Vessel activity, offshore corridors |

All network calls go through one adapter module per source, behind a small cache (edge function or static prebuilt JSON) so the client never hammers upstream APIs.

## 3. Physics

A pure, unit-tested TypeScript library (`src/physics/`), no DOM.

- **Dispersion:** linear wave theory, solve `ω² = g k tanh(k h)` for wavelength and celerity at depth h.
- **Shoaling:** `Ks = sqrt(Cg0 / Cg)`, using group velocity from the dispersion solution.
- **Refraction:** Snell's law along wave rays over the GEBCO grid, `Kr = sqrt(cos θ0 / cos θ)`; ray tracing per spot for the zoomed-in view.
- **Breaking:** depth-limited breaking `Hb ≈ 0.78 h` with a slope adjustment (e.g. Komar-Gaughan breaker height), breaker type from the Iribarren number.
- **Wave force and energy:** energy density `E = ρ g H² / 8`, energy flux `P = E Cg`, reported as a force or power readout.
- **Rip risk:** score from breaker height, period, shore-normal swell angle, tide phase (low tide near bars is worst), and known rip channels; adapted from NWS rip current guidance. Outputs low, moderate, high, plus an estimated length and strength band.

## 4. Fishing layer

Habitat suitability per species, scored by location, depth, date and time, from:
SST and fronts, chlorophyll edges, depth contours, river mouth plumes, tide phase, moon phase, season, and OBIS/GBIF occurrence history.

- **Shore/kayak mode:** river mouths, reef edges, rip troughs, and tide windows reachable on foot or by kayak. Example species: tarpon, snook, jacks, snapper.
- **Boat mode:** offshore fronts, FADs, depth contours, plus offline GPS track and a drop-pin catch log. Example species: mahi, wahoo, kingfish, tuna, sailfish.
- **Protected zones on by default:** Gandoca-Manzanillo Wildlife Refuge and Cahuita National Park marine areas are drawn as no-fishing or restricted overlays and clearly labelled.

## 5. Zoom tiers

| Tier | Zoom | Shows |
|---|---|---|
| Macro | ≤ 7 | Western Caribbean: incoming swell, wind field, SST fronts |
| Coast | 8 to 11 | Fishing corridors, spot markers, protected zones, currents |
| Spot | ≥ 12 | Refracted breaker height, rip channels, tide curve, depth contours |

Scrolling or pinching across a tier only reveals or hides detail (grids, coastline glow, labels, HUD rows); no transition plays, so free zooming stays smooth.

The **military-satellite zoom effect** (scanline sweep, pixelation that sharpens as it "locks on" with square cells resolving one by one in random order, targeting reticle, live lat/lon/altitude readouts) plays only when a target is picked, as part of the enhance fly-to below. It runs slowly on purpose so it reads as a sensor working rather than the page breaking, and motion follows one rule: smooth moves cover ground already known (the pull-back and the pan that centres the target), stepped moves (discrete jumps, like old tracking optics) mean new detail is loading (every zoom in). The map stays north-up and top-down (rotate and tilt are off). Touching the map cancels it.

**ENHANCE toggle.** A setting (on by default, remembered on the device) turns the whole enhance system off. When off, picking a beach or coordinate flies there in one continuous, eased move that pans and zooms together at a comfortable pace, with no pixelation, reticle boxes or stepped zooms. Finer detail (grids, coastline glow, labels, spot data) fades in smoothly as the zoom crosses each tier, so the trip still feels alive and the detail still builds as you get closer.

**Enhance fly-to** (80s action-movie "enhance"): searching or tapping a beach or coordinate (spot tabs, or a search box taking a beach name, decimal degrees or degrees + decimal minutes) first pulls smoothly all the way back to the wide view (the whole region on screen) without panning, then flashes a box over the target where it sits, smoothly pans to centre it under the crosshair, and steps into the box, and the picture breaks into pixels in proportion to the zoom: sharp when the hop starts, blocks growing as it zooms (anchored on the target so the coastline outline stays readable), coarsest on arrival, then resolving piece by piece. Once clear, a smaller box is drawn and the sequence repeats, about one hop per zoom tier (2 to 4 hops), until it lands on the beach or ocean point.

## 6. Layers and activity modes

Everything is a **layer** you can switch on or off from the LAYERS drawer (top bar on phones, right side on wider screens): waves/swell, currents, wind, water temp, clarity, rip risk, surf breaks, depth, reefs, seamarks, fishing, protected zones, anchorages. The default is ALL. One tap on an **activity** preset (FISH, DIVE, SURF, SAIL) switches on just the layers that activity needs; tapping the active preset again, or ALL, brings everything back. Toggling a single layer by hand leaves the preset (the header reads CUSTOM) and returns to the preset's name if the set matches again. Choices persist on the device. Layers whose data isn't built yet show SOON.

| Preset | Layers on |
|---|---|
| FISH | fishing, water temp, clarity (chlorophyll edges), currents, wind, depth, reefs, protected zones |
| DIVE (dive, snorkel, spearfish) | clarity, waves/swell, currents, rip risk, depth, reefs, protected zones, seamarks |
| SURF | waves/swell, wind, rip risk, surf breaks, depth, reefs |
| SAIL | wind, waves/swell, currents, depth, seamarks, anchorages, reefs |

Code: the catalog and presets are in `src/layers/registry.ts`. New layers (particles, fishing, and so on) call `layers.register(id, { setVisible })` and get the current state immediately and on every change; plain MapLibre layers just declare `mapPrefixes` in the catalog.

### Extra data each activity needs

The shared ocean data in section 2 covers most of it. These are the gaps, each with a PLAN task (Phase 6).

| Activity | Needs | Public source | How it's used |
|---|---|---|---|
| **Dive / snorkel** | Underwater visibility: diffuse attenuation Kd490, chlorophyll, suspended sediment. River plumes after rain (Sixaola, Estrella, Banano) are the main killer here. | NOAA CoastWatch ERDDAP VIIRS Kd490 and chlorophyll; Copernicus Marine Ocean Colour (OLCI); rainfall from Open-Meteo or NASA GPM IMERG | Visibility estimate: Secchi depth ≈ 1.7 / Kd490, nudged by recent rain and swell. Clouds gap the satellite data, so fall back to rain plus waves. |
| | Surge and bottom motion | Our own physics (3.2) from wave height, period and depth | Bottom orbital velocity `u = πH / (T sinh(kh))` at the spot depth, shown as a calm/surgy/dangerous band |
| | Current and rip at entry points | Currents adapter, rip score (3.5) | Warn on entry/exit and drift direction |
| **Spearfishing** | Where spearing is allowed or banned, closed seasons, size limits | SINAC (protected-area boundaries; the official source), INCOPESCA regulations and closed seasons, WDPA as a cross-check | Protected zones overlay (4.3) plus a rules card per zone. We state what the rules say and link the source; check locally before relying on it. |
| | Visibility, depth, reef structure | As dive, plus GEBCO and Allen Coral Atlas (already in) | Pick reef edges and ledges in the right depth with enough clarity |
| **Surf** | Break quality: swell height, period and direction against each break's orientation, offshore wind, tide | Open-Meteo Marine swell partitions (primary and secondary), our refraction (3.3) and breaking (3.4), wind from 2.3 | Per-break score. Offshore wind = angle between wind and the shore normal. |
| | Break locations and type (reef, point, beach), orientation, hazards | OpenStreetMap `sport=surfing` plus hand-curated spots in `src/region.ts` (Salsa Brava, Playa Negra, Punta Uva, Cocles) | Seed list, verified on the map. Local knowledge needed; no open dataset is complete. |
| | Crowd and wave count | No open source | Out of scope |
| **Sail** | Gusts, squalls and storm risk | Open-Meteo `wind_gusts_10m` and CAPE; NOAA NHC for tropical systems | Gust and squall alerts in the alert strip |
| | Sea state (steepness, wind sea vs swell, period) | Open-Meteo Marine wind-wave and swell partitions | Comfort index: short steep seas against long swell |
| | Anchorages, harbours, hazards, wrecks | OpenStreetMap seamarks (some already in), NGA World Port Index (public domain) | Anchorages layer, with depth from GEBCO and shelter from wind direction |
| | Harbour entrance conditions | Tide and current at Moín and Limón (3.1, UHSLC gauge) | Entrance bar warnings |
| **Fish** | See section 4 | | |

Not for navigation: this applies to all of the above, depth and charts in particular, and the app says so.

## 7. Offline

- Installable PWA (service worker plus web manifest).
- **"Sync for trip" button** downloads map tiles and bathymetry for the whole region, 7 days of swell, wind and current forecasts, and precomputed fishing and rip scores into IndexedDB / Cache Storage.
- Tides and physics are computed on device, so other spots and times still work offline.
- **DATA AGE readout:** segmented display of time since last sync. Green when fresh, amber after 12 h, red after 48 h.

## 8. Visual style

Retrofuturistic HUD in the Evangelion / NASA mission-control vein:
- Near-black background, phosphor **amber** (primary) and **green** (secondary), red for warnings.
- CRT glow (text-shadow), faint scanlines, slight vignette.
- Segmented seven-segment style digits for numbers, monospace labels in caps.
- Thin bordered panels with corner brackets, hazard stripes for alerts.
- Animated wind and current particles (WebGL), subtle flicker on state changes. Wind is amber, currents green, both brighter when faster and red when strong (wind 25 kt or more, current 1.5 kt or more). Particles keep a steady on-screen pace at every zoom; currents stay in the sea (clipped to the OSM coastline). With both on, wind thins out so the sea stays readable. Under the reticle the side panel reads CURRENT (kt) and SET (°T, the direction it flows toward).
- Must stay readable in sunlight on a phone: high contrast, large hit targets.

## 9. Final additions

Built after the core app (PLAN Phase 7).

- **Sargassum/seaweed.** Satellite detections (USF SaWS AFAI, NOAA AOML Sargassum Inundation Report) give where the mats are now; we move them forward with currents, Stokes drift and a small wind term (about 1 to 3%) to forecast beaching per beach over 1 to 5 days. Satellite gaps under cloud are shown as unknown, not clear.
- **Water clarity predictions.** Extends the Phase 6 clarity layer from "now" to a few days ahead: Kd490, chlorophyll and turbidity trends, river plume transport after rain, and swell resuspension. Shown with a confidence band.
- **Weather tracker.** Rain, cloud, sun/UV, temperature, and hurricanes from the NHC. We do not run our own weather model; we blend GFS, ECMWF and ICON (Open-Meteo) per variable, weighting each by its recent error against local stations, the Limón gauge and buoys, and show model spread as confidence.
- **Lightning.** GOES GLM strikes drawn as a layer, with an alert-strip warning when a strike is within a set distance.
- **Sun, moon, solunar.** Sunrise/sunset, golden hour, moon phase and rise/set, and solunar windows, computed on device so they work offline.
- **Go/no-go verdict.** Per activity (Fishing, Diving/Snorkel/Spear, Surfing, Sailing), the inputs from section 6 are combined into GO, MARGINAL or NO-GO with the top two or three reasons ("surge high, visibility 3 m"). Advisory only, not for navigation or safety decisions.

## 10. Verify tool (SYSTEM CHECK)

Every feed can silently break (API change, outage, stale data, bad units), so each adapter ships with a check, built alongside the Phase 2 adapters. A check covers:

1. **Reachability:** the source responds.
2. **Freshness:** `fetchedAt` and the data's own timestamp are within the source's expected cadence.
3. **Schema:** the response parses into the adapter's expected shape.
4. **Physical ranges:** values are plausible for the region (for example Hs 0 to 8 m, SST 24 to 32 °C, tide amplitude under 1 m).
5. **Cross-source agreement:** where two sources measure the same thing (Open-Meteo vs WaveWatch III waves, modelled tide vs UHSLC gauge, GFS vs ECMWF wind), flag disagreement beyond a tolerance.

It runs two ways from the same code in `src/verify/`:

- **Automatic:** a scheduled GitHub Action (daily) runs every check and opens, or updates, a GitHub issue naming the failing feed and check; it closes the issue when the feeds recover.
- **Manual:** a SYSTEM CHECK HUD panel lists every feed with a green (pass), amber (degraded: stale or sources disagree) or red (failed) lamp, the failing check, and the data age, with a re-run button. Offline, it shows the last result and its age instead of failing.

Each new adapter adds its checks; a PR that adds an adapter without them is incomplete.

## 11. Language (EN/ESP)

A planned EN/ESP toggle with a full Spanish translation, shown in the HUD as a small UK flag (EN) and Costa Rica flag (ESP) drawn in the HUD style (amber/green line art, no photos). The work is mostly string extraction, so it starts early (PLAN 1.10): every user-facing string goes through a `t(key)` helper from the beginning, which makes the later translation (PLAN 5.6) a matter of filling in `es.ts`. The Spanish uses local Costa Rican marine and fishing terms, not generic or Castilian ones, and is checked by a local speaker where possible. The choice is remembered on the device, and the first run follows the browser language.

## 12. Live local observations

The coast has few live sensors, so the app uses every real reading it can get for Gandoca to Limón and is honest about what is missing. Candidates (to be confirmed by PLAN 2.10): the UHSLC Limón tide gauge, the Limón airport METAR (MRLM), IMN stations if reachable, and satellite passes (SST, chlorophyll/Kd490, scatterometer wind). Whether any wave or met buoy is near this coast is an open question; if none, waves stay model-only and the app says so.

- **LIVE OBS layer and panel:** each reading with its age and a freshness colour, on the map and in a HUD panel.
- **Local bias correction:** the model-minus-observed error at these stations is learned and removed from the forecast (wind, tides, SST; extends the weather blend in section 9), shown with a confidence value.
- **SYSTEM CHECK:** compares each forecast with what was observed, so drift shows up as amber or red (section 10).
