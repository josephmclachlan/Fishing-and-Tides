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
