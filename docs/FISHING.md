# Shore and kayak fishing layer (PLAN 4.5)

A habitat guide for where to try first from the beach or a kayak, drawn as a heat of ~220 m cells (green = fair, amber = best) from the coast tier in. Pick the target species with the arrows in the side panel; HABITAT shows the score at the reticle and how the forecast month suits the species (PEAK / GOOD / OFF). The time slider moves the month.

**Reach.** Open water within 1.5 km of the coast and shallower than 50 m (a paddle or a long cast).

**Score** (all terms 0..1, see `src/fishing/habitat.ts`):
`depth fit × (base + mouth weight × river-mouth pull + reef weight × reef cover + drop weight × drop-off) × season`

The four weights sum to 1. They start from hand-written rules and are fitted to the species records when the layer loads (PLAN 4.4, below).

| Input | Where it comes from |
|---|---|
| Depth, drop-off slope | GEBCO 2026 15″ grid (`docs/SEAFLOOR.md`) |
| Reef cover | Allen Coral Atlas zones and coral, algae or rock bottom, within ~440 m |
| River and creek mouths | OSM named waterways ending at the coast (`npm run data:fishing`, `public/data/fishing/mouths.geojson`); creeks pull half as far as rivers |
| Season | A narrow monthly factor (0.7 to 1) per species |

Species: tarpon, snook, jack, snapper, barracuda (`src/fishing/species.ts`).

**What this is not.** The depth ranges, mouth reach and seasons are angling rules of thumb written by hand, and the weights are those rules updated by a few dozen records (below), not checked with local guides. Rips are not in the score. Tide, light, solunar, weather, clarity, temperature, chlorophyll and sargassum are in the BITE score and BEST SPOTS below, not in the heat. The score is not a catch forecast. Treat it as a way to pick where to look, and check closed seasons and protected areas (PROTECTED layer, PLAN 6.8) before fishing.

## Fitted habitat weights (PLAN 4.4)

