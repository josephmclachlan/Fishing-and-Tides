# Species guide (`#guide`, PLAN 7.91 and 7.92)

Every animal and plant a person can meet snorkelling, diving, fishing or walking the shore from Gandoca to Limón,
on a page of its own. Opened from the forecast header (fish button), a map spot card (SPECIES) or the link
`#guide[/<view>[/<species>[/<tab>]]]` (src/guide/route.ts).

## What is in it

- **Scope (Joseph, 2026-11-15):** all marine life, plus shoreline plants and animals and mixed sea-land species
  (sea grape, coconut, manchineel, beach morning glory, mangroves, seagrass, land, ghost and hermit crabs, nesting
  turtles, crocodiles). Birds only when aquatic (seabirds, shorebirds, herons, kingfishers, osprey). Land animals that
  only visit the beach (monkeys, sloths, iguanas) stay out.
- **Tiers:** `full` profiles for anything a person can see, catch or touch (shore to about 40 m diving, about 300 m on
  a deep hand line); `list` one-liners ("also recorded") for tiny (under about 5 mm), deep-sea or museum-only records,
  shown with the records switch or a search; `drop` files (Pacific, fossil, freshwater only, synonyms) are researched
  but left out, each with its reason.
- **Views:** All, Identify, Edible (with the eating risks), Danger (venomous, stinging and biting animals worst
  first, then what is poisonous or risky to eat, with the emergency numbers) and Saved (stars kept on the phone in
  `ft.gdFav`). Twelve groups, search over every name, filters, sorting and sections by kind, family, genus or order.
- **A species:** photos (or a drawing of its kind), Latin, English, Spanish and local names, key numbers, and tabs:
  About, ID, Life, Catch, Clean (a drawn cleaning diagram with numbered steps, src/guide/clean.ts), Safety, Sources.
- **Identify (7.92):** animal or plant, group, kind (only where a group has a few, such as shark or ray), size,
  colours and markings, where it was (seabed, reef, hole, open water, surface, fixed, shore) and night. Group and kind
  are hard limits; the rest only scores, so a near miss drops down the list instead of vanishing (src/guide/identify.ts).

## Where the data comes from

Researched one species at a time in November 2026. The most cited sources are FishBase, WoRMS, SeaLifeBase, the
Organization for Tropical Studies' Cahuita and Gandoca-Manzanillo species lists, GBIF, iNaturalist (research grade),
OBIS, the University of Costa Rica's journals (Revista de Biología Tropical and others on SciELO), INCOPESCA rules,
the Smithsonian's Shorefishes of the Greater Caribbean, IUCN, FAO and papers on the coast's reefs and fisheries. Every species lists its
sources and its evidence of being on this coast. Anything not confirmed for this coast carries **CHECK**.

The research lives outside the repository in the project's shared folder (`species-guide/research/out/<id>.json`, one
file per species; `research/look/<id>.json` for the identify looks; `photos/` for the photos). `npm run data:guide --
<folder>` (scripts/guide-index.ts) builds `public/data/guide/`: `index.json` (one row per species for the list,
filters, search and identify), `sp/<id>.json` (one species, fetched when opened) and `img/<id>.webp` (240 x 180 list
thumbnails). A species with no researched look gets a rough one guessed from its ID text, marked `guessed` and given
less weight.

The service worker precaches only the index; species files, thumbnails and photos are kept as they are opened.

## Photos

Only openly licensed photos: CC0, CC BY and CC BY-SA from iNaturalist (research grade) and Wikimedia Commons, each
credited with its author, licence and a link to its page on the species and in its Sources tab. No ND licence ever.
Where there is no licensed photo, a drawing of its kind (src/guide/art.ts).

## Emergency numbers (checked 2026-11-15)

- 911: ambulance (Red Cross), coast guard, police.
- Poison centre (Centro Nacional de Control de Intoxicaciones), free, 24 hours: 800-4686-9422 (800-INTOXICA).
  Sources: Teletica, Observador, Delfino and La Nación reporting on the centre. No CCSS page found: CHECK.
- Hospital Dr. Tony Facio Castro in Limón is the region's hospital. Talamanca health area (CCSS) seat at Hone Creek,
  4003-8250 (Ministerio de Salud, ASIS Talamanca 2023). A 24-hour emergency service at Hone Creek is not confirmed.

## Safety text

Touch danger runs 1 (painful) to 3 (can kill). A species that is poisonous to eat carries the level of eating it, so
the danger list ranks its spines or sap separately (`touchLevel` in src/guide/filter.ts): a porcupinefish is painful
to touch and can kill when eaten. First aid follows current guidance: hot water (up to 45 °C, tested on unhurt skin)
for venomous spines and most stings, vinegar for box jellies and fire coral, seawater and no vinegar for the
Portuguese man o' war, firm pressure and a tourniquet only when pressure fails for heavy bleeding, and no cutting,
sucking, urine or alcohol. Fishing rules quoted from INCOPESCA and SINAC that could not be read in full are marked
CHECK.

## Emergency food (Joseph 2026-11-16)

The guide doubles as a survival guide, so how to catch, clean and cook a species is kept even when taking it is banned
or it is not normally eaten. The edible list still shows only legal food. A species with food notes beyond its rules
gets the Catch and Clean tabs anyway: a red "Illegal to take in Costa Rica: emergency use only" banner when the
research sets `eat.illegal` or the species is protected, and an amber "Not normally eaten" banner when it is marked
not edible or toxic (`emergencyHtml` in src/guide/render.ts).
