# Cross-feature sync (PLAN 7.11)

Features were built in phases, so older ones can miss data that landed later. This table shows which inputs each feature reads today. Update it whenever a feed or a feature lands.

✓ = used · ✗ = available in the app but not used · – = not relevant

## Fishing (audit of 2026-11-04)

| Input (feed) | Habitat heat | BEST SPOTS | BITE (now) | BEST TIMES strip | WATCH BITE metric |
|---|---|---|---|---|---|
| Depth, slope, reefs, river mouths (seafloor, OSM) | ✓ | ✓ | ✓ via habitat | ✓ via habitat | ✗ (no habitat) |
| Season by month | ✓ | ✓ | ✓ | ✓ | ✗ |
| OBIS / GBIF records | ✓ | ✓ | ✓ | ✓ | ✗ |
| Tide (Limón harmonics) | – | ✗ | ✓ | ✓ | ✓ |
| Sun and moon (astro) | – | – | ✓ | ✓ | ✓ |
| Wind (forecast) | – | ✗ | ✓ | ✓ | ✓ |
| Waves (forecast) | – | ✗ | ✓ | ✓ | ✓ |
| Rain (weather, 3 models) | – | – | ✓ | ✓ | ✓ |
| Cloud cover (weather) | – | – | ✓ | ✓ | ✓ |
| Squall risk: CAPE, gusts (weather) | – | – | ✓ | ✓ | ✓ |
| Lightning (live strikes) | – | – | ✓ (hour around now) | ✓ (hour around now) | ✗ (live only) |
| Tropical storms | – | – | ✗ | ✗ | ✗ |
| Water clarity (CLARITY forecast: satellite Kd490, river plumes, stirred bottom) | ✗ | ✓ | ✓ | ✓ (slider time) | ✗ (no species) |
| Water temperature (MUR SST analysis) | ✗ | ✓ | ✓ | ✓ (slider time) | ✗ (no species) |
| Chlorophyll (gap-filled daily) | ✗ | ✓ | ✓ | ✓ (slider time) | ✗ (no species) |
| Currents (forecast) | – | ✗ | ✗ | ✗ | ✗ |
| Sargassum beaching outlook | – | ✓ | ✓ | ✓ (slider time) | ✗ |
| Live tide gauge (Limón) | – | – | ✓ (above or below the tide, hours around now) | ✓ (same) | ✗ |
| Pressure tendency (weather, 3 models) | – | – | ✓ | ✓ | ✓ |
| Moonlight at night (astro) | – | – | ✓ | ✓ | ✓ |
| River flow at the mouths (GloFAS) | ✗ | ✓ | ✓ | ✓ (slider time) | ✗ |
| Mixed-layer depth (Copernicus) | – (BOAT › OFFSHORE FISH only) | – | – | – | – |
| Your own CATCH pins (BOAT mode) | ✓ (fit and nudge) | ✓ | – | – | – |

Before this pass fishing was built from the static seafloor plus tide, sun, moon, wind and waves; rain was an input nobody fed, and BEST TIMES ignored the hourly forecast. Steps 1 (weather and safety) and 2 (water) below are in. Currents do not reach fishing yet, and the amber heat stays structure and season only. Storms act through their wind and waves.

## Plan

1. **Weather and safety into BITE** (done). Wire heavy rain (the input was there but never fed). Overcast stretches the low-light bite through the day. A squall watch or a lightning strike within 25 km in the last 15 min caps BITE and says why (get off the water). BEST TIMES and the WATCH BITE metric use the hourly wind, waves and rain forecast instead of timing only.
2. **Water into BITE and BEST SPOTS** (done; formulas in `docs/FISHING.md`). A per-species water term from clarity, temperature and chlorophyll, plus sargassum fouling lines on shore spots. Rules of thumb:

   | Species | Visibility it likes | Water temperature, best | Notes |
   |---|---|---|---|
   | Snook | 0.5 to 2.5 m (stained) | 24 to 30 °C | Ambushes in colour lines at mouths |
   | Jack | 1 to 6 m | 24 to 30 °C | Broad tolerance |
   | Snapper | 3 to 15 m | 24 to 29 °C | Reef fish, wants clearer water |
   | Barracuda | 4 to 20 m (clear) | 24 to 30 °C | Sight hunter |
   | Spanish mackerel | 3 to 15 m | 25 to 30 °C | Reef edges and drop-offs |
   | Grouper (small reef) | 4 to 20 m | 24 to 30 °C | Reef and rock |
   | Lionfish | 6 to 25 m | 24 to 31 °C | Speared, so you need to see it |

   Chlorophyll of about 0.3 to 3 mg/m³ marks productive water with bait; above that it is usually a muddy plume, which clarity already catches. This coast's water is 27 to 30 °C most of the year, so temperature will rarely move the score inshore; it matters more offshore.
