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

**What this is not.** The weights, depth ranges and seasons are angling rules of thumb written by hand, not fitted to data or checked with local guides. Tide windows, rips, water clarity and temperature are not in the score yet (they need PLAN 3.1, 3.5, 2.x). PLAN 4.7 adds OBIS/GBIF records as a small nudge (below); PLAN 4.4 would replace the rules with a fitted model. Treat it as a way to pick where to look, and check closed seasons and protected areas (PROTECTED layer, PLAN 6.8) before fishing.

## Boat mode (PLAN 4.6)

The BOAT tab opens a drawer (a sheet on phones, see `src/sheets.ts`). It works with no signal: GPS needs none, and everything is stored on the device (`localStorage`, key `ft.boat.v1`).

- **REC TRACK / STOP** records the GPS track. A fix is kept when the boat has moved 15 m or 20 s have passed, and fixes worse than 50 m accuracy are dropped. The screen is asked to stay on while recording (a web page cannot keep recording once the phone locks). A recording resumes after a reload.
- **MARK** drops a waypoint at the last GPS fix; **CATCH** does the same with a species (mahi, wahoo, kingfish, tuna, sailfish, other). Each pin stores the GEBCO depth there (a guide, not a sounding). The last five pins are listed: tap one to fly to it, ✕ to remove it.
- **EXPORT GPX** downloads the track and pins for a chartplotter or phone app. **CLEAR** needs two taps.
- The track, pins and boat position are drawn by the `bt-` map layers, switched with the FISHING toggle.

Not in yet: offshore fronts and FAD positions (no open data source found; fronts need the satellite SST from PLAN 2.12), and species scoring for offshore water (PLAN 4.4).

## Species records and fishing pressure (PLAN 4.7)

**OBIS and GBIF** (`npm run data:occurrences`, output `public/data/fishing/occurrences.json`, rebuilt by hand now and then): occurrence records for the shore, kayak and boat species in a box 0.5° around the region, merged when species, position and year match. Records here are sparse (tens per species: about 12 tarpon, 79 snook, 250 snapper, 2 mahi, none for wahoo, tuna or sailfish) and show where people looked, not where the fish are. So they are a nudge only: each record within ~2 km adds up to 10% to that species' score there, capped at +30%, and a cell the habitat model scored zero stays zero (`src/fishing/occurrences.ts`). The nudge applies to the shore and kayak species the layer scores today; the boat species' records are stored for PLAN 4.4.

**Verify checks** (`src/fishing/checks.ts`): OBIS and GBIF reachable, record file fresh (a 90-day cadence), schema, and records inside the box with believable years. They are exported for the daily Action (PLAN 2.8) and SYSTEM CHECK (2.9) to pick up.

**Global Fishing Watch is not in yet.** Its API needs a free token. To add it, register at globalfishingwatch.org/our-apis, put the token in the repo secrets as `GFW_TOKEN`, and a data build can fetch vessel effort for the offshore boat layer. Until then boat mode has no fishing-pressure layer.
