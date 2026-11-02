# Wave physics

How the app takes an offshore forecast (Hs, Tp, direction) to the beach (PLAN 3.2 to 3.5). All of it lives in `src/physics/`, pure TypeScript with SI units and tests; tides are in `docs/TIDES.md`.

## 3.2 Dispersion and shoaling (`waves.ts`)

Linear wave theory. `wavenumber(T, h)` solves ω² = g k tanh(kh) (Fenton and McKee start, Newton polish, machine precision). From k come wavelength, phase speed c, group speed Cg = n·c, and the shoaling coefficient Ks = √(Cg0/Cg), which dips to 0.913 at kh ≈ 1.2 and then grows toward the beach. `bottomOrbitalVelocity` gives the bed velocity for the dive surge band (6.2). Checked against the Coastal Engineering Manual tables.

## 3.3 Refraction (`refraction.ts`)

Rays bend toward slower (shallower) water. `traceRay` integrates the ray equations (RK4) over the GEBCO depth grid, with the OSM land mask marking the beach and the 1′ Caribbean grid beyond the region.

`refractAt(point, T, offshore)` gives the wave height factor K = H/H0 at a point by **backward spectral ray tracing** (Longuet-Higgins 1957, O'Reilly and Guza 1991): a fan of rays (every 0.5°) leaves the point toward the sea, each ray that reaches deep water picks up the offshore directional spectrum at its arrival direction, and S·c·Cg is conserved along every ray. This handles headlands, reef shelter and focusing without the ray-spacing blow-ups that a coarse grid causes. Over straight contours it equals Ks·√(cos θ0 / cos θ) (tested). The result also gives the local arrival direction, and Kr = K/Ks, the factor that turns H0 into the "refracted deep-water height" that breaker formulas (3.4) want.

`nearshorePoint(pin, 10 m)` finds where to read each spot: the nearest water at least 10 m deep off the shoreline pin. A spot costs about 70 to 300 ms, so 3.6 runs it in a Web Worker.

**Limits.** GEBCO here is about 460 m and satellite-derived near shore (`docs/SEAFLOOR.md`), so the rays see the shelf, the bays and the big headlands, not individual reef channels. Salsa Brava's reef focusing, for example, is too small for the grid; 6.3/6.4 add per-break knowledge on top. The offshore spread is a parameter (default about 15° for swell, 30° for wind sea) because Open-Meteo doesn't forecast it.
