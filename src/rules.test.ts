import { describe, expect, it } from 'vitest';
import { en } from './i18n/en';
import raw from '../public/data/zones/zones.geojson?raw';
import { NATIONAL_RULES, ZONE_RULES, rulesFor, spearStatus } from './rules';

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

describe('spearStatus', () => {
  const zone = (id: string, iucn: string, status: 'closed' | 'restricted' = 'restricted') => ({ id, iucn, status, ref: '' });
  it('is OK outside any zone', () => expect(spearStatus(null)).toBe('ok'));
  it('bans spearing in a national park and in closed water', () => {
    expect(spearStatus(zone('cahuita', '2'))).toBe('banned');
    expect(spearStatus(zone('x', '4', 'closed'))).toBe('banned');
  });
  it('says CHECK for a refuge with no marine rule found', () => {
    expect(spearStatus(zone('gandoca', '4'))).toBe('check');
    expect(spearStatus(zone('limoncito', '4'))).toBe('check');
  });
});
