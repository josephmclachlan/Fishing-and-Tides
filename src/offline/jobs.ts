/**
 * The feeds "Sync for trip" refreshes (PLAN 5.1). Each adapter stores its newest copy in the
 * offline cache as it fetches (adapters/cache.ts); a job fails when the network did not answer
 * and the adapter fell back to an older copy, or when nothing was published, so the summary
 * never claims a fresh download it did not get.
 */
import { fetchCoral } from '../adapters/coral';
import { fetchMud } from '../adapters/mud';
import { fetchCatchmentRain } from '../adapters/catchment-rain';
import { fetchCurrents } from '../adapters/currents';
import { fetchGauge } from '../adapters/gauge';
import { fetchLightning } from '../adapters/lightning';
import { fetchMetar } from '../adapters/metar';
import { fetchMld } from '../adapters/mld';
import { fetchPasses } from '../adapters/passes';
import { fetchRiverFlow } from '../adapters/river-flow';
import { fetchSargassum } from '../adapters/sargassum';
import { fetchSatellite } from '../adapters/satellite';
import { fetchStorms } from '../adapters/storms';
import { fetchWaves } from '../adapters/waves';
import { fetchWeather } from '../adapters/weather';
import { fetchSpotWind } from '../adapters/spot-wind';
import { fetchTownRain } from '../adapters/town-rain';
import { fetchWindFix } from '../adapters/wind-fix';
import { fetchRainCells } from '../adapters/rain-cells';
import { fetchHindcast } from '../adapters/weather-skill';
import { fetchWind } from '../adapters/wind';
import type { SyncJob } from './sync';

const need = (ok: unknown, what: string) => {
  if (!ok) throw new Error(what);
};
const live = (d: { fromCache: boolean }, what: string) => need(!d.fromCache, `${what}: network did not answer, kept the older copy`);

/**
 * The verify feeds (src/verify/registry.ts) each job refreshes. A test holds every live feed in
 * the verify list to a job here, so a new feed can't be checked daily yet missed by the sync (PLAN 7.9).
 */
export const JOB_FEEDS: Record<string, readonly string[]> = {
  wind: ['wind'],
  waves: ['waves'],
  currents: ['currents'],
  sst: ['sst', 'sst-coast', 'chl', 'kd490', 'kd490-nrt'],
  passes: ['sst-pass', 'chl-pass', 'scat-pass'],
  weather: ['weather', 'uv', 'spotwind'],
  rain: ['rain', 'rain-imerg'],
  townrain: ['townrain'],
  raincells: ['raincells'],
  river: ['river'],
  storms: ['storms'],
  gauge: ['gauge'],
  metar: ['metar'],
  lightning: ['lightning'],
  sargassum: ['sargassum'],
  mld: ['mld'],
  coral: ['coral'],
  mud: ['mud'],
};

/** Verify feeds that are precached with the app rather than synced (checked in the sync's last step). */
export const PRECACHED_FEEDS: readonly string[] = ['occurrences', 'obis', 'gbif'];

export function tripJobs(base: string = import.meta.env.BASE_URL): SyncJob[] {
  return [
    { name: 'wind', run: async () => need((await fetchWind({ base })).forecast, 'no wind forecast') },
    { name: 'waves', run: async () => need((await fetchWaves({ base })).forecast, 'no wave forecast') },
    { name: 'currents', run: async () => need((await fetchCurrents({ base })).forecast, 'no current forecast') },
    { name: 'sst', run: async () => need(Number.isFinite((await fetchSatellite({ base })).fetchedAt), 'no satellite data') },
    // The airport hindcast that scores the models (PLAN 7.4) rides with the forecast; without it the blend uses equal weights.
    { name: 'weather', run: async () => { live(await fetchWeather(), 'weather'); await fetchSpotWind().catch(() => null); await fetchHindcast().catch(() => null); } },
    { name: 'rain', run: async () => live(await fetchCatchmentRain({ base }), 'rain') },
    { name: 'townrain', run: async () => live(await fetchTownRain(), 'townrain') },
    { name: 'raincells', run: async () => { const d = await fetchRainCells(); if (d) live(d, 'raincells'); } },
    { name: 'river', run: async () => live(await fetchRiverFlow(), 'river') },
    { name: 'storms', run: async () => live(await fetchStorms({ base }), 'storms') },
    { name: 'gauge', run: async () => live(await fetchGauge({ hours: 30 }), 'gauge') },
    // LIVE OBS (PLAN 2.13): the airport's reports and the satellite passes.
    { name: 'metar', run: async () => live(await fetchMetar({ base }), 'metar') },
    { name: 'passes', run: async () => { const d = await fetchPasses({ base }); need(d.sst || d.chl || d.scat, 'no satellite passes'); await fetchWindFix(d.scat).catch(() => null); } },
    // Published only from the live site (null in dev and preview): nothing to sync there.
    { name: 'sargassum', run: async () => need((await fetchSargassum({ base })).series, 'no sargassum detections') },
    { name: 'mld', run: async () => need((await fetchMld({ base })).series, 'no mixed-layer depth') },
    { name: 'coral', run: async () => live(await fetchCoral({ base }), 'coral heat stress') },
    { name: 'mud', run: async () => live(await fetchMud({ base }), 'mud weeks') },
    { name: 'lightning', run: async () => { const d = await fetchLightning(); if (d) live(d, 'lightning'); } },
  ];
}
