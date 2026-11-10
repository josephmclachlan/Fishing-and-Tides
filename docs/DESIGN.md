# Design: Fishing and Tides

A Windy-style ocean conditions and fishing app with a retrofuturistic HUD look, built first for one stretch of coast and designed to work offline on the water.

## 1. Region

Costa Rica Caribbean coast, **Gandoca to Limón city only** (approx. 9.55°N to 10.02°N, 82.55°W to 83.08°W). Key places: Gandoca-Manzanillo, Punta Uva, Puerto Viejo (Salsa Brava), Playa Negra, Cahuita, Westfalia, Playa Bonita, Limón. River mouths: Sixaola, Estrella, Banano. Macro view extends out to the western Caribbean so incoming swell and fronts are visible.

Tides here are small (microtidal, under about 0.5 m), so tide *timing* matters more than height. NOAA networks barely cover the area, so we rely on global models and validate against the few local observations.

## 2. Data sources

| Domain | Source | Use |
|---|---|---|
| Tides | Harmonic constants fitted to the UHSLC Limón gauge (TPXO/FES need registration); see `docs/TIDES.md` | Tide height and timing computed on device, forever offline |
| Tide validation | UHSLC Limón tide gauge | Check and tune the harmonic constants |
| Waves and swell | WaveWatch III, Open-Meteo Marine | Offshore Hs, Tp, direction, swell partitions (Open-Meteo is the easy default) |
| Currents | Copernicus Marine, HYCOM | Offshore surface currents; nearshore currents modeled by us |
| Wind | GFS, ECMWF via Open-Meteo | Wind field and particles |
| Sea temp, chlorophyll | NOAA CoastWatch ERDDAP (VIIRS, MODIS) | SST, temperature fronts, chlorophyll edges |
| Bathymetry | GEBCO 2026 (15″), OSM coastline mask; see `docs/SEAFLOOR.md` | Shoaling, refraction, depth contours, fishing depth |
| Reefs, seamarks | Allen Coral Atlas, OpenStreetMap | Reef zones and bottom cover, named reefs, wrecks, lights |
| Species | OBIS, GBIF | Occurrence records to fit habitat models |
| Fishing pressure | Global Fishing Watch | Vessel activity, offshore corridors |

All network calls go through one adapter module per source, behind a small cache so the client never hammers upstream APIs: gridded forecasts are fetched by a scheduled data build and published as static packed files, and live point readings use an offline-first fetch helper. See `docs/DATA.md`.

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

**ENHANCE toggle.** A setting (on by default, remembered on the device) turns the whole enhance effect off. When off, picking a beach or coordinate still makes the same journey as ENHANCE on: a smooth zoom out to the wide view, a smooth pan to centre the target, then a smooth zoom in. Each leg is one eased move. What is dropped is the effect: no scanline sweep or reticle overlay, no flashing box, no pixelation and no stepped zoom. Finer detail (grids, coastline glow, labels, spot data) fades in smoothly as the zoom crosses each tier, so the trip still feels alive and the detail still builds as you get closer.

**Map limits.** The camera may pan and pinch out well past the analysed area (`REGION.viewBounds`, several degrees beyond `REGION.maxBounds` on every side), so zooming out never hits a wall at Panama or Nicaragua; it only stops at a wide view of the whole western Caribbean.

**Enhance fly-to** (80s action-movie "enhance"): searching or tapping a beach or coordinate (spot tabs, or a search box taking a beach name, decimal degrees or degrees + decimal minutes) first pulls smoothly all the way back to the wide view (the whole region on screen) without panning, then flashes a box over the target where it sits, smoothly pans to centre it under the crosshair, and steps into the box, and the picture breaks into pixels in proportion to the zoom: sharp when the hop starts, blocks growing as it zooms (anchored on the target so the coastline outline stays readable), coarsest on arrival, then resolving piece by piece. Once clear, a smaller box is drawn and the sequence repeats, about one hop per zoom tier (2 to 4 hops), until it lands on the beach or ocean point.

