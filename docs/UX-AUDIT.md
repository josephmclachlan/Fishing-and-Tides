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
| WAVES/SWELL | ok | yes | yes | no (readouts yes) | ? | tap a crest line for height and period |
| CURRENTS | ok | yes | yes (no swatches) | no | ? | colour or speed key for streaks |
| WIND | ok | yes | yes (no swatches) | no | ? | colour or speed key for streaks |
| WATER TEMP | ok | yes | yes | no (SST readout yes) | ? | label the isotherms in the legend with the current range |
| CLARITY | ok | yes | yes | no (VIS readout yes) | ? | rename VIS to VISIBILITY in readouts |
| SARGASSUM | ok | yes | yes | yes (dots, beach labels, SARG readout) | CLOUD text | on-map legend when the layer is first switched on |
| WEATHER | ok | yes | yes | no | ? | storms are usually off the map: say "none active" |
| LIGHTNING | ok | yes | yes | no | ? | say "no strikes" when empty |
| LIVE OBS | ok | yes | yes | drawer rows | lamps | n/a |
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
- [ ] Short codes in readouts: SARG, VIS, SST, RIP, BITE, DATA AGE, TIER, FCST, VALID
- [ ] Time slider: bands FORECAST / LOW CONF / OUTLOOK, what NOW and VALID mean
- [ ] Tide chart (PRED vs GAUGE)
- [ ] SPOT page, FISHING panel (BEST SPOTS, BITE, BEST TIMES), DIVE panel, SURF zone panel
- [ ] BOAT drawer, WATCH tracker (popup, region, metrics)
- [ ] LIVE OBS and SYSTEM CHECK drawers
- [ ] SETTINGS, ENHANCE, SUN mode, language toggle
- [ ] Alert strip (storm, lightning, closed zone) wording
- [ ] First-run: what a new user sees before touching anything (a short intro or a "what is this app" card)

## Rules for new layers and panels
Added to the definition of done: a plain title, a legend entry in `src/layers/legend.ts` (the test fails without one, in EN and ESP), a tap-to-explain card for anything drawn on the map that is not self-evident, and an empty state that says why.
