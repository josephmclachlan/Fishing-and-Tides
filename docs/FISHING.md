# Shore and kayak fishing layer (PLAN 4.5)

A habitat guide for where to try first from the beach or a kayak, drawn as a heat of ~220 m cells (green = fair, amber = best) from the coast tier in. Pick the target species with the arrows in the side panel; HABITAT shows the score at the reticle and how the forecast month suits the species (PEAK / GOOD / OFF). The time slider moves the month.

**Reach.** Open water within 1.5 km of the coast and shallower than 50 m (a paddle or a long cast).

**Score** (all terms 0..1, see `src/fishing/habitat.ts`):
`depth fit × (mouth weight × river-mouth pull + reef weight × reef cover + drop weight × drop-off) × season`

| Input | Where it comes from |
|---|---|
| Depth, drop-off slope | GEBCO 2026 15″ grid (`docs/SEAFLOOR.md`) |
| Reef cover | Allen Coral Atlas zones and coral, algae or rock bottom, within ~440 m |
| River and creek mouths | OSM named waterways ending at the coast (`npm run data:fishing`, `public/data/fishing/mouths.geojson`); creeks pull half as far as rivers |
| Season | A narrow monthly factor (0.7 to 1) per species |

Species: tarpon, snook, jack, snapper, barracuda (`src/fishing/species.ts`).

**What this is not.** The weights, depth ranges and seasons are angling rules of thumb written by hand, not fitted to data or checked with local guides. Tide windows, rips, water clarity and temperature are not in the score yet (they need PLAN 3.1, 3.5, 2.x). PLAN 4.4 and 4.7 replace this with a species-habitat model fitted to OBIS/GBIF records. Treat it as a way to pick where to look, and check closed seasons and protected areas (PROTECTED layer, PLAN 6.8) before fishing.
