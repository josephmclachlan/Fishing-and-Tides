import { describe, expect, it, vi } from 'vitest';
import { ACTIVITIES, LAYERS, createLayerStore } from './registry';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('layer store', () => {
  it('starts with every layer on, as ALL', () => {
    const s = createLayerStore(mem());
    expect(LAYERS.every((l) => s.isOn(l.id))).toBe(true);
    expect(s.activity()).toBe('all');
  });

  it('applies a preset exactly', () => {
    const s = createLayerStore(mem());
    s.setActivity('surf');
    const surf = ACTIVITIES.find((a) => a.id === 'surf')!;
    expect(LAYERS.filter((l) => s.isOn(l.id)).map((l) => l.id).sort()).toEqual([...surf.layers].sort());
    expect(s.activity()).toBe('surf');
  });

  it('a manual toggle leaves the preset (custom), and restoring it re-detects it', () => {
    const s = createLayerStore(mem());
    s.setActivity('sail');
    s.toggle('rip');
    expect(s.activity()).toBeNull();
    s.toggle('rip');
    expect(s.activity()).toBe('sail');
  });

  it('only uses catalog ids in presets', () => {
    const ids = new Set(LAYERS.map((l) => l.id));
    for (const a of ACTIVITIES) for (const l of a.layers) expect(ids.has(l)).toBe(true);
  });

  it('persists, and ignores unknown ids or corrupt data', () => {
    const st = mem();
    const a = createLayerStore(st);
    a.setActivity('dive');
    expect(createLayerStore(st).activity()).toBe('dive');
    st.setItem('ft.layers.off', '["bogus","wind"]');
    const b = createLayerStore(st);
    expect(b.isOn('wind')).toBe(false);
    expect(b.isOn('waves')).toBe(true);
    st.setItem('ft.layers.off', '{not json');
    expect(createLayerStore(st).activity()).toBe('all');
  });

  it('works without storage', () => {
    const s = createLayerStore();
    s.toggle('wind');
    expect(s.isOn('wind')).toBe(false);
  });

  it('pushes visibility to registered layers, now and on change, until unregistered', () => {
    const s = createLayerStore(mem());
    s.setActivity('surf'); // fishing is off
    const setVisible = vi.fn();
    expect(s.isLive('fishing')).toBe(false);
    const off = s.register('fishing', { setVisible });
    expect(setVisible).toHaveBeenLastCalledWith(false);
    expect(s.isLive('fishing')).toBe(true);
    s.setActivity('fishing');
    expect(setVisible).toHaveBeenLastCalledWith(true);
    off();
    setVisible.mockClear();
    s.toggle('fishing');
    expect(setVisible).not.toHaveBeenCalled();
    expect(s.isLive('fishing')).toBe(false);
  });

  it('notifies subscribers', () => {
    const s = createLayerStore(mem());
    const fn = vi.fn();
    const un = s.subscribe(fn);
    s.toggle('wind');
    expect(fn).toHaveBeenCalledTimes(1);
    un();
    s.toggle('wind');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
