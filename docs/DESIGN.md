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
| Bathymetry | GEBCO, plus digitized charts where possible | Shoaling, refraction, depth contours, fishing depth |
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

The **military-satellite zoom effect** (scanline sweep, pixelation that sharpens as it "locks on" with square cells resolving one by one in random order, targeting reticle, live lat/lon/altitude readouts) plays only when a target is picked, as part of the enhance fly-to below. It runs slowly on purpose so it reads as a sensor working rather than the page breaking. Touching the map cancels it.

**Enhance fly-to** (80s action-movie "enhance"): searching or tapping a beach or coordinate (spot tabs, or a search box taking a beach name, decimal degrees or degrees + decimal minutes) auto-pans to it and draws a box over the target region and highlights it, zooms into the box, and the picture breaks into pixels in proportion to the zoom: sharp when the hop starts, blocks growing as it zooms (anchored on the target so the coastline outline stays readable), coarsest on arrival, then resolving piece by piece. Once clear, a smaller box is drawn and the sequence repeats, about one hop per zoom tier (2 to 4 hops), until it lands on the beach or ocean point.

## 6. Offline

- Installable PWA (service worker plus web manifest).
- **"Sync for trip" button** downloads map tiles and bathymetry for the whole region, 7 days of swell, wind and current forecasts, and precomputed fishing and rip scores into IndexedDB / Cache Storage.
- Tides and physics are computed on device, so other spots and times still work offline.
- **DATA AGE readout:** segmented display of time since last sync. Green when fresh, amber after 12 h, red after 48 h.

## 7. Visual style

Retrofuturistic HUD in the Evangelion / NASA mission-control vein:
- Near-black background, phosphor **amber** (primary) and **green** (secondary), red for warnings.
- CRT glow (text-shadow), faint scanlines, slight vignette.
- Segmented seven-segment style digits for numbers, monospace labels in caps.
- Thin bordered panels with corner brackets, hazard stripes for alerts.
- Animated wind and current particles (WebGL), subtle flicker on state changes.
- Must stay readable in sunlight on a phone: high contrast, large hit targets.
