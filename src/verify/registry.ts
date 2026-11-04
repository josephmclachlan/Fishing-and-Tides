/**
 * Every adapter's verify checks in one list (PLAN 2.8, 2.9). The SYSTEM CHECK panel and the daily
 * Action both run `allChecks()`. A new adapter adds its `xxxChecks(...)` here: an adapter without
 * checks is incomplete (DESIGN.md §10).
 */
import { fetchWind, windChecks } from '../adapters/wind';
import { fetchWaves, wavesChecks } from '../adapters/waves';
import { currentsChecks, fetchCurrents } from '../adapters/currents';
import { fetchGauge, gaugeChecks } from '../adapters/gauge';
import { fetchMetar, metarChecks } from '../adapters/metar';
import { fetchSatellite, satelliteChecks } from '../adapters/satellite';
import { catchmentRainChecks } from '../adapters/catchment-rain';
import { riverFlowChecks } from '../adapters/river-flow';
import { fetchMld, mldChecks } from '../adapters/mld';
import { effortChecks, fetchEffort } from '../adapters/effort';
import { fetchPasses, passChecks } from '../adapters/passes';
import { fetchSargassum, sargassumChecks } from '../adapters/sargassum';
import { weatherChecks } from '../adapters/weather';
import { townRainChecks } from '../adapters/town-rain';
import { correctionChecks } from '../adapters/wind-fix';
import { coralChecks, fetchCoral } from '../adapters/coral';
import { fetchRainCells, rainCellsChecks } from '../adapters/rain-cells';
import { fetchHindcast, weatherSkillChecks } from '../adapters/weather-skill';
import { fetchStorms, stormsChecks } from '../adapters/storms';
import { fetchLightning, lightningChecks } from '../adapters/lightning';
import { occurrenceChecks } from '../fishing/checks';
import type { Check } from './types';

export function allChecks(base: string = import.meta.env.BASE_URL): Check[] {
  return [
    ...windChecks(() => fetchWind({ base })),
    ...wavesChecks(() => fetchWaves({ base })),
    ...currentsChecks(() => fetchCurrents({ base })),
    ...gaugeChecks(),
    ...metarChecks(() => fetchMetar({ base }), () => fetchWind({ base })),
    ...satelliteChecks(() => fetchSatellite({ base })),
    ...catchmentRainChecks(),
    ...riverFlowChecks(),
    ...passChecks(() => fetchPasses({ base }), () => fetchSatellite({ base })),
    ...sargassumChecks(() => fetchSargassum({ base })),
    ...mldChecks(() => fetchMld({ base })),
    ...effortChecks(() => fetchEffort({ base })),
    ...weatherChecks(),
    ...townRainChecks(),
    ...correctionChecks(async () => (await fetchPasses({ base })).scat, async () => (await fetchGauge({ hours: 30 })).readings),
    ...weatherSkillChecks(() => fetchHindcast(), () => fetchMetar({ base })),
    ...stormsChecks(() => fetchStorms({ base })),
    ...coralChecks(() => fetchCoral({ base })),
    ...lightningChecks(() => fetchLightning({ base })),
    ...rainCellsChecks(() => fetchRainCells({ base })),
    ...occurrenceChecks(base),
  ];
}
