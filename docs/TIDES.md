# Tides

How the app predicts the tide (PLAN 3.1). Code: `src/physics/tide.ts` (predictor, extrema, tide state, least-squares fit). Constants: `src/data/tides-limon.ts`, rebuilt by `npm run data:tides` (`scripts/fit-tides.ts`).

## Where the constants come from

DESIGN.md planned TPXO9 or FES2014 constituents. Both need a registered download, and at the one place we can check them, the Limón gauge, a fit to the gauge itself is more accurate than any global model. So the constants are a **least-squares harmonic analysis of the UHSLC Limón tide gauge** (station 268, 9.989°N 83.020°W, research-quality hourly data):

- **Fit:** 2010 to 2020, 11 full years (95,371 hours). Each year's mean is removed first, so datum steps and sea-level rise don't leak into the harmonics. 29 constituents are fitted; the 21 of 2 mm or more are kept.
- **Model:** `η(t) = Σ f·H·cos(V + u − g)` with Meeus mean astronomical angles, Doodson numbers per Foreman (1977), and Pugh & Woodworth (2014) nodal factors over the 18.61-year cycle. Heights are metres relative to mean sea level.
- **Datums** over one nodal cycle: LAT −0.29 m, HAT +0.30 m. The tide here is **mixed, mainly diurnal** (form factor (K1+O1)/(M2+S2) ≈ 1.7): K1 10.0 cm, M2 8.2 cm, O1 6.1 cm, then the seasonal Sa 3.3 cm.

Data: University of Hawaii Sea Level Center, free to use with credit (Caldwell, Merrifield and Thompson, 2015, doi:10.7289/V5V40S7W).

## Validation (years the fit never saw)

| Period | Observed SD | RMS error | Variance explained | High/low timing (median abs) | High/low height (median abs) |
|---|---|---|---|---|---|
| 2023 (research quality) | 12.4 cm | 3.8 cm | 90.5 % | 16 min | 2.7 cm |
| 2024 (research quality) | 12.6 cm | 4.0 cm | 89.9 % | 13 min | 2.8 cm |
| 2025 to Sept 2026 (fast delivery) | 12.4 cm | 4.2 cm | 88.5 % | 14 min | 2.7 cm |

Timing bias is within ±6 minutes. The 4 cm left over is weather, not tide: wind setup, pressure and sea-level anomalies, which the harmonics can't know. That is why DESIGN.md section 12 plans live gauge readings and bias correction (PLAN 2.11, 7.10). A held-out month (March 2024) is checked in as a test fixture (`src/physics/fixtures/limon-2024-03.json`) so `npm test` re-validates every change.

## Along the coast

The Limón gauge is the only tide gauge between Bocas del Toro and Nicaragua, so its constants are used for the whole Gandoca to Limón stretch (about 50 km). This coast sits far from any amphidromic point and the tide arrives along the shelf as one wave, so the difference in timing over 50 km is expected to be a few minutes and in range a centimetre or two, well inside the weather noise above. If a second source turns up (a TPXO extract, or a temporary gauge at Puerto Viejo), add its constants as another station and interpolate along the coast.

## Tide chart and spot pages (PLAN 4.1)

**Side panel** (from the coast tier, under TIDE): the local day (Costa Rica time) of the time on the slider. It shows the predicted curve, the highs and lows with their times, night shaded from the sun times (`src/physics/astro.ts`), and a green cursor at the slider time. Tap the chart to move the slider to that hour. The past can't be picked, so a tap before now goes to NOW. NEXT HIGH and NEXT LOW follow the slider.

The height axis is fixed to the station's astronomical range (LAT −0.29 m to HAT +0.30 m), so a small-tide day looks small. The live Limón gauge (PLAN 2.11, `src/adapters/gauge.ts`) is drawn over the curve as a dotted green line in 10-minute means wherever the day has readings. The gap between the dotted line and the curve is the weather's share. The axis widens if the gauge goes past the range.

**Spot pages** come from the SPOT tab or the PAGE button on the TARGET row. They open on the spot nearest the map centre, and ‹ › steps through the spots. Each page has:

- the same chart, with the next four highs and lows;
- sunrise and sunset, and the moon phase;
- the spot's own physics at the slider time: breaker height and type, rip level and strength, longshore drift, surf quality (catalog breaks only, PLAN 6.3) and surge at 6 m (PLAN 6.2);
- a SHOW ON MAP button that runs the fly-to.

The page is a sheet (`src/sheets.ts`), so on a phone it is a drawer. The code is `src/tide-chart.ts` (pure, tested), `src/tide-hud.ts` and `src/spot-page.ts`.
