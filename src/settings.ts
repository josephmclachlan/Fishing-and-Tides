/**
 * Device settings (PLAN 1.9), remembered in localStorage. Pure apart from the storage it is given.
 * Stored as the value that differs from the default, so a corrupt or blocked store just means defaults.
 */
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.enhance';

export interface Settings {
  /** ENHANCE fly-to effect (satellite zoom). Default on. */
  enhance(): boolean;
  setEnhance(on: boolean): void;
  subscribe(fn: () => void): () => void;
}

export function createSettings(storage?: Storage): Settings {
  let enhance = true;
  try {
    enhance = storage?.getItem(KEY) !== 'off';
  } catch {
    /* storage blocked: defaults */
  }
  const subs = new Set<() => void>();
  return {
    enhance: () => enhance,
    setEnhance(on) {
      if (on === enhance) return;
      enhance = on;
      try {
        storage?.setItem(KEY, on ? 'on' : 'off');
      } catch {
        /* private mode: keep going without persistence */
      }
      subs.forEach((fn) => fn());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
