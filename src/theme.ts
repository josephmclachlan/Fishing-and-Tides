/**
 * Colour themes. A theme is a set of CSS variables on <html data-theme="..."> (src/style.css) plus
 * the map palette read from the same variables (src/map.ts), so every layer follows the theme.
 * Switching reloads the page: canvas and map layers read the variables once, when they are built.
 */
export const THEMES = ['retro', 'naval', 'modern'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = 'ft.theme';
export const DEFAULT_THEME: Theme = 'retro';

export const isTheme = (v: unknown): v is Theme => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/** The next theme in the cycle. */
export const nextTheme = (t: Theme): Theme => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]!;

export function storedTheme(storage: Pick<Storage, 'getItem'> | undefined): Theme {
  try {
    const v = storage?.getItem(THEME_KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function currentTheme(): Theme {
  const v = typeof document === 'undefined' ? undefined : document.documentElement.dataset.theme;
  return isTheme(v) ? v : DEFAULT_THEME;
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#050805');
}

export function saveTheme(t: Theme, storage: Pick<Storage, 'setItem'> | undefined) {
  try {
    storage?.setItem(THEME_KEY, t);
  } catch {
    /* private mode: the choice lasts until reload */
  }
}

/** A themed colour (a #rrggbb variable from style.css). */
export const themeColour = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

try {
  applyTheme(storedTheme(window.localStorage));
} catch {
  /* no storage */
}
