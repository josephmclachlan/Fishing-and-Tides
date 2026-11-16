/**
 * The guide's index (PLAN 7.91): one compact row per species, built from the researched species files so the list,
 * the filters and search load in one small file and a species' full page loads only when it is opened.
 * Pure: `npm run data:guide` (scripts/guide-index.ts) reads the files and writes public/data/guide/index.json,
 * and index.test.ts checks the committed index still matches the species files.
 */
import { GROUPS, SUB_ORDER, type Entry, type GuideIndex, type Species } from './types';

const nonEmpty = <T>(a: T[] | undefined): T[] | undefined => (a && a.length ? a : undefined);

/** The depth band where people here meet it: the usual band when there is one, else the full range. */
export function depthBand(d: Species['depth']): [number, number] | undefined {
  if (!d) return undefined;
  const lo = d.usualMin ?? d.min, hi = d.usualMax ?? d.max;
  if (typeof lo !== 'number' && typeof hi !== 'number') return undefined;
  return [lo ?? 0, hi ?? lo ?? 0];
}

export function toEntry(s: Species, thumb?: string): Entry {
  const e: Entry = {
    id: s.id,
    tier: s.tier,
    sci: s.sci,
    group: s.group,
    sub: s.sub,
    order: s.taxon?.order,
    family: s.taxon?.family,
    genus: s.taxon?.genus,
    familyName: s.familyName,
    en: s.names?.en ?? [],
    es: s.names?.es ?? [],
    local: nonEmpty(s.names?.local),
    seen: s.seen,
    size: s.size,
    depth: depthBand(s.depth),
    habitats: nonEmpty(s.habitats),
    encounter: nonEmpty(s.encounter),
    seenAt: nonEmpty(s.seenAt),
    feedsAt: nonEmpty(s.feedsAt),
    look: s.look,
    illegal: s.eat?.illegal || undefined,
    rec: s.rec,
    edible: s.edible,
    quality: s.eat?.quality,
    methods: nonEmpty(s.eat?.methods),
    risks: nonEmpty(s.eat?.risks),
    clean: s.eat?.clean,
    danger: s.danger ? { kinds: s.danger.kinds, level: s.danger.level } : undefined,
    iucn: s.status?.iucn,
    origin: s.status?.origin,
    protectedCR: s.status?.protectedCR || undefined,
    cites: s.status?.cites,
    thumb,
    note: s.tier === 'list' ? s.note : undefined,
  };
  // Leave out what is not there, so the file stays small.
  for (const k of Object.keys(e) as (keyof Entry)[]) if (e[k] === undefined) delete e[k];
  return e;
}

const rank = (list: readonly string[], v: string | undefined) => {
  const i = v === undefined ? -1 : list.indexOf(v);
  return i < 0 ? list.length : i;
};

/** Group, then subgroup, then family and name, so the file reads like the guide. */
export function entryOrder(a: Entry, b: Entry): number {
  return (
    rank(GROUPS, a.group) - rank(GROUPS, b.group) ||
    rank(SUB_ORDER, a.sub) - rank(SUB_ORDER, b.sub) ||
    (a.family ?? '').localeCompare(b.family ?? '') ||
    a.sci.localeCompare(b.sci)
  );
}

export function buildIndex(list: readonly Species[], builtAt: number, thumbOf: (id: string) => string | undefined = () => undefined): GuideIndex {
  const entries = list.filter((s) => s.tier === 'full' || s.tier === 'list').map((s) => toEntry(s, thumbOf(s.id))).sort(entryOrder);
  return { builtAt, count: entries.length, entries };
}
