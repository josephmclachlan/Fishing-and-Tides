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

## Boat mode (PLAN 4.6)

The BOAT tab opens a drawer (a sheet on phones, see `src/sheets.ts`). It works with no signal: GPS needs none, and everything is stored on the device (`localStorage`, key `ft.boat.v1`).

- **REC TRACK / STOP** records the GPS track. A fix is kept when the boat has moved 15 m or 20 s have passed, and fixes worse than 50 m accuracy are dropped. The screen is asked to stay on while recording (a web page cannot keep recording once the phone locks). A recording resumes after a reload.
- **MARK** drops a waypoint at the last GPS fix; **CATCH** does the same with a species (mahi, wahoo, kingfish, tuna, sailfish, other). Each pin stores the GEBCO depth there (a guide, not a sounding). The last five pins are listed: tap one to fly to it, ✕ to remove it.
- **EXPORT GPX** downloads the track and pins for a chartplotter or phone app. **CLEAR** needs two taps.
- The track, pins and boat position are drawn by the `bt-` map layers, switched with the FISHING toggle.

Not in yet: offshore fronts and FAD positions (no open data source found; fronts need the satellite SST from PLAN 2.12), and species scoring for offshore water (PLAN 4.4).
