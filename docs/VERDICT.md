# Go / no-go verdicts (PLAN 7.8)

The top of CONDITIONS has one chip per activity: SURF, FISH, SNORKEL, DIVE and BOAT. Each reads GO, MARGINAL or NO-GO for the cross-hair at the slider's hour. The line under the chips gives the top reasons, for the activity picked or, under ALL, for the worst one. Tapping a chip picks that activity, so its groups open and the glance strip follows. SNORKEL and DIVE also switch the dive panel's mode. On a phone, the glance strip's mode button shows the verdict too; in DIVE mode it shows the one for the dive panel's mode. A trailing `?` means the forecast hour is in LOW CONF or OUTLOOK.

## One verdict per activity, not a second score

The verdict is an aggregator. Where an activity already has its own judgement, the chip reads it and does not redo it:

| Chip | Comes from | GO | MARGINAL | NO-GO |
|---|---|---|---|---|
| SNORKEL | outing score at 2 m (`physics/outing.ts`, PLAN 6.9/6.10) | score 70+ | 40 to 69 | under 40 |
| DIVE | outing score at 6 m (same) | 70+ | 40 to 69 | under 40 |
| SURF | quality band of the nearest break (`surf-quality.ts`) | GOOD, EPIC | FAIR | FLAT, POOR |
| BOAT | the boat verdict for the vessel chosen in SET (`boat/verdict.ts`, sailing audit) | as that row says | | |
| FISH | its own limits below, as nothing else judges it | | | |

The reasons for SNORKEL and DIVE are the outing score's own words (SURGE, MURKY, CHOP, TOO SHALLOW, LOW LIGHT, RAIN). The BOAT chip shows that row's reasons as written. It stays hidden until the boat verdict is in the app.

## Shared hazards

Weather hazards use the shared safety cap (`physics/safety.ts`), the same one the dive score and the BITE score use. That way every activity agrees on a storm:

| Hazard | Cap | Verdict |
|---|---|---|
| Lightning within 25 km in the last 15 min (only within 1 h of now) | 0.1 | NO-GO |
| Squall likely (CAPE with gusts or heavy rain) | 0.25 | NO-GO |
| Squall watch | 0.7 | MARGINAL |
| Tropical storm within 500 km | | NO-GO |
| Tropical storm 500 to 1500 km | | MARGINAL |

The outing score already has the cap built in, so SNORKEL and DIVE name the hazard rather than repeating STORM RISK.

## FISH limits

| Input | Source | Rule |
|---|---|---|
| Heavy rain in the next 3 h | weather models | MARGINAL |
| Wind, kt | wind forecast | over 14 MARGINAL, over 20 NO-GO |
| Seas Hs, m | wave forecast | over 1.3 MARGINAL, over 2 NO-GO |
| Sea-state comfort | `physics/sea-state.ts` | rough MARGINAL, uncomfortable NO-GO, comfortable is a plus |
| BITE, as the FISH panel shows it for the species picked | `fishing/bite.ts` | under 30 MARGINAL, 60+ is a plus |

SURF also turns MARGINAL for breakers over 3 m (experts only) and for HIGH rip risk at the nearest spot.

## How it is decided

The rules are in `src/verdict.ts` (pure, tested in `src/verdict.test.ts`), and the inputs are gathered in `main.ts`. Each rule gives nothing, a plus, MARGINAL or NO-GO. The verdict is the worst level any rule gives. Reasons are listed worst first, then the pluses, three at most. A missing input is skipped. When the input an activity hangs on is missing (no outing score yet for DIVE, for example), the chip reads `--` rather than a false GO.

The verdict's confidence comes from how far ahead it is. It is HIGH to day 3 and MED to day 7. In LOW CONF and OUTLOOK it is LOW, which adds the `?`. When the ensemble blend (PLAN 7.4) reports model spread, that spread can lower it further.

These are rules of thumb, written down so they can be argued with. **Advisory only, not for navigation or safety decisions.**

Not yet included: spearfishing rules per zone (the protected-zones card shows them), harbour entrance bars, and surface current for fishing.
