# Performance pass (PLAN 5.4)

## How it was measured

The built-in Chromium (headless, with software WebGL) loaded the app with the CPU slowed 4× through the DevTools protocol. That is roughly a mid-range phone. A sampling profiler ran over two windows:

- **Start:** the first 15 s after load.
- **Use:** stepping the time slider 54 times, a drag pan, and six wheel zooms.

The numbers below count only JavaScript in `src/` (our own code), summed by self time. MapLibre's own time is about the same in both runs and is left out. Software WebGL makes the GPU share meaningless here, so frame rates were not compared. Each figure is two runs on the same machine, main versus this branch.

| Window | Before | After |
|---|---|---|
| Start, our code | 3.9 to 4.0 s | 1.4 to 2.0 s |
| Use, our code | 4.5 to 4.7 s | 2.6 to 2.7 s |

## What changed

- **Seafloor shading and contours in a worker** (`src/layers/seafloor-worker.ts`, pure code in `seafloor-bake.ts`). The two depth rasters (1400 and 2000 px wide, hillshaded) and the smoothed contours were the largest single block at start: about 2.5 s of main-thread time at 4×, in one long task while the map drew its first frames. The worker builds them and PNG-encodes them with OffscreenCanvas. The main thread only makes an object URL. Where workers or OffscreenCanvas are missing, it falls back to the old in-thread path, and the result is the same image.
- **No layout reads per frame** (`src/layout-size.ts`). The particle layer read the map container's `clientWidth` and `clientHeight` three times per animation frame, and the altitude readout read them on every map move. The HUD changes text every second, so each read forced a synchronous layout. A ResizeObserver now keeps the size in a plain object.
- **Species records filtered once** (`src/layers/fishing.ts`). Each of about 3,600 fishing cells × 5 species scanned every record in the 0.5° box. Records more than 0.03° outside the fishing area can't nudge any cell, so they are dropped once at mount. The scores are unchanged.
- **Mock current geometry sampled once** (`src/mock.ts`). When no real currents are loaded (offline with an empty cache, or before the data build publishes them), each slider step recomputed the distance to the coastline for every point of a 0.05° grid. Only the coastal jet's tidal strength changes with the hour, so the geometry is sampled once and scaled. The field is the same.
- **Tide table scans less** (`src/tide-chart.ts`). The next-tides list scanned 3 days for 2 or 4 turns. It now scans 1 or 2 days, and longer only if it finds too few.

## Tried and dropped

Caching the tide nodal factors looked like a hot spot in the profile but made no difference in a benchmark (44 vs 49 ms for 20 three-day tables), so it was left out.

## Still worth doing

- The fishing cells (`buildCells`, mostly the coast-distance rays) still cost about 0.3 s at start at 4×. They could move to a worker with the reef polygons.
- The main bundle is 1.29 MB (370 kB gzipped), and about two thirds of it is MapLibre. Lazy-loading the panels that start closed (BOAT, SYSTEM CHECK, the spot page) would save little next to that.
