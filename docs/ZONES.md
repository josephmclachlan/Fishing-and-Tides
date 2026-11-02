# Protected zones and fishing rules (PLAN 4.3, 6.8)

Outlines of the protected areas on the coast, drawn by the PROTECTED layer. The ZONE row in the side panel names the area under the reticle, and its RULES button opens a card with the fishing and spearfishing rules, each linked to its source.

| Zone | OSM relation | SINAC ref | IUCN | Drawn as |
|---|---|---|---|---|
| Cahuita National Park (land and marine) | 12582073 | P16 | II | amber outline, RESTRICTED |
| Gandoca-Manzanillo National Wildlife Refuge (land and marine) | 11805965 | V03 | IV | amber outline, RESTRICTED |
| Limoncito Wildlife Refuge (Río Limoncito mouth, south of Limón) | 11808241 | | IV | amber outline, RESTRICTED |

**Boundaries.** OpenStreetMap boundary relations, which carry SINAC's 2019 boundaries (ODbL). Not WDPA: its terms bar redistribution. Rebuild with `npm run data:zones`. The outline status is only "rules apply here"; what the rules say is in `src/rules.ts`.

**Correction (2026-11-02).** The first version (PLAN 4.3) drew Cahuita as NO FISHING. That was written from general knowledge and could not be confirmed, so it is now RESTRICTED with the rules below.

## What the sources say (checked 2026-11-02)

Everywhere in Costa Rica (INCOPESCA, the fishing authority):
- Spearfishing is breath-hold only, no scuba or compressors (AJDIP/098-2017 art. 4); the one exception is INCOPESCA-approved lionfish tournaments in the Caribbean (AJDIP/194-2024).
- It needs an INCOPESCA permit and card, and you must be 18 or older (arts. 3, 7, 9).
- Maximum 5 fish per day for your own use, only above the size at first maturity, and closed seasons, closed areas, national parks and other protected areas must be respected (art. 9).
- Caribbean spiny lobster is closed 1 March to 30 June each year (INCOPESCA AJDIP/075-2012; a regional closure renewed yearly, so confirm the current year).

Cahuita National Park: the official park brochure says spear guns and trammel or cast nets are not allowed. For line fishing in the marine area the sources disagree (a SINAC document describes a ban; another source says hand line only). Marked CHECK; the park office is +506 2755-0302.

Gandoca-Manzanillo and Limoncito: no fishing or spearfishing rule found for the marine areas. Marked CHECK; ask SINAC or INCOPESCA.

**Not found:** any Caribbean closed season for snook, snapper or other fish (only the lobster closure turned up), and the full Gandoca-Manzanillo participatory management regulation. SINAC's site was unreachable from the build sandbox, so the Cahuita management plan could not be read directly.

**Not covered:** other reserves further from the coast (Hitoy Cerere, San San Pond Sak in Panama), commercial and artisanal licences, and size limits per species.

The card says it is advisory: we report what the sources say and link them; check locally before relying on it.
