# UX audit: can a first-time user tell what they are looking at? (PLAN 7.12)

Rolling checklist. A system passes when a first-time user, with no help, can answer "what is this?", "what do the colours and marks mean?" and "why is it empty?". Mark a cell only from what the code or the screen shows; `?` means not looked at yet.

Criteria
- **TITLE**: plain-language name that says what it is, not a code (`SARG`, `VIS`).
- **WHAT**: a one-line "what am I looking at" a user can reach on screen.
- **LEGEND**: colours, shapes and marks explained next to the thing.
- **TAP**: tapping the label or the map mark opens an explainer card (`src/explain.ts`, EN and ESP).
- **EMPTY**: when there is nothing (no data, cloud, calm), the screen says why instead of going blank.

## Map layers (the LAYERS drawer)
After PR for 7.12 part 1 every layer has WHAT and LEGEND under the ? beside its toggle (`src/layers/legend.ts`).

| Layer | TITLE | WHAT | LEGEND | TAP on map | EMPTY | Next step |
|---|---|---|---|---|---|---|
| WAVES/SWELL | ok | yes | yes | yes (crest line, height in title) | ? | n/a |
| CURRENTS | ok | yes | yes | no | ? | n/a |
| WIND | ok | yes | yes | no | ? | n/a |
| WATER TEMP | ok | yes | yes | no (SST readout yes) | ? | label the isotherms in the legend with the current range |
| CLARITY | ok | yes | yes | no (VIS readout yes) | ? | rename VIS to VISIBILITY in readouts |
| SARGASSUM | ok | yes | yes | yes (dots, beach labels, SARG readout) | CLOUD text | on-map legend when the layer is first switched on |
| WEATHER | ok | yes | yes | yes (storm mark) | ? | storms are usually off the map: say "none active" |
| LIGHTNING | ok | yes | yes | yes (fresh vs old flash) | ? | say "no strikes" when empty |
| LIVE OBS | ok | yes | yes | yes (dot and label) | lamps | n/a |
| RIP RISK | ok | yes | yes | yes | "nothing drawn: low" | n/a |
| SURF BREAKS | ok | yes | yes | spot page | ? | n/a |
| DEPTH | ok | yes | yes | no (depth readout yes) | n/a | n/a |
| REEFS | ok | yes | yes | no | n/a | tap a reef zone for its name and what it is |
| SEAMARKS | ok | yes | yes | no | n/a | tap a mark for its type |
| FISHING | ok | yes | yes | no (readouts yes) | ? | n/a |
| PROTECTED | ok | yes | yes | rules card | n/a | n/a |
| ANCHORAGES | ok | yes | yes | no | n/a | tap for shelter and range |

## Panels and readouts (to review)
Not looked at yet beyond what earlier PRs did (tap-to-explain on most CONDITIONS rows). Review each against the five criteria and tick it off here.

- [ ] Top bar and tabs (LAYERS, FIND, COND, SPOT, BOAT, WATCH, SET): tab names and what each opens
- [ ] CONDITIONS core and groups (WAVES, WATER, WEATHER, FISHING, PLACE), glance strip
- [x] Readouts without a tap-to-explain card found by scanning every panel and now covered: DIVE and SNORKEL rows (mode, water over reef, outing, best time and day, week, spot, rating, stingers), GUSTS, CAPE, SQUALL, LIGHTNING, VIS +DAYS. Still without one: BOAT rows (distance, speed, time, pins, GPS), UTC clock, ZOOM, last-sync time
- [ ] Time slider: bands FORECAST / LOW CONF / OUTLOOK, what NOW and VALID mean
- [ ] Tide chart (PRED vs GAUGE)
- [ ] SPOT page, FISHING panel (BEST SPOTS, BITE, BEST TIMES), DIVE panel, SURF zone panel
- [ ] BOAT drawer, WATCH tracker (popup, region, metrics)
- [ ] LIVE OBS and SYSTEM CHECK drawers
- [ ] SETTINGS, ENHANCE, SUN mode, language toggle
- [ ] Alert strip (storm, lightning, closed zone) wording
- [x] First-run: a short "what is this and how do I read it" card on first open, and again from ABOUT (`src/intro.ts`)

