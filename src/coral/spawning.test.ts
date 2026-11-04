import { describe, expect, it } from 'vitest';
import { fullMoons, nextSeasons, spawnWindows, SPAWNERS } from './spawning';

const CAHUITA = { lat: 9.74, lng: -82.83 };
const H = 3.6e6;

describe('coral spawning calendar', () => {
  it('finds full moons to within an hour (31 Aug 2023 01:36 UTC, 28 Aug 2026 04:18 UTC)', () => {
    const a = fullMoons(Date.UTC(2023, 7, 20), Date.UTC(2023, 8, 10));
    expect(a).toHaveLength(1);
    expect(Math.abs(a[0] - Date.UTC(2023, 7, 31, 1, 36))).toBeLessThan(H);
    const b = fullMoons(Date.UTC(2026, 7, 20), Date.UTC(2026, 8, 5));
    expect(Math.abs(b[0] - Date.UTC(2026, 7, 28, 4, 18))).toBeLessThan(H);
    expect(fullMoons(Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1)).length).toBeGreaterThanOrEqual(12);
  });

  it('puts the 5 Sep 2023 elkhorn spawning at Cahuita inside a predicted window night', () => {
    const ws = spawnWindows(Date.UTC(2023, 7, 25), 20, CAHUITA.lat, CAHUITA.lng).filter((w) => w.id === 'apal');
    // Evening of 5 Sep local (UTC-6) is 6 Sep UTC; night 6 after the full moon (19:36 local on 30 Aug).
    const w = ws.find((x) => new Date(x.from - 6 * H).toISOString().startsWith('2023-09-05'));
    expect(w).toBeDefined();
    expect(w!.night).toBe(6);
    // Sunset 17:38 local plus 140–190 min: about 19:58 to 20:48.
    const localH = (ms: number) => ((ms - 6 * H) % 864e5) / H;
    expect(localH(w!.from)).toBeCloseTo(19.97, 1);
    expect(localH(w!.to)).toBeCloseTo(20.8, 1);
  });

  it('only spawns after the listed months and orders seasons by first window', () => {
    const ws = spawnWindows(Date.UTC(2026, 10, 4), 365, CAHUITA.lat, CAHUITA.lng);
    for (const w of ws) {
      const m = new Date(w.fullMoon - 6 * H).getUTCMonth() + 1;
      expect(SPAWNERS.find((s) => s.id === w.id)!.months).toContain(m);
    }
    const seasons = nextSeasons(ws, Date.UTC(2026, 10, 4));
    expect(seasons.map((s) => s.id).sort()).toEqual(SPAWNERS.map((s) => s.id).sort());
    expect(seasons.every((s, i) => i === 0 || s.first.from >= seasons[i - 1].first.from)).toBe(true);
    // Next year's Acropora run follows the August 2027 full moon.
    const apal = seasons.find((s) => s.id === 'apal')!;
    expect(new Date(apal.first.from).getUTCMonth()).toBe(7);
    expect(apal.now).toBe(false);
  });

  it('flags a window that is open now', () => {
    const ws = spawnWindows(Date.UTC(2023, 7, 25), 20, CAHUITA.lat, CAHUITA.lng);
    const w = ws.find((x) => x.id === 'apal')!;
    const s = nextSeasons(ws, (w.from + w.to) / 2).find((x) => x.id === 'apal')!;
    expect(s.now).toBe(true);
  });
});
