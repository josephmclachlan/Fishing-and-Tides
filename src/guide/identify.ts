/**
 * IDENTIFY (PLAN 7.92): what did I just see? A few quick questions (animal or plant, group, size, colours and
 * markings, where it was) narrow the guide to a ranked list of likely species. Pure, so it is tested without a DOM.
 *
 * Group and kind are hard limits; everything else only scores, because colours and sizes seen in the water are
 * rough and some species are not described yet: a near miss drops down the list instead of vanishing.
 */
import { SIZE_BANDS, sizeBand, type SizeBand } from './filter';
import { GROUPS, type Color, type Entry, type Group, type Habitat, type Look, type Pattern, type Position } from './types';

export type IdKind = 'animal' | 'plant';
export interface IdAnswers {
  kind?: IdKind;
  group?: Group;
  sub?: string;
  size?: SizeBand;
  colors: Color[];
  pattern: Pattern[];
  position: Position[];
  night?: boolean;
}
export const NO_ANSWERS: IdAnswers = { colors: [], pattern: [], position: [] };

export const ID_STEPS = ['kind', 'group', 'sub', 'size', 'look', 'where', 'results'] as const;
export type IdStep = (typeof ID_STEPS)[number];

export const groupsOf = (k: IdKind | undefined): Group[] =>
  k === 'plant' ? ['plants-algae'] : GROUPS.filter((g) => g !== 'plants-algae');

/** The subgroups worth asking about in a group: only when there are a few (sharks or rays; turtle, dolphin or manatee). */
export function subsOf(list: readonly Entry[], group: Group | undefined, max = 8): string[] {
  if (!group) return [];
  const subs = new Map<string, number>();
  for (const e of list) if (e.group === group && e.tier === 'full') subs.set(e.sub, (subs.get(e.sub) ?? 0) + 1);
  return subs.size >= 2 && subs.size <= max ? [...subs.keys()] : [];
}

/** The steps that apply to these answers (plants skip the group; a group without a few subgroups skips that). */
export function stepsFor(list: readonly Entry[], a: IdAnswers): IdStep[] {
  return ID_STEPS.filter((s) => (s === 'group' ? a.kind !== 'plant' : s === 'sub' ? subsOf(list, a.kind === 'plant' ? 'plants-algae' : a.group).length > 0 : true));
}

const LIGHT: readonly Color[] = ['white', 'grey', 'silver'];
const SEEN_BONUS: Record<string, number> = { common: 1.5, frequent: 1, occasional: 0.5, rare: 0, records: -1 };

/** How well a species fits the answers (higher is better), or null when it cannot be it. */
export function idScore(e: Entry, a: IdAnswers): number | null {
  if (a.kind === 'plant' && e.group !== 'plants-algae') return null;
  if (a.kind === 'animal' && e.group === 'plants-algae') return null;
  if (a.group && e.group !== a.group) return null;
  if (a.sub && e.sub !== a.sub) return null;
  // Ties go to what people most often meet and catch (Joseph 2026-11-15): seen often, met in the water or on the
  // shore, eaten.
  let s = (e.seen ? SEEN_BONUS[e.seen] ?? 0 : 0) + (e.tier === 'list' ? -2 : 0) + (e.edible === 'yes' || e.edible === 'caution' ? 0.5 : 0) +
    (e.encounter?.some((x) => x !== 'boat-fishing') ? 0.5 : 0);
  if (a.size) {
    const b = sizeBand(e);
    if (b) {
      const d = Math.abs(SIZE_BANDS.indexOf(b) - SIZE_BANDS.indexOf(a.size));
      s += d === 0 ? 3 : d === 1 ? 1 : -3;
    }
  }
  const look = e.look;
  if (look) {
    const w = look.guessed ? 0.6 : 1;
    if (a.colors.length) {
      const has = new Set([...look.colors, ...(look.juvColors ?? [])]);
      let hit = 0;
      for (const c of a.colors) hit += has.has(c) ? 1 : LIGHT.includes(c) && LIGHT.some((l) => has.has(l)) ? 0.5 : 0;
      s += w * (hit ? 2 * hit : -3);
    }
    if (a.pattern.length) {
      const has = new Set([...look.pattern, ...(look.juvPattern ?? [])]);
      const hit = a.pattern.filter((p) => has.has(p)).length;
      s += w * (hit ? 2 * hit : -2);
    }
    if (a.position.length) {
      const hit = a.position.filter((p) => look.position.includes(p)).length;
      s += w * (hit ? 2 : -2);
    }
  }
  if (a.night && e.seenAt) s += e.seenAt.includes('night') || e.seenAt.includes('twilight') ? 1 : -2;
  return s;
}

