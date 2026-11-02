/**
 * Waves feed (PLAN 2.2): Open-Meteo Marine. Météo-France MFWAM (1/12°) where it reaches,
 * about 9 days, then NOAA GFS-Wave (0.25°) out to 16 days. Sampled on the 0.25° macro grid at
 * sea points only, 3-hourly (waves change slowly; the app blends between frames).
 *
 * Partitions: the primary swell, a secondary swell (a second train from another storm or
 * direction) and the local wind sea, each with height, period and direction. Both models publish
 * all three; a 0 m partition means that train is absent.
 *
 * Directions are stored as unit vectors (the way the waves travel), so blending across north
 * (350° → 10°) works; the app turns them back into "from" degrees.
 */
import type { SeriesMeta, VarMeta } from '../../src/adapters/pack.ts';
import { REGION } from '../../src/region.ts';
import { gridOver, gridPoints, keepIndices, openMeteoGrid, seaMask, unitFrom, writeSeries } from './common.ts';

const MODELS = [
  { id: 'meteofrance_wave', name: 'Météo-France MFWAM (via Open-Meteo)' },
  { id: 'ncep_gfswave025', name: 'NOAA GFS-Wave 0.25° (via Open-Meteo)' },
] as const;

const V = (name: string, unit: string, scale: number): VarMeta => ({ name, unit, scale, offset: 0 });
export const WAVE_VARS: VarMeta[] = [
  V('hs', 'm', 0.01), V('tm', 's', 0.01), V('du', '1', 0.0001), V('dv', '1', 0.0001),
  V('swh', 'm', 0.01), V('swt', 's', 0.01), V('swu', '1', 0.0001), V('swv', '1', 0.0001),
  V('wwh', 'm', 0.01), V('wwt', 's', 0.01), V('wwu', '1', 0.0001), V('wwv', '1', 0.0001),
  // Secondary swell: a second, independent swell train (another storm, another direction).
  V('s2h', 'm', 0.01), V('s2t', 's', 0.01), V('s2u', '1', 0.0001), V('s2v', '1', 0.0001),
];

export async function buildWaves(dir: string): Promise<string> {
  const grid = gridOver(REGION.maxBounds, 0.25);
  const all = gridPoints(grid);
  const sea = seaMask(grid);
  const cells = all.map((_, i) => i).filter((i) => sea[i]);
  const fetchedAt = new Date().toISOString();
  const vars = [
    'wave_height,wave_period,wave_direction',
    'swell_wave_height,swell_wave_period,swell_wave_direction',
    'secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction',
    'wind_wave_height,wind_wave_period,wind_wave_direction',
  ].join(',');
  const om = await openMeteoGrid(
    'https://marine-api.open-meteo.com/v1/marine',
    `hourly=${vars}&models=${MODELS.map((m) => m.id).join(',')}&forecast_days=16&cell_selection=sea`,
    cells.map((i) => all[i]),
  );
  const allTimes = om[0].hourly.time.map((s) => s * 1000);
  const keep = keepIndices(allTimes, 0);
  const n = grid.cols * grid.rows;
  const out: Record<string, Float32Array[]> = Object.fromEntries(WAVE_VARS.map((v) => [v.name, keep.map(() => new Float32Array(n).fill(NaN))]));
  const span = MODELS.map(() => [Infinity, -Infinity]);
  om.forEach((p, j) => {
    const cell = cells[j];
    keep.forEach((ti, k) => {
      const m = MODELS.findIndex((mm) => p.hourly[`wave_height_${mm.id}`]?.[ti] != null);
      if (m < 0) return;
      // Models report a 0 s period where there are no waves of that kind (sheltered cells, no wind
      // sea); that is "no period", not a period of zero.
      const g = (v: string) => {
        const x = p.hourly[`${v}_${MODELS[m].id}`]?.[ti] ?? NaN;
        return v.endsWith('_period') && !(x > 0) ? NaN : x;
      };
      span[m][0] = Math.min(span[m][0], allTimes[ti]);
      span[m][1] = Math.max(span[m][1], allTimes[ti]);
      const [du, dv] = unitFrom(g('wave_direction'));
      const [su, sv] = unitFrom(g('swell_wave_direction'));
      const [s2u, s2v] = unitFrom(g('secondary_swell_wave_direction'));
      const [wwu, wwv] = unitFrom(g('wind_wave_direction'));
      const vals: Record<string, number> = {
        hs: g('wave_height'), tm: g('wave_period'), du, dv,
        swh: g('swell_wave_height'), swt: g('swell_wave_period'), swu: su, swv: sv,
        wwh: g('wind_wave_height'), wwt: g('wind_wave_period'), wwu, wwv,
        s2h: g('secondary_swell_wave_height'), s2t: g('secondary_swell_wave_period'), s2u, s2v,
      };
      for (const v of WAVE_VARS) out[v.name][k][cell] = vals[v.name];
    });
  });
  const times = keep.map((i) => allTimes[i]);
  const meta: Omit<SeriesMeta, 'file'> = {
    feed: 'waves',
    kind: 'forecast',
    fetchedAt,
    grid,
    times,
    vars: WAVE_VARS,
    sources: MODELS.map((m, i) => ({ id: m.id, name: m.name, fromMs: span[i][0], toMs: span[i][1] })).filter((s) => Number.isFinite(s.fromMs)),
    licence: 'Open-Meteo, CC BY 4.0 (open-meteo.com); Météo-France / Copernicus Marine, NOAA NCEP',
  };
  const bytes = writeSeries(dir, meta, out);
  return `waves: ${cells.length} sea points of ${all.length}, ${times.length} frames, ${meta.sources.map((s) => `${s.id} to ${new Date(s.toMs).toISOString().slice(0, 13)}Z`).join(', ')}, ${(bytes / 1024).toFixed(0)} KB`;
}
