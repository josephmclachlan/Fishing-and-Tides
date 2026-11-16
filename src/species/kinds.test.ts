import { describe, expect, it } from 'vitest';
import { KIND_IDS, KINDS, LOG_SPECIES } from './kinds';
import { SPECIES } from '../fishing/species';
import { OFFSHORE } from '../fishing/offshore';
import { en } from '../i18n/en';
import { es } from '../i18n/es';

describe('the one catalogue of fish kinds', () => {
  it('has exactly the kinds the map models, shore then boat', () => {
    const last = Math.max(...SPECIES.map((s) => KIND_IDS.indexOf(s.id)));
    expect(Math.min(...OFFSHORE.map((s) => KIND_IDS.indexOf(s.id)))).toBeGreaterThan(last);
    expect([...KIND_IDS].sort()).toEqual([...SPECIES.map((s) => s.id), ...OFFSHORE.map((s) => s.id)].sort());
  });
  it('gives every kind species and a guide search, and no species to two kinds', () => {
    const seen = new Map<string, string>();
    for (const k of KIND_IDS) {
      expect(KINDS[k].taxa.length).toBeGreaterThan(0);
      expect(KINDS[k].search).toBeTruthy();
      for (const sci of KINDS[k].taxa) {
        expect(seen.get(sci), sci).toBeUndefined();
        seen.set(sci, k);
      }
    }
  });
  it('logs every kind but the release-only sport fish, then other', () => {
    expect(LOG_SPECIES).not.toContain('sailfish');
    expect(LOG_SPECIES).not.toContain('marlin');
    expect(LOG_SPECIES.at(-1)).toBe('other');
    expect(LOG_SPECIES.length).toBe(KIND_IDS.length - 2 + 1);
  });
  it('names every kind in both languages under fish.<id>', () => {
    for (const k of [...KIND_IDS, 'other']) {
      expect((en as Record<string, string>)[`fish.${k}`], k).toBeTruthy();
      expect((es as Record<string, string>)[`fish.${k}`], k).toBeTruthy();
    }
  });
});
