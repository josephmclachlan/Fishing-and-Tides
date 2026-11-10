# Wave physics

How the app takes an offshore forecast (Hs, Tp, direction) to the beach (PLAN 3.2 to 3.5). All of it lives in `src/physics/`, pure TypeScript with SI units and tests; tides are in `docs/TIDES.md`.

## 3.2 Dispersion and shoaling (`waves.ts`)

Linear wave theory. `wavenumber(T, h)` solves ω² = g k tanh(kh) (Fenton and McKee start, Newton polish, machine precision). From k come wavelength, phase speed c, group speed Cg = n·c, and the shoaling coefficient Ks = √(Cg0/Cg), which dips to 0.913 at kh ≈ 1.2 and then grows toward the beach. `bottomOrbitalVelocity` gives the bed velocity for the dive surge band (6.2). Checked against the Coastal Engineering Manual tables.

## 3.3 Refraction (`refraction.ts`)

Rays bend toward slower (shallower) water. `traceRay` integrates the ray equations (RK4) over the GEBCO depth grid, with the OSM land mask marking the beach and the 1′ Caribbean grid beyond the region.

`refractAt(point, T, offshore)` gives the wave height factor K = H/H0 at a point by **backward spectral ray tracing** (Longuet-Higgins 1957, O'Reilly and Guza 1991): a fan of rays (every 0.5°) leaves the point toward the sea, each ray that reaches deep water picks up the offshore directional spectrum at its arrival direction, and S·c·Cg is conserved along every ray. This handles headlands, reef shelter and focusing without the ray-spacing blow-ups that a coarse grid causes. Over straight contours it equals Ks·√(cos θ0 / cos θ) (tested). The result also gives the local arrival direction, and Kr = K/Ks, the factor that turns H0 into the "refracted deep-water height" that breaker formulas (3.4) want.

`nearshorePoint(pin, 10 m)` finds where to read each spot: the nearest water at least 10 m deep off the shoreline pin. A spot costs about 70 to 300 ms, so 3.6 runs it in a Web Worker.

**Limits.** GEBCO here is about 460 m and satellite-derived near shore (`docs/SEAFLOOR.md`), so the rays see the shelf, the bays and the big headlands, not individual reef channels. Salsa Brava's reef focusing, for example, is too small for the grid; 6.3/6.4 add per-break knowledge on top. The offshore spread is a parameter (default about 15° for swell, 30° for wind sea) because Open-Meteo doesn't forecast it.

## 3.4 Breaking, energy and force (`breaking.ts`, `surf-zone.ts`)

- **Breaker height:** Komar and Gaughan, Hb = 0.39 g^⅕ (T H0′²)^⅖, with H0′ = Kr·H0 from 3.3.
- **Several trains:** the ray model breaks the leading train (the swell, else the wind sea) on its own height, period and direction. Each other train (second swell, wind sea) is broken on its own period with an estimated refraction factor √cos(angle off the shore normal), 0.3 beyond 80°, and the energies add: Hb,all = √(Σ Hb,i²). The rip and the dive entry read Hb,all; the surf score keeps the swell's own breaker, since its chop terms already score the wind sea. Running the total Hs through the swell period overstated the surf (audit G).
- **Scaling to another hour:** the dive entry scales the spot model's breaker to the hour's sea as (Hs/Hs0)^0.8, the height power in Komar and Gaughan, not linearly (audit L).
- **Breaking depth:** hb = Hb/γ, with Weggel's slope-dependent breaker index γ (0.78 when the slope is unknown).
- **Breaker type:** Iribarren number ξ0 = tan β / √(H0/L0) with Battjes' classes: spilling below 0.5, plunging to 3.3, surging above.
- **Energy and force:** E = ρgHs²/16, wave power P = E·Cg (kW per metre of beach, conserved to the break and spread by Kr²), crest speed √(g(hb + Hb)), impact pressure ½ρc² (kPa), and the Longuet-Higgins longshore current.
- `spotWaves(pin, sea)` ties it together for a shoreline pin: finds the 10 m read point and the shore normal, the mean slope from pin to read point (over at least half a grid cell, 230 m: the steepest the grid resolves), refraction, then the breaker.

Example on the real grid, 1.5 m offshore (`npm test` checks every spot stays plausible):

| Spot | Faces | Slope | 10 s from 045° | 14 s from 020° | 7 s from 080° |
|---|---|---|---|---|---|
| PLAYA NEGRA CAHUITA | 34° | 0.009 | 1.9 m spilling, Kr 0.87 | 1.9 m spilling, Kr 0.82 | 1.2 m spilling, Kr 0.55 |
| PUNTA CAHUITA | 9° | 0.023 | 2.0 m spilling, Kr 0.90 | 2.0 m spilling, Kr 0.87 | 1.8 m spilling, Kr 0.85 |
| PLAYA NEGRA | 42° | 0.043 † | 1.6 m plunging, Kr 0.67 | 2.0 m plunging, Kr 0.86 | 1.2 m spilling, Kr 0.53 |
| SALSA BRAVA | 333° | 0.056 † | 1.6 m plunging, Kr 0.68 | 1.6 m plunging, Kr 0.62 | 1.1 m plunging, Kr 0.48 |
| PLAYA COCLES | 47° | 0.044 † | 1.4 m plunging, Kr 0.57 | 1.5 m plunging, Kr 0.58 | 1.1 m spilling, Kr 0.50 |
| PLAYA CHIQUITA | 7° | 0.043 | 1.8 m spilling, Kr 0.81 | 2.6 m plunging, Kr 1.21 | 1.4 m spilling, Kr 0.62 |
| PUNTA UVA | 341° | 0.057 † | 1.9 m plunging, Kr 0.83 | 1.9 m plunging, Kr 0.78 | 0.8 m plunging, Kr 0.34 |
| PLAYA GRANDE | 14° | 0.034 | 2.0 m spilling, Kr 0.91 | 1.9 m plunging, Kr 0.82 | 1.5 m spilling, Kr 0.69 |
| MANZANILLO | 334° | 0.020 | 2.6 m spilling, Kr 1.25 | 3.1 m spilling, Kr 1.48 | 1.6 m spilling, Kr 0.73 |
| GANDOCA | 33° | 0.006 | 1.5 m spilling, Kr 0.62 | 1.3 m spilling, Kr 0.49 | 1.0 m spilling, Kr 0.45 |

† Slope floored at the grid's resolution (2026-11-10). The 15″ grid holds each cell's depth at its centre, so it cannot put the 10 m read-point depth closer to the shore than about half a cell. At Salsa Brava and Punta Uva the shore cell averages in the deep water beyond the reef, so the grid already has 13 to 14 m at the pin and depth over distance came out at 16.5, which read every breaker as SURGING. The slope is now measured over at least `MIN_SLOPE_RUN_M` = 230 m (half a cell), the steepest slope the grid can resolve: 0.056 and 0.057, plunging, as reef breaks should. Playa Negra and Playa Cocles, whose 10 m depth sat 150 to 190 m out (inside the same half cell), ease from 0.065 and 0.052 to 0.043 and 0.044. The real reefs are steeper still; only a survey would tell how much.

The pattern matches local knowledge in broad strokes (Punta Uva sheltered, the reef spots plunging, Limón and Playa Bonita open to the north-east), but the slope and shore normal come from a 460 m grid, so Salsa Brava's true reef shape and its size on big days are beyond it. Per-break orientation and type (6.3, 6.4) will override these where they're known.

### Waves over reef flats (PLAN 7.59, `reef-flat.ts`)

The 15″ grid can't see a reef flat a few hundred metres wide, so before 7.59 every reef-fronted beach read the full breaker outside: Punta Cahuita and Playa Chiquita looked as rough as open sand. The Allen Coral Atlas maps the flats at 5 m, so the spot model now uses it for what reaches the water's edge.

- **Height on the flat:** Ht = γf (dr + η + ηs), γf = 0.55, the largest height-to-depth ratio stable waves hold over a near-flat bed (Nelson 1994; Gourlay 1994 on reef tops). dr = 0.5 m flat depth below mean sea level (**assumed**: the Atlas maps where flats are, not how deep), η the Limón tide above mean sea level, ηs = 0.15 H0′ the wave setup on the flat (0.1 to 0.2 of the incident height on fringing reefs: Vetter et al. 2010, Becker et al. 2014). The reef is a low-pass filter on height (Lowe et al. 2005): nothing changes until the breaker outside is bigger than Ht.
- **Which beaches it covers:** a fan of lines every 2.5° within ±45° of the shore normal, out to 1.5 km. A line is covered when it crosses at least 150 m of unbroken REEF CREST, OUTER, INNER or TERRESTRIAL REEF FLAT (gaps up to 20 m bridged): about three wavelengths of a 10 s swell on a 2 m flat, and reef-flat width is the main control on what gets through (Quataert et al. 2015). Lines that run into a headland carry nothing and are left out. The share f is covered lines over open lines.
- **At the beach:** Hs = √((1 − f) Hb² + f · min(Hb, Ht)²), the energies of the open and covered parts of the approach. `SpotResult.shore` carries it for the main train and for all trains.
- **Who reads it:** the dive and snorkel entry (SURF AT ENTRY and the outing score's surf term, re-cut each hour at that hour's tide), AT THE BEACH in SURF ZONE, and the spot page. The surf score keeps the breaker outside, since that is where the waves are ridden. Rips keep it too: at a reef the water the breaking crest pumps over the flat drains out through the channels.
- **Why only wide flats:** the Atlas also draws 60 to 150 m strips of flat along sand beaches (Playa Cocles, Salsa Brava, Playa Chino, Manzanillo village), where foam and rubble in the surf zone can read as flat. Counting them put Cocles at 0.35 m in a 1.5 m swell. Leaving them out errs on the safe side: telling a swimmer the surf is smaller than it is is the dangerous mistake.

10 s from 040°, breaker outside → at the beach (the share covered in brackets), surf beat included:

| Spot | Breaker, 1.5 m | At the beach, mean tide | Low tide (−0.25 m) | High tide (+0.25 m) | 0.6 m swell | 3 m swell |
|---|---|---|---|---|---|---|
| PLAYA NEGRA CAHUITA | 1.98 | 1.98 (0) | 1.98 | 1.98 | 0.95 | 3.45 |
| PUNTA CAHUITA | 1.94 | 0.47 (1.0) | 0.36 | 0.59 | 0.34 | 0.73 |
| PLAYA NEGRA | 1.66 | 1.66 (0) | 1.66 | 1.66 | 0.80 | 2.88 |
| SALSA BRAVA | 1.90 | 1.88 (0.03) | 1.87 | 1.88 | 0.90 | 3.26 |
| PLAYA COCLES | 1.49 | 1.47 (0.03) | 1.47 | 1.47 | 0.71 | 2.56 |
| PLAYA CHIQUITA | 1.89 | 0.92 (0.81) | 0.88 | 0.97 | 0.50 | 1.56 |
| PUNTA UVA | 1.14 | 0.59 (0.81) | 0.54 | 0.66 | 0.36 | 0.97 |
| PLAYA GRANDE | 2.02 | 1.52 (0.46) | 1.51 | 1.54 | 0.75 | 2.64 |
| MANZANILLO | 2.59 | 2.34 (0.19) | 2.34 | 2.35 | 1.13 | 4.08 |
| GANDOCA | 1.50 | 1.50 (0) | 1.50 | 1.50 | 0.72 | 2.61 |

**Surf beat (PLAN 7.60).** On big days the swell breaking on the reef slope makes long surges, 25 s to minutes, that the flat's depth doesn't hold back. Masselink et al. (2019) find them averaging 20 to 30% of the incident height across a reef platform when its water depth is −0.25 to 0.75 of that height, which a 0.5 m flat is in any swell over 0.7 m. The model adds Hig = 0.2 H0′ (the low end) to what gets through, energies added: Hf = √(Ht² + Hig²). Without it a 3 m day behind Punta Cahuita read 0.55 m, hardly more than a 0.6 m day; with it, 0.73 m against 0.34 m. Joseph (2026-11-10): reef flats outside the sheltered pools are still rougher on rough days.

Within a beach the share moves with the pin: along Playa Chiquita it runs 0.8 to 1.0 (0.4 to 0.9 m at the beach), with the east end consistently the calmest (about 0.5 m). Playa Chino and Manzanillo village stay unsheltered, because the Atlas only gives them narrow strips. If they are calm in reality, the reef there is narrower or deeper than the flat this rule needs, and only a local check or a survey can say which.

References: Nelson (1994) Coastal Engineering 23, 43–59; Gourlay (1994) Coastal Engineering 23, 17–42; Lowe et al. (2005) JGR 110, C04001; Vetter et al. (2010) JGR 115, C12066; Becker et al. (2014) Coral Reefs 33, 1155–1163; Quataert et al. (2015) GRL 42, 6407–6415.

## 3.5 Rip risk (`rip.ts`)

A transparent score built on the drivers that the NWS rip current guidance, the Lushine Rip Current Scale and Dusek and Seim's (2013) logistic model agree on:

`S = height × period × angle × tide × wind × channel`

| Factor | Range | Rule |
|---|---|---|
| Breaker height | 0 to 1 | smoothstep from 0.3 m to 1.8 m |
| Period | 0.6 to 1 | smoothstep from 6 s to 13 s |
| Approach angle | 0.4 to 1 | 0.4 + 0.6 cos² of the angle to the shore normal (oblique waves feed longshore currents instead) |
| Tide | 0.8 to 1.2 | 1.2 at low water, 0.8 at high (3.1 tide state) on a big tide (0.45 m range, the 90th percentile day); the swing shrinks in proportion on smaller tides, so a 0.23 m day runs 0.9 to 1.1 |
| Onshore wind | 1 to 1.15 | smoothstep from 3 to 8 m/s onshore |
| Known channel | 1 or 1.3 | reef gap, river mouth or structure |

**LOW** below 0.25, **MOD** to 0.55, **HIGH** above. A 1 m, 10 s shore-normal breaker at mid tide is MOD; 1.5 m at 12 s is HIGH, which is how NWS offices call it.

- **Strength:** typical rip speed 0.15·√(g·Hb), scaled by the angle and tide factors (MacMahan et al. 2006: mean flows 0.3 to 0.8 m/s, pulses to twice that). Bands WEAK below 0.3 m/s, MODERATE to 0.6, STRONG to 1, VERY STRONG above. An average swimmer manages about 0.5 m/s.
- **Length:** about 1.5 surf-zone widths offshore (surf zone = breaking depth / slope), 30 to 600 m. SHORT below 75 m, MEDIUM to 200 m, LONG above.

`knownChannel` is set for the same fixed sites the RIP RISK layer rings: breaks whose guides list rips, and places within 1 km of a plume river's mouth (`spot-physics.ts`). The angle factor uses the angle at the break (Snell's law from the 10 m read point), not offshore. The score is a guide, not a lifeguard: the HUD should always say so.