3. **Currents.** Moving ocean current at a spot adds to the tide term for jack, barracuda and snapper; strong current is a minus for kayaks.

## New metrics worth tracking for fishing

Ranked by value for effort.

| Metric | Source | Why | Cost |
|---|---|---|---|
| Your own catches | BOAT mode CATCH pins already store species, place and time | The only way to check the model against real fish on this coast; with a few dozen catches the weights can be fitted the way OBIS records are | Low: data is already on the phone |
| River discharge | Open-Meteo flood API (GloFAS), free, no key | Snook and jack stack at mouths when rivers run after rain; better than the catchment-rain proxy | Low |
| Barometric pressure trend | Open-Meteo `pressure_msl`, same call as weather | Falling pressure before a front is a classic feeding trigger (angler lore, weak evidence, so small weight) | Very low |
| Temperature and chlorophyll fronts (done, PLAN 7.17) | Gradients of the SST and chl we already load | Bait and pelagics (mahi, wahoo, sailfish) gather on fronts; unlocks offshore boat scoring | Medium |
| Sea level from the live gauge | IOC Limón gauge, already loaded | Real water level over flats and reef includes surge the harmonics miss | Low |
| Moon light at night | Astro, already computed | Bright nights change snook and jack night feeding | Very low |
| Fishing pressure (done, PLAN 7.19) | Global Fishing Watch | Where boats work offshore; FISHING BOATS layer | Free `GFW_TOKEN` secret (set) |
| Mixed-layer depth (done, PLAN 7.18) | Copernicus Marine (account exists) | How deep offshore fish sit; feeds BOAT › OFFSHORE FISH | Medium |

## Other features that miss newer data (for later)

- **Surf:** no rain, lightning or sargassum in the verdict; no tide in the break quality.
- **Dive and snorkel outing score:** rain, squall and lightning now cap it (PLAN 7.11, shared `physics/safety.ts`). Surface current now scores too (drift off the reef; PLAN 7.11). Water temperature (cold term plus a suit hint) and the sargassum outlook at the nearest beach now score too; WATCH has a WATER TEMP metric. Still missing: tropical storm alerts.
- **BOAT verdict and sea state:** verdict with squall, lightning, storm and rain cap added (PLAN 7.23 item 1). Still missing: tide, bars, daylight, debris, shoals (items 2 to 8).
- **WATCH tracker:** no water temperature or chlorophyll metric; BITE there ignores habitat and rain.

## Sailing / BOAT (audit of 2026-11-04, PLAN 7.23)

| Input | Verdict | Sea comfort | BEST TODAY / WATCH |
|---|---|---|---|
| Wind speed | ✓ | ✓ (wind sea) | ✓ |
| Wind direction | – | ✓ (cross sea) | ✓ (WIND FROM, WATCH only) |
| Gusts | ✓ | – | ✓ |
| Wind sea / swell, period | ✓ via comfort and height | ✓ | ✓ (SEA COMFORT) |
| Squall (CAPE + gusts) | ✓ | – | ✓ |
| Lightning | ✓ | – | ✗ |
| Tropical storm range | ✓ | – | ✗ |
| Heavy rain | ✓ | – | ✓ |
| Currents | ✗ | ✓ (against / with waves) | ✓ (CURRENT, and inside SEA COMFORT) |
| Tide, gauge | ✗ | – | ✗ |
| River flow (debris) | ✓ (LIKELY = MARGINAL) | – | ✗ |
| Sunset, moon, pressure trend | ✓ (rows under SEA STATE) | – | ✗ |
| Depth, reefs, seamarks | ✗ (map only) | – | – |

Vessel (SET): SMALL BOAT is MARGINAL at 15 kt / 20 kt gusts / 1.2 m seas and NO-GO at 20 / 27 / 2.0; YACHT is MARGINAL at 20 / 27 / 2.0 and NO-GO at 28 / 37 / 3.0. Thresholds are rules of thumb in `src/boat/verdict.ts`.
