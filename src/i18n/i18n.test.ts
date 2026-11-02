import { describe, expect, it } from 'vitest';
import { en } from './en';
import { setDict, t, type Dict } from './index';
import { ACTIVITIES, LAYERS } from '../layers/registry';
import { BANDS } from '../time';

describe('t', () => {
  it('looks up and fills placeholders', () => {
    expect(t('time.now')).toBe('NOW');
    expect(t('fx.sector', { n: 2, total: 4 })).toBe('SECTOR 2/4');
  });
  it('leaves unknown placeholders alone', () => {
    expect(t('fx.sector', { n: 1 })).toBe('SECTOR 1/{total}');
  });
  it('uses the active dictionary and falls back to English for gaps', () => {
    setDict({ ...en, 'time.now': 'AHORA' } as Dict);
    expect(t('time.now')).toBe('AHORA');
    setDict({} as Dict);
    expect(t('time.now')).toBe('NOW');
    setDict(en);
  });
});

describe('catalog keys', () => {
  it('has text for every layer, group, activity and band', () => {
    for (const l of LAYERS) {
      expect(`layer.${l.id}` in en).toBe(true);
      expect(`group.${l.group}` in en).toBe(true);
    }
    for (const a of ACTIVITIES) expect(`activity.${a.id}` in en).toBe(true);
    for (const b of BANDS) expect(`band.${b.id}` in en).toBe(true);
  });
});
