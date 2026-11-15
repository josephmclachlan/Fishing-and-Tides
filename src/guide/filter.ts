/**
 * The SPECIES GUIDE's filters, search, sorting and grouping (PLAN 7.91). Pure functions over index rows (types.ts
 * `Entry`), so the list a reader sees for any filter is tested without a browser.
 */
import {
  GROUPS, SEEN, SUB_ORDER, SUB_WORDS, tx,
  type DangerKind, type Encounter, type Entry, type Group, type Habitat, type Lang, type Method, type Risk, type Seen, type Txt, type When,
} from './types';
import type { GdMode } from './route';

export type SortKey = 'seen' | 'name' | 'sci' | 'size';
export const SORTS: readonly SortKey[] = ['seen', 'name', 'sci', 'size'];
/** How the list is split into headed sections. `risk` (the danger list's own) splits by how it hurts. */
export type GroupBy = 'sub' | 'family' | 'genus' | 'order' | 'risk' | 'none';
export const GROUP_BYS: readonly GroupBy[] = ['sub', 'family', 'genus', 'order', 'risk', 'none'];

/** Size bands for the size filter, by the usual size (else the largest). */
export const SIZE_BANDS = ['xs', 's', 'm', 'l', 'xl'] as const;
export type SizeBand = (typeof SIZE_BANDS)[number];
/** Upper edge of each band in cm; the last has none. */
const SIZE_EDGES: Record<SizeBand, number> = { xs: 5, s: 20, m: 60, l: 200, xl: Infinity };

/** Status flags a reader can filter by. */
export const FLAGS = ['threatened', 'protected', 'introduced'] as const;
export type Flag = (typeof FLAGS)[number];

export interface GdFilter {
  q: string;
  encounter: Encounter[];
  habitats: Habitat[];
  seen: Seen[];
  times: When[];
  methods: Method[];
  sizes: SizeBand[];
  flags: Flag[];
  sort: SortKey;
  by: GroupBy;
  /** Show the "also recorded" rows (tiny, deep-sea or museum-only records). A search always finds them. */
  records: boolean;
}
export const DEFAULT_FILTER: GdFilter = {
  q: '', encounter: [], habitats: [], seen: [], times: [], methods: [], sizes: [], flags: [], sort: 'seen', by: 'sub', records: false,
};

/** How many filters are on (the phone's filter button shows it). Search, sort and grouping are not filters. */
export const activeCount = (f: GdFilter) =>
  f.encounter.length + f.habitats.length + f.seen.length + f.times.length + f.methods.length + f.sizes.length + f.flags.length + (f.records ? 1 : 0);

/** Lower case without accents, so "tiburon" finds "tiburón" and "Pargo" finds "pargo". */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Named = { en: string[]; es: string[]; sci: string };
/** The name a reader sees first: the first in their language, else the other language, else the Latin name. */
export const nameOf = (e: Named, lang: Lang) => (lang === 'es' ? e.es[0] ?? e.en[0] : e.en[0] ?? e.es[0]) ?? e.sci;
/** True when the entry has no common name, so the Latin name is its title. */
export const latinOnly = (e: Named) => !e.en.length && !e.es.length;

/** Food: eaten here or edible with care. */
export const isFood = (e: Pick<Entry, 'edible'>) => e.edible === 'yes' || e.edible === 'caution';
/** The ways a living animal or plant hurts people who meet or touch it. */
export const TOUCH_KINDS: readonly DangerKind[] = ['venom', 'sting', 'bite', 'spines', 'shock', 'skin-toxin', 'irritant', 'aggressive'];
/** The risks that come with eating it (spines are a handling risk, not an eating one). */
export const EAT_RISKS: readonly Risk[] = ['ciguatera', 'tetrodotoxin', 'scombroid', 'shellfish-poisoning', 'mercury', 'parasites', 'other'];
export const hurtsToTouch = (e: Pick<Entry, 'danger'>) => !!e.danger?.kinds.some((k) => TOUCH_KINDS.includes(k));
/** Poisonous to eat at all (pufferfish, toxic plants). */
export const poisonToEat = (e: Pick<Entry, 'edible' | 'danger'>) => e.edible === 'toxic' || !!e.danger?.kinds.includes('toxic-to-eat');
/** Eaten, but with a known risk (ciguatera in big reef fish, scombroid in badly kept tuna...). */
export const riskToEat = (e: Pick<Entry, 'edible' | 'risks'>) => isFood(e) && !!e.risks?.some((r) => EAT_RISKS.includes(r));
export const riskyToEat = (e: Pick<Entry, 'edible' | 'danger' | 'risks'>) => poisonToEat(e) || riskToEat(e);
export const isDanger = (e: Entry) => hurtsToTouch(e) || riskyToEat(e);

