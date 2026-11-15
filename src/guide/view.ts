/**
 * Numbers and short phrases for the SPECIES GUIDE (PLAN 7.91): sizes, depths, weights and times written the way a
 * reader in the water says them. Pure, in both languages.
 */
import { MEASURE_WORDS, tx, type Depth, type Lang, type Size, type Species, type When } from './types';
import { toCm } from './filter';

const L = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en);
const r1 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

/** A length given in cm, in the unit that reads best: mm under 1 cm, m from 2 m. */
export function lengthText(cm: number): string {
  if (!Number.isFinite(cm)) return '--';
  if (cm < 1) return `${r1(cm * 10)} mm`;
  if (cm >= 200) return `${r1(cm / 100)} m`;
  return `${cm < 10 ? r1(cm) : Math.round(cm)} cm`;
}

/** The headline size: the usual size, else the largest. */
export function sizeMain(s: Size | undefined): string {
  if (!s) return '--';
  const v = s.common ?? s.max;
  return v === undefined ? '--' : lengthText(toCm(v, s.unit));
}

/** "Up to 79 cm fork length" (with what was measured), or "" with no maximum. */
export function sizeMax(s: Size | undefined, lang: Lang): string {
  if (!s || s.max === undefined) return '';
  const m = s.measure ? ` ${tx(MEASURE_WORDS[s.measure], lang)}` : '';
  return L(lang, `Up to ${lengthText(toCm(s.max, s.unit))}${m}`, `Hasta ${lengthText(toCm(s.max, s.unit))}${m}`);
}

/** "2 to 20 m", "Surface to 20 m" or "Shore" for things met at the waterline. */
export function bandText(lo: number | undefined, hi: number | undefined, lang: Lang): string {
  const a = lo ?? 0, b = hi ?? a;
  if (b <= 0) return L(lang, 'Shore and surface', 'Orilla y superficie');
  if (a <= 0) return L(lang, `Surface to ${r1(b)} m`, `Superficie a ${r1(b)} m`);
  return a === b ? `${r1(a)} m` : L(lang, `${r1(a)} to ${r1(b)} m`, `${r1(a)} a ${r1(b)} m`);
}

/** The usual depth band and, when it differs, the full range. */
export function depthLines(d: Depth | undefined, lang: Lang): { main: string; range: string } {
  if (!d) return { main: '--', range: '' };
  const hasUsual = d.usualMin !== undefined || d.usualMax !== undefined;
  const main = hasUsual ? bandText(d.usualMin, d.usualMax, lang) : bandText(d.min, d.max, lang);
  const range = hasUsual && (d.min !== d.usualMin || d.max !== d.usualMax) && (d.min !== undefined || d.max !== undefined) ? L(lang, `Range ${bandText(d.min, d.max, lang).toLowerCase()}`, `Rango ${bandText(d.min, d.max, lang).toLowerCase()}`) : '';
  return { main, range };
}

/** "Up to 10.8 kg" (grams under 1 kg), or "" with no weight. */
export function weightText(w: Species['weight'], lang: Lang): string {
  if (!w) return '';
  const kg = (v: number) => (w.unit === 'g' ? v / 1000 : v);
  const fmt = (v: number) => (kg(v) < 1 ? `${Math.round(kg(v) * 1000)} g` : `${r1(kg(v))} kg`);
  if (w.max !== undefined && w.common !== undefined) return L(lang, `Usually ${fmt(w.common)}, up to ${fmt(w.max)}`, `Por lo general ${fmt(w.common)}, hasta ${fmt(w.max)}`);
  if (w.max !== undefined) return L(lang, `Up to ${fmt(w.max)}`, `Hasta ${fmt(w.max)}`);
  return w.common !== undefined ? fmt(w.common) : '';
}

/** "Day, dawn, dusk and night" from a set of times, in the day's order (twilight is dawn and dusk). */
export function timesText(ts: readonly When[] | undefined, lang: Lang): string {
  if (!ts?.length) return '';
  const words: string[] = [];
  if (ts.includes('day')) words.push(L(lang, 'day', 'día'));
  if (ts.includes('twilight')) words.push(L(lang, 'dawn', 'amanecer'), L(lang, 'dusk', 'atardecer'));
  if (ts.includes('night')) words.push(L(lang, 'night', 'noche'));
  const s = words.length > 1 ? `${words.slice(0, -1).join(', ')} ${L(lang, 'and', 'y')} ${words.at(-1)}` : words[0];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Table quality as five pips, filled to the score. */
export const pips = (q: number | undefined) => (q ? `${'●'.repeat(Math.max(0, Math.min(5, Math.round(q))))}${'○'.repeat(5 - Math.max(0, Math.min(5, Math.round(q))))}` : '');
