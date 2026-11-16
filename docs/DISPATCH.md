# DISPATCH page: kill, bleed, ice (`#dispatch`)

A page for the people who catch the fish: how a fish dies decides how it tastes and how long it keeps. Code in `src/dispatch/` (`content.ts` EN/ES text and sources, `model.ts` the freshness model, `view.ts` markup, `page.ts` the page, `route.ts` the link). Linked from the species guide's CLEAN tab and the fishing panel. Research notes in the project files, `dispatch/research/`.

## The chart is an estimate
Freshness is the K-value (Saito 1959). Each way of handling a fish is a start K and a rate of rise, in `model.ts`:
- On ice (0 °C) K rises about 0.2 %/h, about 5 %/day (Tomioka and Endo 1984: 0.2 to 8.4 %/day at 0 °C across 14 species, abstract read on J-STAGE). The Kyoto flathead flounder report (7 % at 30 h, 30 % at 54 h with the spinal cord destroyed; 17 % and 37 % with the brainstem cut) was kept at 4 to 5 °C, so it is a fridge rate: read in full 2026-11-16.
- Spoilage is about e^(0.12 T) times as fast at T °C as at 0 °C (Dalgaard and Huss 1994, in Huss 1995). The warm rate (5 %/h) puts a bled fish in the shade at K 60 after 9 to 12 h, the 8 to 12 h edibility range worked out for 30 °C from a 10 to 14 day ice life.
- The start K of each method (5 to 35 %) is a judgement. No Costa Rican or tropical-species K data was found.
- Bands 20 / 40 / 60 % are from Japanese freshness guides (secondary).

The page marks every number with its source or EST. Trust the order of the bars, not the hours.

## Histamine
FDA Hazards and Controls Guidance 2022, ch. 7: chill to 4.4 °C within 6 h of death if air or water is above 28.3 °C, 9 h otherwise, 12 h if gilled and gutted first. Mahi 600 ppm after 12 h at 25 °C (Lin 2016). The "1 to 2 h" rule of thumb is not in any source; the page says 6 h.

## To check with a local fisherman
Spike spot and bleed times per species; ice price and availability in Limón, Cahuita and Puerto Viejo; how fish are handled here (no survey found); any SENASA or INCOPESCA rule on ice or histamine aboard small boats (Decreto 18696-MAG-S not read); spear-caught fish, lobster and octopus (no source).
