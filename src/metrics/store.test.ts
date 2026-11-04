import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, KEY, loadWatch, saveWatch } from './store';

const mem = (init?: string) => {
  const m = new Map<string, string>(init ? [[KEY, init]] : []);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('watch store', () => {
  it('round-trips a selection', () => {
    const s = mem();
    saveWatch(s, { metrics: ['bite', 'wind'], region: { center: [-82.7, 9.65], radiusKm: 10 } });
    expect(loadWatch(s)).toEqual({ metrics: ['bite', 'wind'], region: { center: [-82.7, 9.65], radiusKm: 10 } });
  });
  it('falls back to defaults on nothing, junk or no storage', () => {
    expect(loadWatch(mem())).toEqual({ metrics: DEFAULT_STATE.metrics, region: null });
    expect(loadWatch(mem('{{'))).toEqual({ metrics: DEFAULT_STATE.metrics, region: null });
    expect(loadWatch(undefined).metrics).toEqual(DEFAULT_STATE.metrics);
  });
  it('drops unknown and repeated metrics, caps the count, rejects a bad region', () => {
    const s = mem(JSON.stringify({ metrics: ['wind', 'wind', 'zzz', 'swell', 'rain', 'gust', 'air', 'uv', 'tide', 'bite', 'period'], region: { center: ['x', 1], radiusKm: 5 } }));
    const r = loadWatch(s);
    expect(r.metrics).toEqual(['wind', 'swell', 'rain', 'gust', 'air', 'uv', 'tide', 'bite']);
    expect(r.region).toBeNull();
  });
});