## 3.6 Physics worker (`worker.ts`, `client.ts`, `spot-model.ts`)

Spot refraction (70 to 300 ms) runs in a Web Worker. The main thread posts the seafloor grids (and the Atlas reef-flat polygons, 7.59) once, then asks for a spot (pin, sea state, tide level, wind). `spot-model.ts` caches the spot geometry per pin and the refraction per period (0.5 s), direction (5°) and spread, so a change in height, tide or wind, or scrubbing the slider through hours with the same swell, only re-runs the breaker and rip formulas (well under a millisecond). The client keeps one request in flight and lets the newest waiting request replace older ones, so a fast scrub never builds a backlog. Without Worker support it runs the same model in-thread.

The HUD's RIP readout now comes from this for the spot nearest the map centre, using the live tide and wind and, until the waves adapter (2.2) lands, the mock swell.

## On the map (PLAN 4.2)

`src/spot-physics.ts` runs every named spot through the worker whenever the forecast hour, swell, wind or tide changes. The RIP RISK layer (`src/layers/rip.ts`) does not pretend to know where a rip will open. It shades the whole exposed shore (stations every ~120 m along the OSM coastline, facing open sea) with the risk blended from the two nearest modelled spots (inverse distance squared), only where it is MOD or HIGH, fading with distance from a modelled spot. It rings fixed rip sites, where something holds a channel in place: river mouths (rank 1 in `mouths.geojson`) and the surf breaks whose guides list rips. Each spot at MOD or HIGH gets a text label with strength, speed and reach. At the spot tier the side panel's SURF ZONE block shows the breaker height and type, wave power, longshore drift, rip strength and reach for the spot nearest the reticle. The longshore drift uses the rms breaker height and the angle at the break, found by Snell's law from the 10 m read point.

## 6.2 Dive surge (`surge.ts`, `src/dive-hud.ts`)

The wave at the spot's 10 m read point (offshore Hs × the 3.3 factor K) is shoaled to 3, 6 and 12 m (capped where it would already have broken). The peak bed velocity is ub = πH / (T sinh kh), and the water swings ub·T/2π each way. The significant height is used, so the band errs on the cautious side: **CALM** below 0.25 m/s, **SURGY** to 0.6 m/s, **DANGEROUS** above. A diver can hold position against roughly 0.3 to 0.5 m/s. At the spot tier the side panel's DIVE SURGE rows show the band, the speed and the swing for each depth, e.g. `SURGY 0.5 M/S ±0.5M` at 3 m off Cahuita on a 1 m, 10 s day. These thresholds are our guidance, not a published standard.
