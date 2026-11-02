import { describe, expect, it, vi } from 'vitest';
import { createSettings, saveView, takeView } from './settings';

const mem = (init: Record<string, string> = {}) => {
  const m = { ...init };
  return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v), m };
};

describe('settings', () => {
  it('defaults enhance on', () => {
    expect(createSettings(mem()).enhance()).toBe(true);
    expect(createSettings().enhance()).toBe(true);
  });
  it('persists and restores', () => {
    const s = mem();
    createSettings(s).setEnhance(false);
    expect(createSettings(s).enhance()).toBe(false);
    const again = createSettings(s);
    again.setEnhance(true);
    expect(createSettings(s).enhance()).toBe(true);
  });
  it('notifies only on change', () => {
    const st = createSettings(mem());
    const fn = vi.fn();
    st.subscribe(fn);
    st.setEnhance(true);
    st.setEnhance(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('survives blocked storage', () => {
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const st = createSettings(bad);
    expect(st.enhance()).toBe(true);
    st.setEnhance(false);
    expect(st.enhance()).toBe(false);
  });
});

describe('language setting', () => {
  it('follows the browser until the user chooses, then remembers the choice', () => {
    const s = mem();
    expect(createSettings(s, ['es-CR']).lang()).toBe('es');
    expect(s.m['ft.lang']).toBeUndefined();
    const a = createSettings(s, ['es-CR']);
    a.setLang('en');
    expect(createSettings(s, ['es-CR']).lang()).toBe('en');
  });
  it('defaults to English and ignores bad stored values', () => {
    expect(createSettings(mem(), []).lang()).toBe('en');
    expect(createSettings(mem({ 'ft.lang': 'zz' }), ['en']).lang()).toBe('en');
    expect(createSettings(mem({ 'ft.lang': 'zz' }), ['es']).lang()).toBe('es');
  });
  it('notifies on change only', () => {
    const s = createSettings(mem(), []);
    const fn = vi.fn();
    s.subscribe(fn);
    s.setLang('en');
    s.setLang('es');
    s.setLang('es');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('view carried across a language reload', () => {
  const store = () => {
    const m: Record<string, string> = {};
    return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v), removeItem: (k: string) => void delete m[k] };
  };
  it('is read once, then gone', () => {
    const s = store();
    saveView(s, { center: [-82.8, 9.7], zoom: 11.5 });
    expect(takeView(s)).toEqual({ center: [-82.8, 9.7], zoom: 11.5 });
    expect(takeView(s)).toBeNull();
  });
  it('ignores junk and missing storage', () => {
    const s = store();
    s.setItem('ft.view', '{"center":[1],"zoom":"x"}');
    expect(takeView(s)).toBeNull();
    expect(takeView(undefined)).toBeNull();
  });
});
