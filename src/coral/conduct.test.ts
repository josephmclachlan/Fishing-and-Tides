import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { CORAL_CONTACTS, CORAL_ETIQUETTE, CORAL_RULES } from './conduct';

describe('coral rules and conduct', () => {
  it('every rule, tip and contact has EN and ES text', () => {
    for (const d of [en, es] as Record<string, string>[]) {
      for (const r of CORAL_RULES) expect(d[`crule.${r.id}`], `crule.${r.id}`).toBeTruthy();
      for (const id of CORAL_ETIQUETTE) expect(d[`cet.${id}`], `cet.${id}`).toBeTruthy();
      for (const c of CORAL_CONTACTS) expect(d[`ccon.${c.id}`], `ccon.${c.id}`).toBeTruthy();
    }
  });
  it('ids are unique and every rule links an https source', () => {
    expect(new Set(CORAL_RULES.map((r) => r.id)).size).toBe(CORAL_RULES.length);
    for (const r of CORAL_RULES) expect(r.source.url).toMatch(/^https:\/\//);
  });
});