export function inMode(e: Entry, mode: GdMode): boolean {
  return mode === 'edible' ? isFood(e) : mode === 'danger' ? isDanger(e) : true;
}
export const inView = (e: Entry, mode: GdMode, group: Group | null) => (!group || e.group === group) && inMode(e, mode);

/** Everything a search looks in: every name, the Latin names and the family's and subgroup's names. */
export function haystack(e: Entry): string {
  const sub = SUB_WORDS[e.sub];
  return fold([...e.en, ...e.es, ...(e.local ?? []), e.sci, e.family ?? '', e.genus ?? '', e.order ?? '', e.familyName?.en ?? '', e.familyName?.es ?? '', sub?.en ?? '', sub?.es ?? ''].join(' · '));
}

const anyOf = <T>(want: readonly T[], have: readonly T[] | undefined) => !want.length || !!have?.some((h) => want.includes(h));

/** Length in cm whatever unit it was given in, so sizes sort together. */
export const toCm = (v: number, unit: 'cm' | 'mm' | 'm' | undefined) => (unit === 'mm' ? v / 10 : unit === 'm' ? v * 100 : v);
const maxCm = (e: Pick<Entry, 'size'>) => (e.size ? toCm(e.size.max ?? e.size.common ?? 0, e.size.unit) : 0);
/** The size a person usually meets: the usual size, else the largest. */
export const usualCm = (e: Pick<Entry, 'size'>) => (e.size ? toCm(e.size.common ?? e.size.max ?? NaN, e.size.unit) : NaN);
export function sizeBand(e: Pick<Entry, 'size'>): SizeBand | null {
  const cm = usualCm(e);
  if (!Number.isFinite(cm)) return null;
  return SIZE_BANDS.find((b) => cm < SIZE_EDGES[b]) ?? 'xl';
}

export function flagsOf(e: Entry): Flag[] {
  const out: Flag[] = [];
  if (e.iucn === 'CR' || e.iucn === 'EN' || e.iucn === 'VU') out.push('threatened');
  if (e.protectedCR || e.cites || e.edible === 'protected') out.push('protected');
  if (e.origin === 'introduced' || e.origin === 'invasive') out.push('introduced');
  return out;
}

/** Search words; every one must be found. */
export const words = (q: string) => fold(q).split(/\s+/).filter(Boolean);

export function matches(e: Entry, f: GdFilter, hay: string = haystack(e)): boolean {
  const ws = words(f.q);
  if (e.tier === 'list' && !f.records && !ws.length) return false;
  if (ws.length && !ws.every((w) => hay.includes(w))) return false;
  if (!anyOf(f.encounter, e.encounter)) return false;
  if (!anyOf(f.habitats, e.habitats)) return false;
  if (f.seen.length && !(e.seen && f.seen.includes(e.seen))) return false;
  if (!anyOf(f.times, [...(e.seenAt ?? []), ...(e.feedsAt ?? [])])) return false;
  if (!anyOf(f.methods, e.methods)) return false;
  if (f.sizes.length) {
    const b = sizeBand(e);
    if (!b || !f.sizes.includes(b)) return false;
  }
  if (f.flags.length && !f.flags.some((x) => flagsOf(e).includes(x))) return false;
  return true;
}

const seenRank = (e: Entry) => (e.seen ? SEEN.indexOf(e.seen) : SEEN.length);

export function sortEntries(list: readonly Entry[], sort: SortKey, lang: Lang): Entry[] {
  const byName = (a: Entry, b: Entry) => nameOf(a, lang).localeCompare(nameOf(b, lang), lang) || a.sci.localeCompare(b.sci);
  const cmp =
    sort === 'name' ? byName
    : sort === 'sci' ? (a: Entry, b: Entry) => a.sci.localeCompare(b.sci)
    : sort === 'size' ? (a: Entry, b: Entry) => maxCm(b) - maxCm(a) || byName(a, b)
    : (a: Entry, b: Entry) => seenRank(a) - seenRank(b) || byName(a, b);
  // Full profiles before the one-line records in any order.
  return [...list].sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'full' ? -1 : 1) || cmp(a, b));
}

export interface Section {
  key: string;
  /** The group it belongs to, or null for a section across groups (no grouping, the danger list's risks). */
  group: Group | null;
  /** The heading in the reader's language (a Latin name for genus and order). */
  title: string;
  /** A second line: the Latin family under a friendly name, or the family's common name under a genus. */
  sub?: string;
  /** The title is a Latin name (set in italics for a genus). */
  latin?: boolean;
  /** The second line is Latin (family names). */
  subLatin?: boolean;
  /** The danger list's sections carry a level for their colour: 3 can kill, 2 serious, 1 painful. */
  level?: 1 | 2 | 3;
  items: Entry[];
}

const rank = (list: readonly string[], v: string | undefined) => {
  const i = v === undefined ? -1 : list.indexOf(v);
  return i < 0 ? list.length : i;
};

