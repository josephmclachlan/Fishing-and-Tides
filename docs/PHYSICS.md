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
- **Breaking depth:** hb = Hb/γ, with Weggel's slope-dependent breaker index γ (0.78 when the slope is unknown).
- **Breaker type:** Iribarren number ξ0 = tan β / √(H0/L0) with Battjes' classes: spilling below 0.5, plunging to 3.3, surging above.
- **Energy and force:** E = ρgHs²/16, wave power P = E·Cg (kW per metre of beach, conserved to the break and spread by Kr²), crest speed √(g(hb + Hb)), impact pressure ½ρc² (kPa), and the Longuet-Higgins longshore current.
- `spotWaves(pin, sea)` ties it together for a shoreline pin: finds the 10 m read point and the shore normal, the mean slope from pin to read point, refraction, then the breaker.

Example on the real grid, 1.5 m offshore (`npm test` checks every spot stays plausible):

| Spot | Faces | Slope | 10 s from 045° | 14 s from 020° | 7 s from 080° |
|---|---|---|---|---|---|
| LIMÓN | 10° | 0.017 | 2.2 m spilling, Kr 1.02 | 2.6 m spilling, Kr 1.10 | 1.5 m spilling, Kr 0.74 |
| PLAYA BONITA | 10° | 0.014 | 2.1 m spilling, Kr 0.97 | 2.5 m spilling, Kr 1.05 | 1.7 m spilling, Kr 0.87 |
| CAHUITA | 25° | 0.009 | 1.4 m spilling, Kr 0.60 | 2.0 m spilling, Kr 0.78 | 1.6 m spilling, Kr 0.81 |
| PLAYA NEGRA | 45° | 0.065 | 1.6 m plunging, Kr 0.68 | 2.0 m plunging, Kr 0.77 | 1.2 m plunging, Kr 0.57 |
| SALSA BRAVA | 330° | 0.080 | 1.5 m plunging, Kr 0.63 | 1.6 m plunging, Kr 0.58 | 1.0 m plunging, Kr 0.48 |
| PUNTA UVA | 300° | 0.142 | 1.2 m plunging, Kr 0.51 | 1.1 m surging, Kr 0.37 | 0.5 m plunging, Kr 0.22 |
| MANZANILLO | 335° | 0.020 | 2.6 m spilling, Kr 1.27 | 3.1 m spilling, Kr 1.34 | 1.6 m spilling, Kr 0.80 |
| GANDOCA | 65° | 0.006 | 1.7 m spilling, Kr 0.73 | 1.3 m spilling, Kr 0.48 | 1.2 m spilling, Kr 0.56 |

The pattern matches local knowledge in broad strokes (Punta Uva sheltered, the reef spots plunging, Limón and Playa Bonita open to the north-east), but the slope and shore normal come from a 460 m grid, so Salsa Brava's true reef shape and its size on big days are beyond it. Per-break orientation and type (6.3, 6.4) will override these where they're known.

## 3.5 Rip risk (`rip.ts`)

A transparent score built on the drivers that the NWS rip current guidance, the Lushine Rip Current Scale and Dusek and Seim's (2013) logistic model agree on:

`S = height × period × angle × tide × wind × channel`

| Factor | Range | Rule |
|---|---|---|
| Breaker height | 0 to 1 | smoothstep from 0.3 m to 1.8 m |
| Period | 0.6 to 1 | smoothstep from 6 s to 13 s |
| Approach angle | 0.4 to 1 | 0.4 + 0.6 cos² of the angle to the shore normal (oblique waves feed longshore currents instead) |
| Tide | 0.8 to 1.2 | 1.2 at low water, 0.8 at high (3.1 tide state) |
| Onshore wind | 1 to 1.15 | smoothstep from 3 to 8 m/s onshore |
| Known channel | 1 or 1.3 | reef gap, river mouth or structure |

**LOW** below 0.25, **MOD** to 0.55, **HIGH** above. A 1 m, 10 s shore-normal breaker at mid tide is MOD; 1.5 m at 12 s is HIGH, which is how NWS offices call it.

- **Strength:** typical rip speed 0.15·√(g·Hb), scaled by the angle and tide factors (MacMahan et al. 2006: mean flows 0.3 to 0.8 m/s, pulses to twice that). Bands WEAK below 0.3 m/s, MODERATE to 0.6, STRONG to 1, VERY STRONG above. An average swimmer manages about 0.5 m/s.
- **Length:** about 1.5 surf-zone widths offshore (surf zone = breaking depth / slope), 30 to 600 m. SHORT below 75 m, MEDIUM to 200 m, LONG above.

Known rip channels per spot aren't in the data yet; `knownChannel` is ready for them when the surf break catalogue (6.4) adds local knowledge. The score is a guide, not a lifeguard: the HUD should always say so.

## 3.6 Physics worker (`worker.ts`, `client.ts`, `spot-model.ts`)

Spot refraction (70 to 300 ms) runs in a Web Worker. The main thread posts the seafloor grids once, then asks for a spot (pin, sea state, tide level, wind). `spot-model.ts` caches the spot geometry per pin and the refraction per period (0.5 s), direction (5°) and spread, so a change in height, tide or wind, or scrubbing the slider through hours with the same swell, only re-runs the breaker and rip formulas (well under a millisecond). The client keeps one request in flight and lets the newest waiting request replace older ones, so a fast scrub never builds a backlog. Without Worker support it runs the same model in-thread.

The HUD's RIP readout now comes from this for the spot nearest the map centre, using the live tide and wind and, until the waves adapter (2.2) lands, the mock swell.

## On the map (PLAN 4.2)

`src/spot-physics.ts` runs every named spot through the worker whenever the forecast hour, swell, wind or tide changes. The RIP RISK layer (`src/layers/rip.ts`) does not pretend to know where a rip will open. It shades the whole exposed shore (stations every ~120 m along the OSM coastline, facing open sea) with the risk blended from the two nearest modelled spots (inverse distance squared), only where it is MOD or HIGH, fading with distance from a modelled spot. It rings fixed rip sites, where something holds a channel in place: river mouths (rank 1 in `mouths.geojson`) and the surf breaks whose guides list rips. Each spot at MOD or HIGH gets a text label with strength, speed and reach. At the spot tier the side panel's SURF ZONE block shows the breaker height and type, wave power, longshore drift, rip strength and reach for the spot nearest the reticle. The longshore drift uses the rms breaker height and the angle at the break, found by Snell's law from the 10 m read point.

## 6.2 Dive surge (`surge.ts`, `src/dive-hud.ts`)

The wave at the spot's 10 m read point (offshore Hs × the 3.3 factor K) is shoaled to 3, 6 and 12 m (capped where it would already have broken). The peak bed velocity is ub = πH / (T sinh kh), and the water swings ub·T/2π each way. The significant height is used, so the band errs on the cautious side: **CALM** below 0.25 m/s, **SURGY** to 0.6 m/s, **DANGEROUS** above. A diver can hold position against roughly 0.3 to 0.5 m/s. At the spot tier the side panel's DIVE SURGE rows show the band, the speed and the swing for each depth, e.g. `SURGY 0.5 M/S ±0.5M` at 3 m off Cahuita on a 1 m, 10 s day. These thresholds are our guidance, not a published standard.
