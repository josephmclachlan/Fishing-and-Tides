# Harbours, piers and anchorages (PLAN 6.7)

Catalog: `src/data/harbours.ts` (Puerto Limón, an approximate Limón anchorage, Moín boat terminal, Portete pier). Positions come from OpenStreetMap objects; each entry lists sources and is tagged `check` when not confirmed twice. The anchorage position is an approximate area from a cruiser's account.

**Shelter** is computed, not looked up: `src/physics/fetch.ts` marches upwind from the reticle over the land mask and returns the open-water fetch. Under 2 km is SHELTERED, under 10 km PARTLY EXPOSED, else EXPOSED. It uses the current wind-from direction in the HUD and ignores swell refraction and harbour walls.

**Gaps:** NGA World Port Index and SINAC were unreachable (HTTP 503) when built, so they are not used. No depths or holding data. Not a chart; not for navigation.
