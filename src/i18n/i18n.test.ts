import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';
import { dictFor, hemispheres, pickLang, setDict, t, type Dict } from './index';
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

describe('Spanish', () => {
  const keys = Object.keys(en);
  it('has every key, no extras and no empty text', () => {
    expect(Object.keys(es).sort()).toEqual([...keys].sort());
    for (const k of keys) expect(es[k as keyof Dict].trim(), k).not.toBe('');
  });
  it('keeps the same {placeholders} as English', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of keys) expect(ph(es[k as keyof Dict]), k).toEqual(ph(en[k as keyof Dict]));
  });
  it('translates a few HUD words and uses O for west', () => {
    setDict(dictFor('es'));
    expect(t('time.now')).toBe('AHORA');
    expect(t('fish.snook')).toBe('ROBALO');
    expect(hemispheres()).toEqual({ N: 'N', S: 'S', E: 'E', W: 'O' });
    setDict(en);
    expect(hemispheres().W).toBe('W');
  });
});

describe('pickLang', () => {
  it('prefers the saved choice', () => {
    expect(pickLang('en', ['es-CR'])).toBe('en');
    expect(pickLang('es', ['en-US'])).toBe('es');
  });
  it('follows the browser on a first run, first supported language wins', () => {
    expect(pickLang(null, ['es-CR', 'en'])).toBe('es');
    expect(pickLang(undefined, ['fr-FR', 'ES-419'])).toBe('es');
    expect(pickLang(null, ['en-GB'])).toBe('en');
  });
  it('falls back to English for anything else', () => {
    expect(pickLang(null, ['fr', 'de'])).toBe('en');
    expect(pickLang('xx', [])).toBe('en');
    expect(pickLang(null)).toBe('en');
  });
});
