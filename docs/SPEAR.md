# SPEAR

Breath-hold spearfishing of edible reef fish, as its own mode beside SNORKEL and DIVE (PLAN 7.76). Advisory only.

## Why it is a variant, not a new category
Most of what makes a good snorkel or dive hour also makes a good spearing hour (surge, visibility, chop, current, entry surf, rip, light, sea temperature, runoff, weather safety), so SPEAR reuses the dive score's terms with its own bands instead of a second model. What changes is the bands, one new term and a legal gate.

## Bands (`src/physics/outing.ts`, `BANDS.spear`)
These are our guidance from forum and dive-shop sources, not a standard, and are marked as such in the code.

| Term | Dive trip | Spear | Why |
|---|---|---|---|
| surge | 1 below 0.10 m/s, 0 at 0.60 | 0 at 0.40 | You hold still, aim and recover |
| visibility | 0 at 1 m, 1 at 10 m | 0 at 2 m, 1 at 6 m | A shot is 3 to 5 m; very clear water also spooks fish (per-species bands are in `fishing/species.ts`) |
| chop | 0 at 10 m/s wind | 0 at 9 m/s | You surface tired and watch your float and buddy |
| water over the bed | 0 below 0.5 m, 1 from 1.5 m | 0 below 1.5 m, 1 from 4 m | You cannot dive a puddle |
| too deep (new) | none | 1 up to 15 m, 0 at 25 m | Shallow-water blackout risk climbs with depth and effort |
| current | 1 up to 0.15 m/s, 0 at 0.60 | 0 at 0.40 | You carry a gun and a float and drift off your mark |

Tide stage and moon as a feeding trigger are not in the spear score: the sources disagree and no study backs them (forum anecdote only). They stay in BITE.

## The law (`src/rules.ts`, `spearStatus`)
From INCOPESCA AJDIP/098-2017 (read in full) and AJDIP/194-2024 (scuba exception for approved Caribbean lionfish tournaments):
- Breath-hold only. No scuba tanks or compressors (art. 4).
- An INCOPESCA permit and card, and a signed waiver of the risks (art. 3, 6, 9). 18 or older (art. 7).
- At most 5 fish a day for your own use, above the size at first maturity (art. 9).
- Not in closed seasons or zones, national parks or other protected areas (art. 9). Cahuita also bans spear guns outright (park brochure).

The map and score read it per zone: a national park (IUCN II) or closed water is BANNED (SPEAR score 0, red on the map); Gandoca-Manzanillo and Limoncito have no marine rule we could find and are CHECK (no circled zone, dashed amber; ask SINAC, +506 2755-0302 for Cahuita's office); everywhere else is OK for a permit holder.

## Targets (`src/fishing/spear.ts`)
Grouper (small reef groupers), snapper, jack and lionfish: edible reef fish a spearfisher takes here, lionfish being a cull the authorities encourage. Barracuda is left out (ciguatera), mackerel (open-water schooler) and snook (a river-mouth line fish). A cell's spear score is its best target's habitat score times a depth window (0 below 1.5 m, 1 from 3 to 15 m, 0 at 22 m).

## Safety
Shallow-water blackout is the main danger of breath-hold diving: it usually comes with little warning near the surface, and the standard safeguard is a buddy watching (one up, one down). Ciguatera is not destroyed by cooking and varies fish to fish; large reef fish are the risk.

## Still to check locally
Whether AJDIP/194-2024 is in force as we read it; the marine rules of Gandoca-Manzanillo and Limoncito; the speared depth range and the surge and current limits above (guesses).