## 5b. Phone layout

On a phone the map comes first. Only two HUD pieces stay on screen: the top bar (title, tier, UTC clock and one row of tabs: LAYERS, FIND, COND, BOAT, SET) and a bottom strip (the chosen forecast hour plus swell, wind and tide). Everything else is a **drawer** that stays closed until its tab is tapped:

| Tab | Drawer |
|---|---|
| FIND | Beach and coordinate search with the spot tabs; closes itself when a target is picked so the fly-to is in full view |
| COND | Conditions, seafloor, target and zone readouts |
| LAYERS | Activity presets and layer toggles |
| BOAT | Boat mode: GPS track, pins, species |
| SET | Settings: ENHANCE, SUN (sunlight mode) and the EN/ESP flags. On wide screens these stay in the top bar |
| Bottom strip (tap, chevron points up) | Forecast time slider, step and play buttons, lat/lon/altitude, data age, SYNC FOR TRIP |

One drawer is open at a time. A drawer closes from its own tab or strip (tap again), its X, a tap on the map (a drag or pinch leaves it open, so the readouts can be watched while panning), or Esc. Drawers sit between the top bar and the bottom strip, so a tab is never covered. Wide screens keep the full layout with the LAYERS drawer open and the same close controls. Code: `src/sheets.ts`.

## 6. Layers and activity modes

Everything is a **layer** you can switch on or off from the LAYERS drawer (a tab in the top bar on phones, right side on wider screens): waves/swell, currents, wind, water temp, clarity, rip risk, surf breaks, depth, reefs, seamarks, fishing, protected zones, anchorages. The default is ALL. One tap on an **activity** preset (FISH, DIVE, SURF, SAIL) switches on just the layers that activity needs; tapping the active preset again, or ALL, brings everything back. Toggling a single layer by hand leaves the preset (the header reads CUSTOM) and returns to the preset's name if the set matches again. Choices persist on the device. Layers whose data isn't built yet show SOON.

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
| **Dive / snorkel** | Underwater visibility: diffuse attenuation Kd490, chlorophyll, suspended sediment. River plumes after rain (Sixaola, Estrella, Banano) are the main killer here. | NOAA CoastWatch ERDDAP VIIRS Kd490 and chlorophyll; Copernicus Marine Ocean Colour (OLCI); rainfall from Open-Meteo or NASA GPM IMERG | Visibility estimate: Secchi depth (Lee et al. 2015) from the month's clear-water Kd490 plus fresh satellite murk (Copernicus GlobColour, a day late), river plumes and bed stirring by waves and current, each from its own physics (PLAN 7.45, 7.47). Clouds gap the satellite data, so fall back to rain plus waves. |
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

## 6b. Time slider and confidence bands

One slider (state in `src/time.ts`) drives every time-varying layer and readout. It reaches 30 days in three bands, each styled differently so uncertain data is never mistaken for a forecast:

| Band | Range | Step | Data | Look |
|---|---|---|---|---|
| FORECAST | 0 to 7 d | 1 h | Model output (waves, wind, currents) | Green label, full-strength particles |
| LOW CONF | 7 to 16 d | 3 h | Same models, poor skill | Amber dashed label, dimmed particles, dashed panels |
| OUTLOOK | 16 to 30 d (and beyond later) | 1 d | Climatology: historical averages for that date | Red dotted label, faint particles, panel tagged CLIMATE AVG |

