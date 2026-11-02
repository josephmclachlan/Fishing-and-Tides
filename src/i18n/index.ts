/** Translation lookup (PLAN 1.10). New UI text goes through `t`, never a hard-coded string. */
import { en, type Dict, type Key } from './en';

export type { Dict, Key };

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
