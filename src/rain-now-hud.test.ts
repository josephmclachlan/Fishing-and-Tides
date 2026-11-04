import { describe, expect, it } from 'vitest';
import { rainAlerts, rainNowState, RAIN_ALERT_MIN } from './rain-now-hud';
import { paint } from './layers/rain';
import type { RainCellsData } from './adapters/rain-cells';
import { RAIN_TOWNS } from './region';

const n = (status: 'coming' | 'raining' | 'dry', etaMin: number | null, peakMmH: number) => ({ status, nowMmH: 0, etaMin, peakMmH });

describe('rainAlerts', () => {
  it('warns only for a heavy cell arriving soon', () => {
    const s = { motion: null, towns: [
      { id: 'a', name: 'CAHUITA', n: n('coming', 20, 8) },
      { id: 'b', name: 'PLAYA NEGRA', n: n('coming', RAIN_ALERT_MIN + 10, 20) },
      { id: 'c', name: 'MANZANILLO', n: n('coming', 10, 2) },
      { id: 'd', name: 'PUERTO VIEJO', n: n('raining', null, 30) },
    ] };
    const a = rainAlerts(s);
    expect(a).toHaveLength(1);
    expect(a[0]).toContain('CAHUITA');
    expect(a[0]).toContain('20');
    expect(rainAlerts(null)).toEqual([]);
  });
});

describe('rainNowState', () => {
  it('reads every town, unknown when the frames are stale', () => {
    const grid = { west: -83.6, north: 10.5, step: 0.02, nx: 80, ny: 70 };
    const d: RainCellsData = { grid, frames: [{ t: 0, rate: new Float32Array(80 * 70) }], source: 'ir', fetchedAt: 0, fromCache: false };
    expect(rainNowState(d, 10 * 60000).towns.map((x) => x.n.status)).toEqual(RAIN_TOWNS.map(() => 'dry'));
    expect(rainNowState(d, 120 * 60000).towns.every((x) => x.n.status === 'unknown')).toBe(true);
  });
});

describe('paint', () => {
  it('colours by rate band and leaves dry and missing cells clear', () => {
    const c = { green: [0, 255, 0] as [number, number, number], amber: [255, 176, 0] as [number, number, number], red: [255, 0, 0] as [number, number, number] };
    const px = paint(Float32Array.from([0, NaN, 0.5, 2, 8, 20]), c);
    const at = (k: number) => [...px.slice(k * 4, k * 4 + 4)];
    expect(at(0)[3]).toBe(0);
    expect(at(1)[3]).toBe(0);
    expect(at(2)).toEqual([0, 255, 0, 60]);
    expect(at(3)).toEqual([0, 255, 0, 150]);
    expect(at(4).slice(0, 3)).toEqual([255, 176, 0]);
    expect(at(5).slice(0, 3)).toEqual([255, 0, 0]);
  });
});
