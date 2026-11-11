/**
 * The map's look. Since PLAN 7.70 there is one: MODERN, the Kinetic Plus map (src/kmap/), with a light and a dark
 * scheme (<html data-scheme>) shared with the FORECAST page (`ft.fcScheme`). RETRO (amber CRT) and NAVAL were removed
 * (Joseph 2026-11-11: build the Kinetic Plus map, scrap the retro map); a saved choice of either opens MODERN.
 * The old HUD's role colours (--amber, --green, --red...) are still defined, by src/kmap/tokens.css, for the
 * drawers and map layers kept from the old map.
 */
export const THEMES = ['modern'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = 'ft.theme';
export const DEFAULT_THEME: Theme = 'modern';

export const isTheme = (v: unknown): v is Theme => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/** The theme to open: always MODERN now; kept so a stored value never matters. */
export function storedTheme(_storage?: Pick<Storage, 'getItem'>): Theme {
  return DEFAULT_THEME;
}

export function currentTheme(): Theme {
  return DEFAULT_THEME;
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#EEF3F8');
}

/** A themed colour (a #rrggbb variable from style.css). */
export const themeColour = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** The FORECAST page's light or dark scheme, which the MODERN map shares (PLAN 7.70). */
export const SCHEME_KEY = 'ft.fcScheme';
export type Scheme = 'light' | 'dark';
export function storedScheme(storage: Pick<Storage, 'getItem'> | undefined, prefersDark: boolean): Scheme {
  try {
    const v = storage?.getItem(SCHEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* no storage */
  }
  return prefersDark ? 'dark' : 'light';
}
export function saveScheme(s: Scheme, storage: Pick<Storage, 'setItem'> | undefined) {
  try {
    storage?.setItem(SCHEME_KEY, s);
  } catch {
    /* private mode */
  }
}
export const currentScheme = (): Scheme => (typeof document !== 'undefined' && document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light');

try {
  applyTheme(storedTheme(window.localStorage));
  document.documentElement.dataset.scheme = storedScheme(window.localStorage, !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
} catch {
  /* no storage */
}