- **Tides are exact in every band**, because they come from harmonic constants, not weather.
- Today the bands run on mock data (OUTLOOK uses the mock's mean pattern); the Phase 2 adapters supply real forecasts, and a historical-averages source for OUTLOOK is still to plan (e.g. ERA5 or Open-Meteo Historical, by day of year).
- A historical (past-date) mode would extend the same store with negative offsets; not built yet.

## 7. Offline

- Installable PWA (service worker plus web manifest).
- **"Sync for trip" button** downloads map tiles for the whole region (~2,200 tiles, ~23 MB), the swell, wind and current forecasts (16 days, so the 7 that matter are covered) and the live feeds into Cache Storage, and confirms the bathymetry is in the app's precache. The button shows the step and percentage and cancels on a second tap; a TRIP row shows when the last sync finished and its size, red once its 7 days have run out. Fishing and rip scores are not stored: they are computed on the phone from the synced inputs, so they follow the time slider offline too. See `docs/DATA.md`.
- Tides and physics are computed on device, so other spots and times still work offline.
- **DATA AGE readout:** segmented display of the age of the oldest live feed (the model data's own fetch time, not when the phone downloaded it): `03H00` under 100 h, then `04D12H`. Green under 12 h, amber to 48 h, red after.
- **Fallbacks, in order:** (1) network; (2) the phone's last stored copy of the feed, which keeps its original age, so DATA AGE turns amber or red and a CACHED tag appears; (3) simulated values with no age at all: DATA AGE reads SIM (SIMUL.), never an invented number. Offline (the phone has no network) shows an OFFLINE tag by DATA AGE, in the phone's bottom strip even with the drawer shut, and turns the title dot amber. The strip also shows the age whenever it is not fresh.
- **Coming back:** when the network returns, or the app returns to the front with data older than 3 h or from the stored copy, the feeds reload by themselves; no page refresh needed.

## 8. Visual style

Retrofuturistic HUD in the Evangelion / NASA mission-control vein:
- Near-black background, phosphor **amber** (primary) and **green** (secondary), red for warnings.
- CRT glow (text-shadow), faint scanlines, slight vignette.
- Segmented seven-segment style digits for numbers, monospace labels in caps.
- Thin bordered panels with corner brackets, hazard stripes for alerts.
- Animated wind and current particles (WebGL), subtle flicker on state changes. Wind is amber, currents green, both brighter when faster and red when strong (wind 25 kt or more, current 1.5 kt or more). Particles keep a steady on-screen pace at every zoom; currents stay in the sea (clipped to the OSM coastline). With both on, wind thins out so the sea stays readable. Under the reticle the side panel reads CURRENT (kt) and SET (°T, the direction it flows toward).
- Must stay readable in sunlight on a phone: high contrast, large hit targets.
- **Readability pass (PLAN 5.3):** on a phone, small print is at least 11 px, tabs and buttons are 40 to 48 px tall, the top bar is one row of tabs (about 80 px), and the HUD respects safe-area insets. A phone held sideways (short and touch) uses the same drawer layout. The OS reduced-motion setting turns off flicker and blinking.
- **SUN mode** (a toggle in SET, saved on the device; on by default when the OS asks for high contrast): drops the scanlines, vignette and glow, makes panels near-opaque with solid amber borders and full-strength labels, so the HUD survives glare. The map itself stays dark.

## 9. Final additions

Built after the core app (PLAN Phase 7).

- **Sargassum/seaweed.** Satellite detections (USF SaWS AFAI, NOAA AOML Sargassum Inundation Report) give where the mats are now; we move them forward with currents, Stokes drift and a small wind term (about 1 to 3%) to forecast beaching per beach over 1 to 5 days. Satellite gaps under cloud are shown as unknown, not clear.
- **Water clarity predictions.** Extends the Phase 6 clarity layer from "now" to a few days ahead: Kd490, chlorophyll and turbidity trends, river plume transport after rain, and swell resuspension. Shown with a confidence band.
- **Weather tracker.** Rain, cloud, sun/UV, temperature, and hurricanes from the NHC. We do not run our own weather model; we blend GFS, ECMWF and ICON (Open-Meteo) per variable, weighting each by its recent error against local stations, the Limón gauge and buoys, and show model spread as confidence.
- **Lightning.** GOES GLM strikes drawn as a layer, with an alert-strip warning when a strike is within a set distance.
- **Sun, moon, solunar.** Sunrise/sunset, golden hour, moon phase and rise/set, and solunar windows, computed on device so they work offline.
  Built (PLAN 7.7, `src/physics/astro.ts`, `src/astro-hud.ts`). Sun by Meeus' low-precision series, moon by Schlyter's series with the main perturbations; rise, set and transit are found by scanning altitude and hour angle and bisecting, so no tables are needed. Checked against PyEphem for Limón on five dates: sun events within 90 s, moon events within 5 min, moon illumination within 1.5 points (`astro.test.ts`). Shown as a collapsed SUN & MOON block in the COND panel for the slider's day at the map centre, in Costa Rica time (`REGION.tzOffsetH`, UTC-6, no daylight saving). Golden hour is the sun from 4° below to 6° above the horizon. Solunar windows are the usual rule (major ±1 h at moon overhead and underfoot, minor ±30 min at moonrise and moonset); the day rating (0 to 4) is a heuristic from the new/full-moon tide effect plus a major window near sunrise or sunset. The astronomy is exact, the fishing effect of solunar windows is angler folklore, and the panel says so. Being computed, it needs no feed and carries no DATA AGE tag.
- **Go/no-go verdict.** Per activity (Fishing, Diving/Snorkel/Spear, Surfing, Sailing), the inputs from section 6 are combined into GO, MARGINAL or NO-GO with the top two or three reasons ("surge high, visibility 3 m"). Advisory only, not for navigation or safety decisions. Rules and thresholds: `docs/VERDICT.md`.

## 9b. FORECAST page

A clean page beside the map for one spot and one activity, built to read at a glance (PLAN 7.52). Joseph gave Surfline's spot forecast as the layout reference: the most important number shown big, with a picture, then the days ahead. Its look is its own and does not follow the map themes. It uses sans-serif type, white cards and soft shadows, and has a light and a dark mode. Dark mode follows the phone until the user picks one, and the choice is saved on the device. The CLAUDE.md four-colour rule covers the map HUD, not this page. Here every colour is a `--fc-*` token in `src/forecast/forecast.css`.

- **Opening.** The FORECAST button (top bar on wide screens, a pill above the bottom strip on phones), or FULL FORECAST on a spot page. It has its own link, `#forecast/<spot>/<activity>`, so it can be bookmarked and the back button returns to the map. EN/ES switches language and keeps the page open.
- **Activity switch:** FISH, SURF, SWIM, SNORKEL, DIVE, SAIL. Each lists only its own spots, as WATCH does: surf breaks for surf and catalog snorkel spots for snorkel and dive. The spots are a thumb-scrolled row of mini forecasts: name, the headline value now, its rating word, and the next 12 hours as a strip of rating colours. Tapping one switches the page to it. They are light cards washed in the rating colour, not Surfline's dark map tiles. A sideways swipe across the hero picture also steps through the activities, and arrow keys move along the tabs.
- **Hero.** A picture drawn from the reading sits beside the headline number, a five-step rating bar and why. Surf shows the wave face to scale beside a 1.7 m surfer, with knee, waist and head lines. Fish shows the sky with the moon's real phase, one fish per bite level and the tide arrow. Snorkel and dive look along a reef, with markers every 5 m fading into murk past the visibility and a sea fan swaying with the surge. Swim shows a beach: the lifeguard flag in the rip risk's colour (green, yellow, red), the shore break drawn to scale, the sun's rays as long as the UV index, cloud and rain when there are, an umbrella and a swimmer. Sail shows a boat heeling with the wind, with streaks as fast as the wind, and the wind's Beaufort name under the number. Surf and sail carry a direction dial over the picture: swell (blue) and wind arrows pointing where they travel, and for surf the land side of the beach. The pictures fit whole in any box shape, so labels at the edges are never cropped.
- **Best time.** A callout under the rating names the week's best window at this spot, with its value, and one tap moves the hero there. When no day is good enough it names the best chance instead.
- **Next 7 days** bubbles: WATCH's best window per day at this spot (`metrics/plan.ts`), the headline value at its start, the best day ringed and pulsing. Each day also shows its UV peak. Tapping a day moves the hero there.
- **Hour by hour.** All rows share one time axis across the 7 days and sit in one horizontal scroller. At the top is a rating strip coloured by level. Below it are the activity's own rows, each one measure on one scale:
  - Surf: surf height, wind, tide, UV.
  - Fish: bite, tide, wind, rain, UV.
  - Snorkel: visibility, outing score, entry surf, wind chop, current, tide, UV.
  - Dive: visibility, outing score, surge, current, tide, wind, UV.
  - Sail: wind with gust ticks, swell, rain, tide, UV.
  - Swim: beach-day score, rip risk, shore break, UV, feels like, wind, rain, tide.

  Above the rating strip, a sky row shows one weather icon per 3 h (sun or moon, partly cloudy, cloud, rain, storm), and the worst hour of the three wins. UV bars are coloured by the WHO band. A dashed "now" line marks the present once another hour is picked. Wind rows carry arrows every 3 h. Nights are shaded, and each day's best window is a softly pulsing highlight. Only each day's peak is labelled, along with the tide's highs and lows. Tapping an hour moves the hero and the readout chips there. On a mouse, hovering previews an hour in the chips.
- **Swim** (`physics/swim.ts`): each hour's shore break and rip risk at the spot come from the spot model's last run there (shore normal, slope, breaking angle, known rip channel), scaled to that hour's swell, period, tide and onshore wind. Feels like is the real feel of PLAN 7.57 (Steadman apparent temperature) at the spot. The score starts at 100. Dark, storms, a high rip risk and shore break over 1.3 m cap it. A moderate rip, bigger shore break, wind, rain, heat, cool air or water, strong UV (a nudge to cover up), overcast skies, sargassum and a low sun in the first and last hour and a half of daylight scale it down.
- **Conditions** (PLAN 7.63): under the hero, a weather tile for the selected day (sky picture from rain, squalls and cloud: thunderstorms when a squall is likely or rain falls under a squall watch, rain from 10 mm in the day or 4 mm in an hour, showers from 1 mm or a 50 % chance, else cloudy from 75 % daylight cloud and partly from 35 %; high and low, real feel, chance and amount of rain, humidity, sea temperature, UV and wind peaks), then the activity's picture tiles. Each picture is drawn from its value, and each tip comes from the same bands the page uses elsewhere (WHO UV, NWS heat index levels 32 and 39 °C, rip and surge levels). The hour charts of every activity end with the same weather rows.
- **Numbers.** The page has no model of its own. `src/forecast/model.ts` reads the same scores as the map: break score, BITE, the outing score at 2 m and 6 m, and SEA COMFORT. The five levels cut at each score's own tone thresholds.
- **Motion** (numbers counting up, bars filling, the switch highlight sliding, the best day pulsing, the pictures moving, the dial needles turning the short way round, a sheen across the best-time callout, the picture cross-fading between hours, shimmer placeholders while the feeds load) is off when the phone asks for reduced motion.

## 10. Verify tool (SYSTEM CHECK)

Every feed can silently break (API change, outage, stale data, bad units), so each adapter ships with a check, built alongside the Phase 2 adapters. A check covers:

1. **Reachability:** the source responds.
2. **Freshness:** `fetchedAt` and the data's own timestamp are within the source's expected cadence.
3. **Schema:** the response parses into the adapter's expected shape.
4. **Physical ranges:** values are plausible for the region (for example Hs 0 to 8 m, SST 24 to 32 °C, tide amplitude under 1 m).
5. **Cross-source agreement:** where two sources measure the same thing (Open-Meteo vs WaveWatch III waves, modelled tide vs UHSLC gauge, GFS vs ECMWF wind), flag disagreement beyond a tolerance.

It runs two ways from the same code in `src/verify/`:

- **Automatic:** a scheduled GitHub Action (daily) runs every check and opens, or updates, a GitHub issue naming the failing feed and check; it closes the issue when the feeds recover.
- **Manual:** a SYSTEM CHECK HUD panel (`src/system-check.ts`, the CHECK button in the top bar, or in SET on a phone) lists every feed with a green (pass), amber (degraded: stale or sources disagree) or red (failed) lamp, the worst check and the feed's data age, with a re-run button; tapping a feed lists all its checks. A small lamp on the CHECK button shows the overall result with the drawer shut. The last run is kept on the device: offline, the panel shows it with its age and the re-run button is off, instead of running checks that could only fail. Check labels and detail come from the adapters in English; the panel chrome is translated.
- **One list:** `src/verify/registry.ts` `allChecks()` gathers every adapter's checks, and both the panel and the daily Action run it. A new adapter adds one line there.

Each new adapter adds its checks; a PR that adds an adapter without them is incomplete.

## 11. Language (EN/ESP)

The HUD runs in English or Spanish, switched with two small flag buttons in the top bar: a UK flag (EN) and a Costa Rica flag (ESP), drawn in the HUD style (amber/green line art, no photos), the active one lit. Every user-facing string goes through `t(key)` (PLAN 1.10); `src/i18n/en.ts` defines the keys and `src/i18n/es.ts` must provide all of them (the `Dict` type and a test enforce it, including `{placeholders}`).

- **First run** follows the browser language (any `es` tag, such as es-CR or es-419, gives Spanish; anything else English). **The choice is remembered** on the device once the user taps a flag, and then wins over the browser.
- **Switching** saves the choice and reloads the page, because every panel builds its text once at start-up. The map camera is carried across the reload (sessionStorage), so the user stays where they were.
- **Vocabulary** is Costa Rican Caribbean: SÁBALO (tarpon), ROBALO (snook), JUREL (jack), PARGO (snapper), RESACA (rip current), OLEAJE (swell), ROMPIENTES (surf breaks), FONDEADEROS (anchorages), PESCA PROHIBIDA for no-fishing zones. Nautical terms are DEMORA (bearing) and RUMBO (current set). The Spanish was written by Claude and still needs a check by a local speaker.
- **Formats:** GPS letters follow the language (O for west in Spanish; the coordinate search accepts both W and O); day names are translated; numbers keep the decimal point and UTC times stay 24-hour in both languages, matching GPS and chart conventions on the water; units (M, KM, KT, °C) are the same.
- Place names, protected-area names (translated: PARQUE NACIONAL CAHUITA), and map labels from the base map stay as published.

## 12. Live local observations

The coast has few live sensors, so the app uses every real reading it can get for Gandoca to Limón and is honest about what is missing. Confirmed in `docs/OBSERVATIONS.md` (PLAN 2.10): the Limón tide gauge (live from IOC every minute, quality-controlled hourly from UHSLC), the Limón airport METAR **MRLM** (daytime only), satellite SST and chlorophyll/Kd490 from NOAA CoastWatch, and ASCAT scatterometer wind passes from Copernicus Marine. IMN publishes no usable feed. There is **no wave or met buoy** within about 800 km, so waves stay model-only and the app says so.

- **LIVE OBS layer and panel:** each reading with its age and a freshness colour, on the map and in a HUD panel.
- **Local bias correction:** the model-minus-observed error at these stations is learned and removed from the forecast (wind, tides, SST; extends the weather blend in section 9), shown with a confidence value.
- **SYSTEM CHECK:** compares each forecast with what was observed, so drift shows up as amber or red (section 10).
