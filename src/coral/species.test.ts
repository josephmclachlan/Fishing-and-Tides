import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { CORAL_SPECIES, CORAL_THREATS } from './species';

describe('coral species guide', () => {
  it('ids are unique and every species and threat has EN and ES text', () => {
    expect(new Set(CORAL_SPECIES.map((s) => s.id)).size).toBe(CORAL_SPECIES.length);
    for (const d of [en, es] as Record<string, string>[]) {
      for (const s of CORAL_SPECIES) for (const k of ['name', 'tip']) expect(d[`cg.${s.id}.${k}`], `cg.${s.id}.${k}`).toBeTruthy();
      for (const c of CORAL_THREATS) for (const k of ['name', 'signs', 'do']) expect(d[`cd.${c}.${k}`], `cd.${c}.${k}`).toBeTruthy();
    }
  });
  it('the two Acropora are critically endangered', () => {
    expect(CORAL_SPECIES.filter((s) => s.status === 'CR').map((s) => s.id)).toEqual(['apal', 'acer', 'ssid', 'pstr', 'dlab', 'mmea', 'mill']);
    expect(CORAL_SPECIES.filter((s) => s.status === 'EN').map((s) => s.id)).toEqual(['ofav', 'oann']);
  });
});
