/**
 * Test fixtures for the FORECAST page (PLAN 7.69): a fixed environment (Limón tide harmonics, steady trade wind,
 * a 1.2 m 11 s swell, a hot showery afternoon), an outing read for snorkel and dive, and a recording canvas that
 * fails on any non-finite coordinate. Used by the *.test.ts files only; nothing in the app imports it.
 */
import { LIMON_HARMONICS } from '../data/tides-limon';
import type { MetricEnv } from '../metrics/registry';
import type { SeaState } from '../adapters/waves';
import { SPOTS } from '../region';
import type { Spot } from '../metrics/forecast';
import type { FcDeps, OutingRead } from './model';
import { TOKEN_NAMES, type Ctx2D, type Tokens } from './kit';

export const H = 3.6e6;
/** Local midnight (UTC-6) on Wednesday 4 November 2026. */
export const DAY0 = Date.UTC(2026, 10, 4, 6);
export const spot = (name: string): Spot => SPOTS.find((s) => s.name === name)!;
export const sea = (hs: number, t: number): SeaState => ({
  hs, tm: t, dir: 60, swellHs: hs, swellT: t, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast',
});
const rip = (level: 'LOW' | 'MOD' | 'HIGH') => ({
  score: level === 'LOW' ? 0.1 : level === 'MOD' ? 0.4 : 0.7, level, speedMs: 0.3, strength: 'WEAK' as const, lengthM: 60, length: 'SHORT' as const,
  factors: { height: 1, period: 1, angle: 1, tide: 1, wind: 1, channel: 1 },
});
/** Local hour of a timestamp at UTC-6. */
const lh = (ms: number) => (((ms / H - 6) % 24) + 24) % 24;
/** The fixture's weather: sun by day (UV up to 10), an afternoon shower peaking at 16:00, trade wind by day. */
export const weatherAt = (ms: number) => {
  const h = lh(ms), sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)), pm = Math.exp(-((h - 16) ** 2) / 5);
  return [{
    model: 'gfs_seamless' as const, rainMmH: +(Math.max(0, pm * 3 - 0.6)).toFixed(1), cloudPct: Math.round(25 + 60 * pm), uv: +(10 * sun).toFixed(1),
    tempC: +(25 + 6 * sun).toFixed(1), gustKt: +(10 + 8 * sun).toFixed(1), capeJkg: Math.round(200 + 800 * pm), pressureHpa: 1012, windKt: +(5 + 7 * sun).toFixed(1),
    dewC: 23, rainChancePct: Math.round(10 + 70 * pm),
  }];
};
export const env = (over: Partial<MetricEnv> = {}): MetricEnv => ({
  windMs: (_lng: number, _lat: number, ms: number) => 2 + 3 * Math.max(0, Math.sin(((lh(ms) - 6) / 12) * Math.PI)),
  windDirDeg: (_lng: number, _lat: number, ms: number) => (lh(ms) > 9 && lh(ms) < 19 ? 70 : 220),
  currentMs: () => 0.25,
  shore: (_s: string, ms: number) => ({ breakerM: 0.3 + 0.1 * Math.sin(ms / H / 6), rip: rip(lh(ms) > 12 ? 'MOD' : 'LOW') }),
  sea: () => sea(1.2, 11),
  weather: weatherAt,
  clarityM: () => 10,
  sstC: () => 28.5,
  sargassumKm2: () => 0,
  tide: LIMON_HARMONICS,
  tzOffsetH: -6,
  ...over,
});
export const outing = (score: number, over: Partial<OutingRead> = {}): FcDeps['outing'] => (): OutingRead => ({
  score, reasons: score < 70 ? ['surge'] : [], surgeMs: 0.12, visM: 12, breakerM: 0.4, windMs: 3.2, currentMs: 0.21, waterM: 1.4, ...over,
});
/** Deps with every feed, and with none (before the feeds load). */
export const full = (): FcDeps => ({ env: env(), outing: outing(64) });
export const empty = (): FcDeps => ({ env: env({ sea: () => null, windMs: () => null, weather: () => [], clarityM: () => null, sstC: () => null, shore: () => null }) });

/** Light-mode-like tokens for drawing tests (the values do not matter, only that every token exists). */
export const tokens = (): Tokens => Object.fromEntries(TOKEN_NAMES.map((n, i) => [n, [(i * 37) % 255, (i * 91) % 255, (i * 13) % 255]])) as unknown as Tokens;

/**
 * A 2D context that records the calls made on it and throws on a non-finite number, so a drawing test fails on the
 * first NaN instead of drawing nothing. Gradients and text measuring return harmless stand-ins.
 */
export function recCtx(): Ctx2D & { calls: string[]; texts: string[] } {
  const calls: string[] = [];
  const texts: string[] = [];
  const grad = { addColorStop: (o: number) => { if (!Number.isFinite(o)) throw new Error('NaN gradient stop'); } };
  const state: Record<string, unknown> = {};
  const target = { calls, texts };
  return new Proxy(target, {
    get(t, k: string) {
      if (k in t) return (t as Record<string, unknown>)[k];
      if (k === 'measureText') return (s: string) => ({ width: s.length * 6 });
      if (k === 'createConicGradient' || k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'getTransform') return () => ({ a: 1 });
      if (k in state) return state[k];
      return (...args: unknown[]) => {
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`${k}(${args.join(', ')})`);
        calls.push(k);
        if (k === 'fillText' && typeof args[0] === 'string') {
          if (/NaN|undefined|Infinity/.test(args[0])) throw new Error(`text "${args[0]}"`);
          texts.push(args[0]);
        }
      };
    },
    set(_t, k: string, v) {
      if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${k} = ${v}`);
      if (typeof v === 'string' && /NaN|undefined/.test(v)) throw new Error(`${k} = ${v}`);
      state[k] = v;
      return true;
    },
  }) as unknown as Ctx2D & { calls: string[]; texts: string[] };
}