`src/fishing/fit.ts`. The records are treated as a Poisson point process whose intensity is the score itself, `λ(x) ∝ depth fit × Σ w_j g_j(x)` over the fishing cells. That makes each record's cell a draw from a mixture of four known maps (open bottom, river mouths, reef, drop-offs), and the fit finds how much of the fish each map holds. It runs EM with a Dirichlet prior centred on the hand-written weights and worth 20 records. With no records the weights are the rules; with many, the records take over. Records are snapped to the nearest cell within ~440 m and thinned to one per cell, and records in cells outside the species' depth range are dropped and counted (they hint that the range or GEBCO's ~460 m depth is off). It takes a few milliseconds for all five species in the browser, so the fit always matches the record file.

What the records in the region (Gandoca to Limón, 1.5 km from the coast) say, from the file of 2026-11-02 (base / mouth / reef / drop):

| Species | Record cells | Outside depth | Prior weights | Fitted weights | Held-out gain, nats per record |
|---|---|---|---|---|---|
| Tarpon | 1 | 0 | .05 / .71 / .00 / .24 | .05 / .69 / .00 / .25 | 0 (one record) |
| Snook | 9 | 2 | .05 / .76 / .10 / .10 | .04 / .65 / .22 / .10 | +0.00 |
| Jack | 3 | 1 | .05 / .47 / .24 / .24 | .05 / .52 / .21 / .22 | +0.03 |
| Snapper | 28 | 6 | .05 / .10 / .52 / .33 | .02 / .36 / .45 / .17 | +0.22 |
| Barracuda | 3 | 0 | .05 / .10 / .52 / .33 | .05 / .13 / .51 / .32 | −0.02 |

Held-out gain is leave-one-out: refit without each record, then compare how likely the held-out record is under the refit and under the rules alone (above 0 means the records improve on the rules). Only snapper has enough records to move far: its records sit near river mouths more often than the rules expected. That is plausible (grey and dog snapper juveniles use estuaries), but it is also where people sample, so the prior is kept at 20 records even though leave-one-out prefers a weaker one (5 records gives snapper +0.37). Leave-one-out cannot see a sampling bias that every record shares. The other species stay close to the rules.

What stays hand-written: the depth ranges, the river-mouth reach and the seasons. Records here carry no month, and GEBCO depth is too coarse to fit a range. The 4.7 nudge near records stays as a local term for spots the four maps don't explain. Boat species (mahi, wahoo, kingfish, tuna, sailfish) are not scored: they have 0 to 3 records here, and offshore habitat needs SST and chlorophyll fronts (PLAN 2.4, 2.12). Adding a component is a new `g_j` in `habitat.ts` with a prior weight; the fit takes it as it is.

## Boat mode (PLAN 4.6)

The BOAT tab opens a drawer (a sheet on phones, see `src/sheets.ts`). It works with no signal: GPS needs none, and everything is stored on the device (`localStorage`, key `ft.boat.v1`).

- **REC TRACK / STOP** records the GPS track. A fix is kept when the boat has moved 15 m or 20 s have passed, and fixes worse than 50 m accuracy are dropped. The screen is asked to stay on while recording (a web page cannot keep recording once the phone locks). A recording resumes after a reload.
- **MARK** drops a waypoint at the last GPS fix; **CATCH** does the same with a species (mahi, wahoo, kingfish, tuna, sailfish, other). Each pin stores the GEBCO depth there (a guide, not a sounding). The last five pins are listed: tap one to fly to it, ✕ to remove it.
- **EXPORT GPX** downloads the track and pins for a chartplotter or phone app. **CLEAR** needs two taps.
- The track, pins and boat position are drawn by the `bt-` map layers, switched with the FISHING toggle.

Not in yet: offshore fronts and FAD positions (no open data source found; fronts need the satellite SST from PLAN 2.12), and species scoring for offshore water (needs SST and chlorophyll, PLAN 2.4).

## Species records and fishing pressure (PLAN 4.7)

**OBIS and GBIF** (`npm run data:occurrences`, output `public/data/fishing/occurrences.json`, rebuilt by hand now and then): occurrence records for the shore, kayak and boat species in a box 0.5° around the region, merged when species, position and year match. Records here are sparse (tens per species: about 12 tarpon, 79 snook, 250 snapper, 2 mahi, none for wahoo, tuna or sailfish) and show where people looked, not where the fish are. So they are a nudge only: each record within ~2 km adds up to 10% to that species' score there, capped at +30%, and a cell the habitat model scored zero stays zero (`src/fishing/occurrences.ts`). The nudge applies to the shore and kayak species the layer scores today; the same records fit the habitat weights (PLAN 4.4, above). The boat species' records are stored for an offshore model.

**Verify checks** (`src/fishing/checks.ts`): OBIS and GBIF reachable, record file fresh (a 90-day cadence), schema, and records inside the box with believable years. They are exported for the daily Action (PLAN 2.8) and SYSTEM CHECK (2.9) to pick up.

**Global Fishing Watch is not in yet.** Its API needs a free token. To add it, register at globalfishingwatch.org/our-apis, put the token in the repo secrets as `GFW_TOKEN`, and a data build can fetch vessel effort for the offshore boat layer. Until then boat mode has no fishing-pressure layer.

## Reading the map and the BITE score (PLAN 4.8)

**Heat.** Amber only: nothing is drawn below fair (0.3), faint amber for fair water and a firmer fill for the best. **REACH** highlights SHORE (within 400 m of the beach: cast, wade, short paddle), BOAT (beyond 400 m) or ALL. **BEST SPOTS** lists up to five separated cells (>= 600 m apart) within 15 km of the reticle with plain reasons (river mouth, reef, drop-off); tap one to fly there.

**BITE** (`src/fishing/bite.ts`) says how good the timing is at the reticle for the slider time:

`timing = 0.40 tide + 0.35 light + 0.15 solunar + 0.10 calm`, `bite = timing x weather x safety x water x (0.4 + 0.6 x habitat)`

- tide: current flow relative to the fastest within 13 h either side (floor 0.3 at slack). Fish feed on moving water.
- light: sun -6 to +6 degrees (dawn, dusk) 1.0; to 20 degrees 0.8; night 0.65; midday 0.45. In daylight, cloud above 40% lifts it toward 1 by up to 0.4 of the gap (full at 90% cloud): overcast stretches the low-light bite.
- solunar: major window 1.0, minor 0.8, else 0.5, tilted by the day rating. Folklore, so the smallest weight.
- calm and weather: wind above 5 m/s and waves above 1 m pull both down; rain takes up to 0.2 more, starting at 2 mm/h and in full from 10 mm/h (mean of the three weather models).
- safety: lightning within 25 km in the last 15 minutes (only for the hour around now) x 0.1; squall HIGH x 0.25, squall WATCH x 0.7 (`src/weather.ts` squallLevel).

All weights are hand-written rules of thumb, not checked against catches. BEST TIMES is the same score across the day in 10-minute steps, with each hour's forecast wind, waves, rain, cloud and squall risk, and the three best runs listed. The WATCH tracker's BITE metric uses the same weather. The feature x input table is in `docs/SYNC.md` (PLAN 7.11).

**Water** (`src/fishing/water.ts`, per species in `species.ts`): does the water suit the target fish?

- visibility from the CLARITY forecast, fit to the species' range with a floor of 0.3 outside it. Snook (0.5 to 2.5 m) and tarpon (0.5 to 3 m) hunt stained river-mouth water; jack 1 to 6 m; snapper (3 to 15 m) and barracuda (4 to 20 m) want it clear.
- sea temperature from the satellite map, floor 0.5: best 24 to 30 °C (tarpon 26 to 30, snapper 24 to 29). This coast sits at 27 to 30 °C most of the year, so it rarely moves the score inshore.
- chlorophyll as a bait sign: 0.7 in clear blue water (0.1 mg/m³ or less), 1 from 0.3 to 3, easing to 0.85 by 10.
- `water = 0.6 vis + 0.2 temp + 0.2 chl` over the terms that are known; `factor = (0.6 + 0.4 x water) x sargassum`, where sargassum is 0.85 MODERATE and 0.6 HIGH at the nearest beach within 8 km. Unknown water counts as 1.

The water is read once at the slider time and holds for the BEST TIMES day (it changes over days, not hours). **BEST SPOTS** takes the 15 best habitat cells near the reticle and re-ranks them by habitat x water there, so the list can change from day to day; the reasons add the water's (TOO MURKY, TOO CLEAR, WATER TEMP OFF, SARGASSUM). The amber heat stays habitat only (structure and season). The WATCH tracker's BITE metric has no species, so it has no water term.