/** The likely species, best first (ties: more often seen, then by name). */
export function identify(list: readonly Entry[], a: IdAnswers): { e: Entry; score: number }[] {
  const out: { e: Entry; score: number }[] = [];
  for (const e of list) {
    const score = idScore(e, a);
    if (score !== null) out.push({ e, score });
  }
  return out.sort((x, y) => y.score - x.score || x.e.sci.localeCompare(y.e.sci));
}

/** The species that still fit: at most one answer missed (a miss costs more than a hit earns). */
export const fits = <T extends { score: number }>(ranked: readonly T[]): T[] => ranked.filter((r) => r.score >= 0);

// ------------------------------------------------------------------ guessing a look from a species' text

const COLOR_RX: [Color, RegExp][] = [
  ['red', /\b(red|reddish|scarlet|crimson)\b/],
  ['orange', /\b(orange|orangish)\b/],
  ['yellow', /\b(yellow|yellowish|golden|gold)\b/],
  ['green', /\b(green|greenish|olive)\b/],
  ['blue', /\b(blue|bluish|turquoise)\b/],
  ['purple', /\b(purple|violet|lilac|lavender|mauve)\b/],
  ['pink', /\b(pink|pinkish|rosy)\b/],
  ['brown', /\b(brown|brownish|tan|bronze|rust|rusty)\b/],
  ['black', /\b(black|blackish)\b/],
  ['white', /\b(white|whitish)\b/],
  ['grey', /\b(grey|gray|greyish|grayish)\b/],
  ['silver', /\b(silver|silvery)\b/],
  ['clear', /\b(transparent|translucent|glassy|see-through)\b/],
];
const PATTERN_RX: [Pattern, RegExp][] = [
  ['stripes', /\b(stripe|stripes|striped|lengthwise lines?)\b/],
  ['bars', /\b(bars|barred|bands|banded|vertical (bars?|bands?))\b/],
  ['eyespot', /\b(eyespots?|eye-spots?|ocell\w*)\b/],
  ['spots', /\b(spots|spotted|dots|dotted|blotch\w*|speckl\w*|freckl\w*)\b/],
  ['mottled', /\b(mottl\w*|marbl\w*|camouflag\w*|variegat\w*)\b/],
  ['rings', /\b(rings|ringed|annul\w*)\b/],
  ['net', /\b(reticulat\w*|net-like|network)\b/],
];
const HAB_POS: Partial<Record<Habitat, Position>> = {
  reef: 'reef', rock: 'reef', rubble: 'bottom', sand: 'bottom', seagrass: 'bottom', 'open-water': 'midwater', offshore: 'midwater',
  deep: 'bottom', drift: 'surface', beach: 'shore', mangrove: 'shore',
};
const FIXED: readonly Group[] = ['corals', 'sponges-worms', 'plants-algae'];

/** A rough look from the English ID text and habitats, used only until a researcher describes the species. */
export function guessLook(text: string, habitats: readonly Habitat[] = [], group?: Group): Look | undefined {
  const t = text.toLowerCase();
  const colors = COLOR_RX.filter(([, rx]) => rx.test(t)).map(([c]) => c).slice(0, 5);
  const pattern = PATTERN_RX.filter(([, rx]) => rx.test(t)).map(([p]) => p).slice(0, 3);
  const position = [...new Set([...(group && FIXED.includes(group) ? (['attached'] as Position[]) : []), ...habitats.map((h) => HAB_POS[h]).filter((p): p is Position => !!p)])];
  if (group === 'seabirds') position.splice(0, position.length, 'surface', 'shore');
  if (!colors.length && !pattern.length && !position.length) return undefined;
  return { colors, pattern: pattern.length ? pattern : colors.length === 1 ? ['plain'] : [], position: position.slice(0, 3), guessed: true };
}
