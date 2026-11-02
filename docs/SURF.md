# Surf break catalog (PLAN 6.4)

Four curated breaks, drawn as amber rings (names from the coast tier, type and shape at the spot tier) and read out in the BREAK rows of the side panel: type, which way it faces, hazards, and a CHECK tag where the guides disagree or only one covers it. The SOURCE button links the guides. Data: `src/data/surf-breaks.ts`; helpers: `src/surf-breaks.ts`. The quality model that scores each break against swell and wind is PLAN 6.3 (it reads `facing` and `type`).

| Break | Type | Faces | Hazards | Confidence |
|---|---|---|---|---|
| Salsa Brava | reef, right | N | shallow reef, urchins, rips, crowds | CHECK: guides disagree on the season (Nov to Apr, or Jan to Mar for the big days) |
| Playa Cocles | beach, peaks | NE | shorebreak, rips | two guides |
| Playa Negra | beach, peaks | NE | rips | CHECK: one guide, "mellow on small swell" |
| Playa Bonita (Limón) | reef, left | N | reef, rips | CHECK: one guide (Surfnerd): NE to E swell, south wind offshore |

**How the numbers were made.** Positions come from `SPOTS` (`src/region.ts`) where the spot exists there, otherwise from the shoreline of the OSM land mask (Playa Cocles). `facing` is the seaward direction measured from the land mask over about 1 km, rounded to 5°, good to about ±15°. Types, hazards and seasons are from the linked guides: Mondo Surf, Surfnerd, Lonely Planet, Culture Trip, Costa Rica Journeys. OpenStreetMap has no `sport=surfing` objects in the region, so nothing came from it.

**Not covered.** Punta Uva, Playa Chiquita, Cahuita and Manzanillo: the guides I could read had nothing usable. Add them when someone with local knowledge can confirm type and hazards. Tide preference is left out because the guides disagree (some say all tides work, one lists rising tide as better at Playa Bonita).

## Quality model (PLAN 6.3)

Each break is run through the same physics as the spots (refraction over GEBCO, then Komar and Gaughan breaking; `docs/PHYSICS.md`), then scored in `src/surf-quality.ts`:

`Q = 10 × size × period × window × wind` (0 to 10)

| Factor | Rule |
|---|---|
| Size | Breaker height against the break type's working range: beach 0.4 → 0.8 to 1.8 → 2.8 m (closes out above), reef 0.6 → 1.0 to 2.5 → 3.5 m, point 0.5 → 0.9 to 2.5 → 3.5 m |
| Period | 0.35 at 6 s rising to 1 at 13 s |
| Swell window | 1 inside the guides' window (or ±60° of the facing), easing to 0.4 at 30° outside |
| Wind | Offshore (from the land) keeps faces clean; onshore takes up to 65% off by 8 m/s, cross-shore up to 15%, very strong offshore up to 20% |

Bands: FLAT (breaker under 0.3 m), POOR under 3, FAIR to 5.5, GOOD to 8.5, EPIC above. Rings on the map turn green for GOOD and EPIC, amber for FAIR, red for POOR and dim when FLAT. The spot-tier label and the SURF row show the band, the score and the wind (OFFSHORE, CROSS, ONSHORE or GLASSY).

**Playa Bonita's facing needs a look.** The catalog says it faces 10° (N), but measured from the OSM coastline around the pin the open water runs from about 15° to 90°, a shore normal of about 50° (NE). The model uses the measured shore normal for refraction and wind, and the catalog swell window for scoring.
