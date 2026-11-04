/**
 * The CORAL overlay switch (PLAN 7.31). Separate from the activity presets: turning it on saves the
 * layers that were on and shows CORAL_VIEW plus the coral heat marks; turning it off puts the saved
 * layers back. State survives a reload. Pure apart from the storage it is given.
 */
import { CORAL_VIEW, type LayerStore } from './layers/registry';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.coral';
const PREV = 'ft.coral.prev';

export interface CoralMode {
  isOn(): boolean;
  set(on: boolean): void;
  toggle(): void;
  subscribe(fn: (on: boolean) => void): () => void;
}

export function createCoralMode(store: LayerStore, storage?: Storage): CoralMode {
  const read = (k: string) => {
    try {
      return storage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  };
  const write = (k: string, v: string) => {
    try {
      storage?.setItem(k, v);
    } catch {
      /* private mode: no persistence */
    }
  };
  let on = read(KEY) === '1';
  const listeners = new Set<(on: boolean) => void>();
  const set = (v: boolean) => {
    if (v === on) return;
    if (v) {
      write(PREV, JSON.stringify(store.onIds()));
      store.setOn(CORAL_VIEW);
    } else {
      let prev: unknown = null;
      try {
        prev = JSON.parse(read(PREV) ?? 'null');
      } catch {
        /* corrupt: fall back to everything */
      }
      if (Array.isArray(prev)) store.setOn(prev.filter((x): x is string => typeof x === 'string'));
      else store.setActivity('all');
    }
    on = v;
    write(KEY, v ? '1' : '0');
    listeners.forEach((fn) => fn(on));
  };
  return {
    isOn: () => on,
    set,
    toggle: () => set(!on),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
