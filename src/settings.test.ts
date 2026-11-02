import { describe, expect, it, vi } from 'vitest';
import { createSettings } from './settings';

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