/** The danger list's sections, worst first; one species can be in a touch section and an eating one. */
export const RISK_SECTIONS = ['touch-3', 'touch-2', 'touch-1', 'eat-poison', 'eat-risk'] as const;
export type RiskSection = (typeof RISK_SECTIONS)[number];
export const RISK_SECTION_WORDS: Record<RiskSection, Txt> = {
  'touch-3': { en: 'Venomous: can kill', es: 'Venenosos: pueden matar' },
  'touch-2': { en: 'Venomous, stinging or biting: see a doctor', es: 'Venenosos, urticantes o que muerden: vaya al médico' },
  'touch-1': { en: 'Painful to touch', es: 'Dolorosos al tocar' },
  'eat-poison': { en: 'Poisonous to eat', es: 'Venenosos al comer' },
  'eat-risk': { en: 'Eaten, with a risk', es: 'Se comen, con riesgo' },
};
const touchLevel = (e: Entry): 1 | 2 | 3 => e.danger?.level ?? 1;

function riskSections(list: readonly Entry[], sort: SortKey, lang: Lang): Section[] {
  const out: Section[] = [];
  const add = (key: RiskSection, items: Entry[], level?: 1 | 2 | 3) =>
    items.length && out.push({ key, group: null, title: tx(RISK_SECTION_WORDS[key], lang), level, items: sortEntries(items, sort, lang) });
  for (const lv of [3, 2, 1] as const) add(`touch-${lv}`, list.filter((e) => hurtsToTouch(e) && touchLevel(e) === lv), lv);
  add('eat-poison', list.filter(poisonToEat), 3);
  add('eat-risk', list.filter((e) => !poisonToEat(e) && riskToEat(e)), 2);
  return out;
}

/** Split a list into headed sections: by subgroup (the default), family, genus, order or risk, or one section. */
export function sections(list: readonly Entry[], by: GroupBy, sort: SortKey, lang: Lang): Section[] {
  if (by === 'risk') return riskSections(list, sort, lang);
  if (by === 'none') return list.length ? [{ key: 'all', group: null, title: '', items: sortEntries(list, sort, lang) }] : [];
  const keyOf = (e: Entry) =>
    by === 'sub' ? `${e.group}/${e.sub}` : by === 'family' ? `${e.group}/${e.family ?? '?'}` : by === 'genus' ? `${e.group}/${e.genus ?? '?'}` : `${e.group}/${e.order ?? '?'}`;
  const map = new Map<string, Entry[]>();
  for (const e of list) {
    const k = keyOf(e);
    const a = map.get(k);
    if (a) a.push(e);
    else map.set(k, [e]);
  }
  const out: Section[] = [];
  for (const [key, items] of map) {
    const e = items[0];
    const families = [...new Set(items.map((x) => x.family).filter(Boolean))] as string[];
    let title: string, sub: string | undefined, latin = false, subLatin = true;
    if (by === 'sub') (title = tx(SUB_WORDS[e.sub], lang) || e.sub), (sub = families.join(', '));
    else if (by === 'family') (title = tx(e.familyName, lang) || e.family || '?'), (sub = e.familyName ? e.family : undefined), (latin = !e.familyName);
    else if (by === 'genus') (title = e.genus ?? '?'), (sub = tx(e.familyName, lang) || e.family), (latin = true), (subLatin = !e.familyName);
    else (title = e.order ?? '?'), (sub = families.join(', ')), (latin = true);
    out.push({ key, group: e.group, title, sub: sub || undefined, latin, subLatin, items: sortEntries(items, sort, lang) });
  }
  return out.sort(
    (a, b) =>
      rank(GROUPS, a.group ?? undefined) - rank(GROUPS, b.group ?? undefined) ||
      (by === 'sub' ? rank(SUB_ORDER, a.items[0].sub) - rank(SUB_ORDER, b.items[0].sub) : a.title.localeCompare(b.title, lang)),
  );
}

/** Counts per group for the group strip, under the current mode and filters (not the chosen group). */
export function groupCounts(list: readonly Entry[], f: GdFilter, mode: GdMode, hays?: Map<string, string>): Record<Group, number> {
  const out = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<Group, number>;
  for (const e of list) if (inMode(e, mode) && matches(e, f, hays?.get(e.id))) out[e.group]++;
  return out;
}

/** Counts per mode for the main tabs, under the current group and filters. */
export function modeCounts(list: readonly Entry[], f: GdFilter, group: Group | null, hays?: Map<string, string>): Record<GdMode, number> {
  const out: Record<GdMode, number> = { all: 0, identify: 0, edible: 0, danger: 0, saved: 0 };
  for (const e of list) {
    if ((group && e.group !== group) || !matches(e, f, hays?.get(e.id))) continue;
    out.all++;
    if (isFood(e)) out.edible++;
    if (isDanger(e)) out.danger++;
  }
  return out;
}
