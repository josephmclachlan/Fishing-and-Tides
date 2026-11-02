/** Translation lookup (PLAN 1.10). New UI text goes through `t`, never a hard-coded string. */
import { en, type Dict, type Key } from './en';
import { es } from './es';

export type { Dict, Key };

export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];
const DICTS: Record<Lang, Dict> = { en, es };
export const dictFor = (lang: Lang): Dict => DICTS[lang];
export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'es';

/**
 * Language to start in: the one chosen on this device, else the first browser language we
 * have text for (es, es-CR, es-419 all give Spanish), else English.
 */
export function pickLang(stored: string | null | undefined, browser: readonly string[] = []): Lang {
  if (isLang(stored)) return stored;
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

let dict: Dict = en;

/** Swap the active language (used by the EN/ESP toggle, PLAN 5.6). */
export function setDict(next: Dict) {
  dict = next;
}

/** Text for `key`, with `{name}` placeholders filled from `vars`. Falls back to English. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const s = dict[key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** N/S/E/W letters in the active language, for GPS coordinates (src/geo.ts toDDM). */
export const hemispheres = () => ({ N: t('hemi.N'), S: t('hemi.S'), E: t('hemi.E'), W: t('hemi.W') });
