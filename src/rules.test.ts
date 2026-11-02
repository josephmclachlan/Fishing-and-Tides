import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';
import raw from '../public/data/zones/zones.geojson?raw';
import { NATIONAL_RULES, ZONE_RULES, rulesFor } from './rules';

const all = [...NATIONAL_RULES, ...Object.values(ZONE_RULES).flat()];

describe('rules', () => {
  it('has English text and an https source for every rule', () => {
    for (const r of all) {
      expect(`rule.${r.id}` in en).toBe(true);
      expect(r.source.url.startsWith('https://')).toBe(true);
    }
  });
  it('covers every drawn zone', () => {
    for (const f of JSON.parse(raw).features) expect(ZONE_RULES[f.properties.id]?.length).toBeGreaterThan(0);
  });
  it('lists national rules with or without a zone', () => {
    expect(rulesFor(null).here).toEqual([]);
    expect(rulesFor('cahuita').here.length).toBeGreaterThan(0);
    expect(rulesFor('cahuita').national).toBe(NATIONAL_RULES);
  });
  it('only marks a rule official when it is not a "check" item', () => {
    expect(ZONE_RULES.gandoca.every((r) => r.confidence === 'unconfirmed')).toBe(true);
  });
});
