/**
 * Device settings (PLAN 1.9, 5.6), remembered in localStorage. Pure apart from the storage it is given.
 * Stored only once the user changes a value, so a corrupt or blocked store (or a first run) just means
 * defaults: ENHANCE on, and the browser's language.
 */
import { isLang, pickLang, type Lang } from './i18n';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.enhance';
const LANG_KEY = 'ft.lang';
const SUN_KEY = 'ft.sun';
const VIEW_KEY = 'ft.view';

export interface Settings {
  /** ENHANCE fly-to effect (satellite zoom). Default on. */
  enhance(): boolean;
  setEnhance(on: boolean): void;
  /** UI language: the saved choice, else the browser's (es* gives Spanish), else English. */
  lang(): Lang;
  setLang(lang: Lang): void;
  /** Sunlight mode: stronger contrast, no scanlines or glow. Follows the device's high-contrast setting until the user chooses. */
  sun(): boolean;
  setSun(on: boolean): void;
  subscribe(fn: () => void): () => void;
}

export function createSettings(storage?: Storage, browserLangs: readonly string[] = [], prefersContrast = false): Settings {
  let enhance = true;
  let stored: string | null = null;
  let storedSun: string | null = null;
  try {
    enhance = storage?.getItem(KEY) !== 'off';
    stored = storage?.getItem(LANG_KEY) ?? null;
    storedSun = storage?.getItem(SUN_KEY) ?? null;
  } catch {
    /* storage blocked: defaults */
  }
  let lang = pickLang(stored, browserLangs);
  let sun = storedSun === 'on' ? true : storedSun === 'off' ? false : prefersContrast;
  const subs = new Set<() => void>();
  const save = (key: string, value: string) => {
    try {
      storage?.setItem(key, value);
    } catch {
      /* private mode: keep going without persistence */
    }
  };
  return {
    enhance: () => enhance,
    setEnhance(on) {
      if (on === enhance) return;
      enhance = on;
      save(KEY, on ? 'on' : 'off');
      subs.forEach((fn) => fn());
    },
    lang: () => lang,
    setLang(next) {
      if (!isLang(next) || next === lang) return;
      lang = next;
      save(LANG_KEY, next);
      subs.forEach((fn) => fn());
    },
    sun: () => sun,
    setSun(on) {
      if (on === sun) return;
      sun = on;
      save(SUN_KEY, on ? 'on' : 'off');
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

export function safeSession(): globalThis.Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Map camera kept across the reload a language change needs, in sessionStorage. */
export interface View {
  center: [number, number];
  zoom: number;
}
export function saveView(storage: Pick<globalThis.Storage, 'setItem'> | undefined, view: View) {
  try {
    storage?.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* nothing to restore, the map just starts at the default view */
  }
}
/** The saved view, once: it is cleared as it is read. */
export function takeView(storage: Pick<globalThis.Storage, 'getItem' | 'removeItem'> | undefined): View | null {
  try {
    const raw = storage?.getItem(VIEW_KEY);
    if (!raw) return null;
    storage?.removeItem(VIEW_KEY);
    const v = JSON.parse(raw) as View;
    const ok = Array.isArray(v.center) && v.center.length === 2 && v.center.every(Number.isFinite) && Number.isFinite(v.zoom);
    return ok ? v : null;
  } catch {
    return null;
  }
}
