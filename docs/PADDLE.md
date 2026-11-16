# PADDLE (kayak, stand-up paddleboard and other human-powered boats)

Joseph, 2026-11-16: one new activity for everything you move with your own arms on the water. Two craft in the first version, KAYAK and PADDLEBOARD (SUP); a canoe or outrigger reads as a kayak. Code: `src/physics/paddle.ts` (score, pure, tested), `paddleAt` in `src/metrics/registry.ts`, craft choice in `src/paddle-craft.ts`.

## What decides a paddler's day

A paddler has no engine to get out of trouble, so the model is led by what takes you somewhere you did not choose.

| Rank | Metric | Why | Feed |
|---|---|---|---|
| 1 | Wind from the land out to sea (offshore part of the wind, at the beach's seaward normal) | 48% of UK RNLI launches to paddleboarders in 2023 were people blown or swept out by offshore wind and tide¹. The BOAT verdict already uses 6 and 12 kt for a kayak off the beach, so the numbers agree | fitted wind + spot `facing` |
| 2 | Effective wind (mean plus half the gust above it) | Beginner guides put the comfortable limit at force 3, about 10 kt, and force 4 (11 to 16 kt) is too much for most learners² | wind, gusts |
| 3 | Offshore wave height and period | Steep short waves stop a board and tip a kayak | wave model |
| 4 | Surf and rip at the launch beach | Falling in at the beach is the commonest way to lose a board, and a rip takes a swimmer | spot model, `shoreAt` |
| 5 | Current against paddling speed (about 3 kt kayak, 2.5 kt board) | Over 80% of your speed and you cannot make way home | currents feed |
| 6 | Lightning, squalls | Open water, you are the tallest thing | GLM, weather models |
| 7 | Heat, UV, rain, daylight, sargassum | Hard exercise with no shade; the weed catches the blade | weather, CAMS, sargassum |

The score is 0 to 100 as SWIM (safety caps, comfort factors, formulas in the header of `physics/paddle.ts`). The page also gives a range: how far from the launch to go (5 km kayak, 3 km board in good conditions, none under 40).

Craft numbers (`CRAFT`): kayak easy wind 10 kt, hard 18, cap 24; offshore penalty from 6 kt, cap from 12. Board: 6, 13, 18; offshore 4 and 8. These are starting values from the guides and the rescue statistics, not measurements. **Joseph to check locally**, like the other guessed limits.

## Gaps in the feeds

1. **Nearshore current and tide inflow at river mouths and creeks.** The ocean current feed is about 8 km, so it says nothing about the flow at a creek mouth where paddlers launch. The river-outflow flag (`outflowAt`) covers floods only. A paddler's real hazard near Puerto Viejo is the creek and the rip, which the rip metric already reads.
2. **Wind inside the first kilometre.** The sea breeze and land breeze turn within hours and the fitted wind is a 9 to 13 km model. We use the spot wind (`spot-wind`), but there is no measurement on this coast to check it.
3. **Fetch from the actual coastline.** The score uses the beach's seaward direction (`facing`) to split the wind into offshore and along-shore. A true fetch (physics/fetch.ts, needs the land mask) would also catch the lee of Punta Cahuita and Punta Uva. Planned as a follow-up.
4. **Launch and landing facts.** No list of which beaches have a gentle launch, a lee, a creek to paddle up, or a reef flat that dries at low tide. A paddle-spot catalogue (launches, landings, shelter, hazards) is the next data task and needs Joseph's local knowledge.
5. **Crocodiles and caimans in creeks and canals.** No data. A warning, not a score.
6. **Boat traffic and fishing nets** near Limón and Manzanillo (AIS shows large ships only).
7. **Water temperature and cold shock are irrelevant** here (26 to 29 °C), so they are left out.

## Fishing from a kayak

Decision for the FISH tab is in `docs/FISHING.md` (PLAN task for the FISH kayak option).

## Sources

1. RNLI, Paddle UK and HM Coastguard, safety advice after the rise in paddleboard rescues, 2024: https://rnli.org/news-and-media/2024/august/13/rnli-paddle-uk-and-hmcg-give-safety-advice-after-triple-increase-in-sup-rescues
2. Sea kayaking wind guidance (Beaufort scale for kayakers): https://kayarchy.co.uk/html/03thesea/003wind.htm
