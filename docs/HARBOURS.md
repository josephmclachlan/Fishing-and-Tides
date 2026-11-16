# Harbours, piers and anchorages (PLAN 6.7)

Catalog: `src/data/harbours.ts` (Puerto Limón, an approximate Limón anchorage, Moín boat terminal, Portete pier). Positions come from OpenStreetMap objects; each entry lists sources and is tagged `check` when not confirmed twice. The anchorage position is an approximate area from a cruiser's account.

**Shelter** is computed, not looked up: `src/physics/fetch.ts` marches upwind from the reticle over the land mask and returns the open-water fetch. Under 2 km is SHELTERED, under 10 km PARTLY EXPOSED, else EXPOSED. It uses the current wind-from direction in the HUD and ignores swell refraction and harbour walls.

**World Port Index (PLAN 7.94):** the harbour INFO card adds NGA World Port Index facts (harbour size and type, shelter, channel depth, largest vessel, tidal range, pilotage) for the nearest WPI port within 8 km, and a link to NGA Sailing Directions. The WPI feed is `wpi`, built weekly.

**Gaps:** SINAC was unreachable (HTTP 503) when built, and NGA's service also returned 503 from the dev sandbox, so the WPI parser matches field names loosely and is tested on a fixture; the first live Actions build needs checking. No depths or holding data. Not a chart; not for navigation.
