import { describe, expect, it } from 'vitest';
import { createLayerStore, CORAL_VIEW } from './layers/registry';
import { createCoralMode } from './coral-mode';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('CORAL overlay switch', () => {
  it('shows the coral view, then puts the previous layers back', () => {
    const s = mem();
    const store = createLayerStore(s);
    store.setActivity('surf');
    const before = store.onIds();
    const coral = createCoralMode(store, s);
    const seen: boolean[] = [];
    coral.subscribe((on) => seen.push(on));
    coral.toggle();
    expect(coral.isOn()).toBe(true);
    expect(store.onIds().sort()).toEqual([...CORAL_VIEW].sort());
    expect(store.activity()).toBeNull(); // not an activity preset
    coral.toggle();
    expect(store.onIds()).toEqual(before);
    expect(store.activity()).toBe('surf');
    expect(seen).toEqual([true, false]);
  });

  it('remembers it was on across a reload, and setting the same state does nothing', () => {
    const s = mem();
    const store = createLayerStore(s);
    createCoralMode(store, s).set(true);
    const again = createCoralMode(createLayerStore(s), s);
    expect(again.isOn()).toBe(true);
    let calls = 0;
    again.subscribe(() => calls++);
    again.set(true);
    expect(calls).toBe(0);
  });

  it('falls back to all layers if the saved view is missing or corrupt', () => {
    const s = mem();
    const store = createLayerStore(s);
    s.setItem('ft.coral', '1');
    s.setItem('ft.coral.prev', '{bad');
    const coral = createCoralMode(store, s);
    store.setOn(['reefs']);
    coral.set(false);
    expect(store.activity()).toBe('all');
  });
});
