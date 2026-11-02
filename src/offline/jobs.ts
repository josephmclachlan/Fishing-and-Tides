/**
 * The feeds "Sync for trip" refreshes (PLAN 5.1). Each adapter stores its newest copy in the
 * offline cache as it fetches (adapters/cache.ts); a job fails when the network did not answer
 * and the adapter fell back to an older copy, or when nothing was published, so the summary
 * never claims a fresh download it did not get.
 */
import { fetchCatchmentRain } from '../adapters/catchment-rain';
import { fetchCurrents } from '../adapters/currents';
import { fetchGauge } from '../adapters/gauge';
import { fetchLightning } from '../adapters/lightning';
import { fetchSatellite } from '../adapters/satellite';
import { fetchStorms } from '../adapters/storms';
import { fetchWaves } from '../adapters/waves';
import { fetchWeather } from '../adapters/weather';
import { fetchWind } from '../adapters/wind';
import type { SyncJob } from './sync';

const need = (ok: unknown, what: string) => {
  if (!ok) throw new Error(what);
};
const live = (d: { fromCache: boolean }, what: string) => need(!d.fromCache, `${what}: network did not answer, kept the older copy`);

export function tripJobs(base: string = import.meta.env.BASE_URL): SyncJob[] {
  return [
    { name: 'wind', run: async () => need((await fetchWind({ base })).forecast, 'no wind forecast') },
    { name: 'waves', run: async () => need((await fetchWaves({ base })).forecast, 'no wave forecast') },
    { name: 'currents', run: async () => need((await fetchCurrents({ base })).forecast, 'no current forecast') },
    { name: 'sst', run: async () => need(Number.isFinite((await fetchSatellite({ base })).fetchedAt), 'no satellite data') },
    { name: 'weather', run: async () => live(await fetchWeather(), 'weather') },
    { name: 'rain', run: async () => live(await fetchCatchmentRain(), 'rain') },
    { name: 'storms', run: async () => live(await fetchStorms({ base }), 'storms') },
    { name: 'gauge', run: async () => live(await fetchGauge({ hours: 30 }), 'gauge') },
    // Published only from the live site (null in dev and preview): nothing to sync there.
    { name: 'lightning', run: async () => { const d = await fetchLightning(); if (d) live(d, 'lightning'); } },
  ];
}
