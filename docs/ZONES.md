# Protected zones (PLAN 4.3)

Outlines of the two protected areas on the coast, drawn by the PROTECTED layer and read out in the ZONE row of the side panel.

| Zone | OSM relation | SINAC ref | IUCN | Drawn as |
|---|---|---|---|---|
| Cahuita National Park (land and marine) | 12582073 | P16 | II | red, NO FISHING |
| Gandoca-Manzanillo National Wildlife Refuge (land and marine) | 11805965 | V03 | IV | amber, RESTRICTED |

**Source.** OpenStreetMap boundary relations, which carry SINAC's 2019 boundaries (ODbL, same licence terms as the reef names). Not WDPA: its terms bar redistribution. Rebuild with `npm run data:zones` (writes `public/data/zones/zones.geojson`, precached for offline use).

**What the labels mean.** NO FISHING = a national park: no fishing in the park, marine part included. RESTRICTED = a wildlife refuge, where fishing is regulated and needs local permission. These two words are a summary written from general knowledge of the Costa Rican system, not quoted from a regulation. We state what we understand the rules to be; check with SINAC or INCOPESCA locally before relying on it.

**Not yet here (PLAN 6.8):** the rules card per zone, spearfishing rules, closed seasons, and the other reserves (Hitoy Cerere, Limoncito wetland, San San Pond Sak), which are inland or beyond the region.