## Rules for new layers and panels
Added to the definition of done: a plain title, a legend entry in `src/layers/legend.ts` (the test fails without one, in EN and ESP), a tap-to-explain card for anything drawn on the map that is not self-evident, and an empty state that says why.

- Tap bare map: "what's here" card (swell, sea, wind, depth, visibility at the point, `src/here-card.ts`). Where a mark is under the tap its own card wins instead.

## Clarity review 2026-11-04 (desktop, phone, half-width window)

Findings CL1 to CL23 are in the audit doc; fixes ship one PR each.

- [x] CL1 Half-width window: the drawer layout now takes over below 1100 px wide or 700 px tall (`PHONE_QUERY` in `src/sheets.ts` and the matching queries in `style.css`), so a 1000 px window or a short laptop screen gets the full map instead of a 40% strip.
- [x] CL2 Map credits: MapLibre reopens the compact credits when the first source adds its credits, after the map's 'load', so they covered a third of a phone's map. They now stay folded to the (i) button until the user taps it (`src/map.ts`).
- [x] CL3 False rip alarm: the rip row, the HIGH RIP banner and the rip zones on the map wait for the spot model to run on the real sea; before that the row reads -- with no alarm. CL4: the CONDITIONS tag reads LIVE once the waves feed is in, MOCK only before it.
- [x] CL6 to CL10 Phone glance strip: SET is FLOWS TO (it sat beside the SET tab), SURGE 6M is SURGE AT 6M (read as SM), the current reads -- on land instead of LAND, the verdict's top reason shows in a line under the strip, and BEST TODAY says NONE LEFT TODAY after the day's last window and NO DATA YET before it.
- [x] CL11, CL12 DATA AGE names the oldest feed (23H00 · CORAL HEAT STRESS), and SYSTEM CHECK now has names for every feed. The SET drawer shows what each setting does under its name (it was a tooltip, which a phone never shows).
- [x] CL5 Default view: the first open (nothing saved) leaves the wind particles off, so wave crests and current streaks no longer cross a third, same-coloured streak field; and while two or more moving layers are on, a one-line key under the top bar names them (WAVE CRESTS, WIND, CURRENT) and opens LAYERS when tapped (`src/layers/motion-key.ts`).
- [x] CL13, CL14 CONDITIONS wording: COMFORT 89/100 (was 089), steepness in words (GENTLE, MODERATE, SHORT AND STEEP; was STEEP 0.009), MOSTLY SWELL / MOSTLY WIND CHOP (was SWELL LEADS), WATER TOO CLEAR: FISH SHY (was TOO CLEAR), LIVE OBS ages in words (60 H AGO, 9 DAYS AGO; was 59H40, 09D00H). The sea detail, CURRENT and verdict-reason rows wrap instead of being cut off.
- [x] CL15 to CL17 Empty layers: with six or fewer layers on, a line under the top bar names layers that need a closer zoom (ZOOM IN FOR SURF BREAKS) and layers with nothing in view (NOTHING IN VIEW: LIGHTNING), from what the map actually drew; the sargassum hatch is explained when no mats are in view, and an even sea temperature gives its value (`src/layers/layer-notes.ts`). Limit: fishing cells below fair are drawn fully transparent, so they still count as drawn.
- [x] CL18, CL19 Close zoom: the CLARITY wash fades to about half from zoom 11 to 13, so a murky (red) cell no longer hides the beach and reef, and the 0.06° FISHING cells fade past spot zoom, where they read as blocks. CL20 was a misreading: the amber fill in the BOAT screenshot was the WATER TEMP layer left on by the test run, not BOAT.
