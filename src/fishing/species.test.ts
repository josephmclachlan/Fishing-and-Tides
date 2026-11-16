import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { MODES, SPECIES, speciesById, speciesIn } from './species';

describe('species catalog', () => {
  it('has text for every species and consistent weights and ranges', () => {
    for (const s of SPECIES) {
      expect(`fish.${s.id}` in en).toBe(true);
      // A species with no local record says so in its own RULE OF THUMB line.
      if (s.noLocalRecord) expect(s.confidence === 'low' && `fish.low.${s.id}` in en).toBe(true);
      expect(s.w.mouth + s.w.reef + s.w.drop + (s.w.sand ?? 0) + (s.w.grass ?? 0) + (s.w.surf ?? 0)).toBeCloseTo(1);
      expect(s.season).toHaveLength(12);
      const [a, b, c, d] = s.depthM;
      expect(a < b && b <= c && c < d).toBe(true);
      for (const r of [s.water.visM, s.water.sstC]) expect(r[0] < r[1] && r[1] <= r[2] && r[2] < r[3]).toBe(true);
    }
  });
});

describe('seasonOf', () => {
  it('words the season factor', async () => {
    const { seasonOf } = await import('./species');
    expect(seasonOf(speciesById('snook'), 8)).toBe('peak');
    expect(seasonOf({ ...SPECIES[0], season: Array(12).fill(0.9) }, 0)).toBe('good');
    expect(seasonOf({ ...SPECIES[0], season: Array(12).fill(0.7) }, 0)).toBe('off');
  });
});

describe('modes', () => {
  it('puts every species in at least one mode, permit in both, EAT first and barracuda in SPORT only', () => {
    expect(MODES[0]).toBe('eat');
    for (const m of MODES) expect(speciesIn(m).length).toBeGreaterThan(0);
    for (const s of SPECIES) expect(s.modes.length, s.id).toBeGreaterThan(0);
    expect(new Set(MODES.flatMap((m) => speciesIn(m))).size).toBe(SPECIES.length);
    expect(speciesById('permit').modes).toEqual(['eat', 'sport']);
    expect(speciesIn('eat').map((s) => s.id)).toContain('permit');
    expect(speciesIn('sport').map((s) => s.id)).toContain('permit');
    expect(speciesById('barracuda').modes).toEqual(['sport']);
    expect(speciesIn('eat').map((s) => s.id)).not.toContain('barracuda');
  });
});

describe('by-hand catch (PLAN 7.125)', () => {
  it('closes lobster from March to June and keeps the by-hand catch in EAT', async () => {
    const { seasonOf } = await import('./species');
    const lobster = speciesById('lobster');
    expect([2, 3, 4, 5].map((m) => seasonOf(lobster, m))).toEqual(['closed', 'closed', 'closed', 'closed']);
    expect(seasonOf(lobster, 1)).not.toBe('closed');
    expect(seasonOf(lobster, 6)).not.toBe('closed');
    for (const id of ['lobster', 'octopus', 'cigua'] as const) expect(speciesById(id)).toMatchObject({ modes: ['eat'], byHand: true });
  });
});
