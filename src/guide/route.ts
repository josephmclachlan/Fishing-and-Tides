/**
 * The SPECIES GUIDE's own link (PLAN 7.91): `#guide[/<view>[/<species>[/<tab>]]]`, so a list, a species and its tab
 * can be bookmarked and the phone's back button works. Pure, so the parsing is tested without a DOM. Any other hash
 * is not this page's: it hides and the forecast or the map takes over.
 *
 * The view is a mode and a group: everything, the edible list or the danger list, of every group or of one.
 * `all` (or nothing), `edible`, `danger`, `<group>`, `edible-<group>` or `danger-<group>`, e.g. `#guide/edible-fish`;
 * `identify` (the questions) and `saved` (the reader's favourites) have no group.
 */
import { GROUPS, isGroup, type Group } from './types';

export const GD_MODES = ['all', 'identify', 'edible', 'danger', 'saved'] as const;
export type GdMode = (typeof GD_MODES)[number];
export const isGdMode = (v: unknown): v is GdMode => typeof v === 'string' && (GD_MODES as readonly string[]).includes(v);

/** A species page's tabs, in order. Only the ones with something to show appear (render.ts `tabsFor`). */
export const GD_TABS = ['about', 'id', 'life', 'catch', 'clean', 'safety', 'sources'] as const;
export type GdTab = (typeof GD_TABS)[number];
export const isGdTab = (v: unknown): v is GdTab => typeof v === 'string' && (GD_TABS as readonly string[]).includes(v);

export interface GdRoute {
  mode: GdMode;
  /** One group, or null for every group. */
  group: Group | null;
  /** The species open on top of the list, or null. */
  id: string | null;
  /** Its tab, or null for the first. */
  tab: GdTab | null;
  /** A search to fill in, from a link such as `#guide/edible-fish?q=Lutjanus`, or null. */
  q: string | null;
}

/** Species ids are lower-case slugs of the scientific name; anything else in the hash is ignored. */
const ID = /^[a-z0-9-]{1,80}$/;

/** The view part of the link for a mode and a group. */
export function viewSeg(mode: GdMode, group: Group | null): string {
  if (!group || mode === 'identify' || mode === 'saved') return mode;
  return mode === 'all' ? group : `${mode}-${group}`;
}

/** A view part back to its mode and group; anything unknown is everything. */
export function parseView(seg: string | undefined): { mode: GdMode; group: Group | null } {
  if (!seg) return { mode: 'all', group: null };
  if (isGdMode(seg)) return { mode: seg, group: null };
  if (isGroup(seg)) return { mode: 'all', group: seg };
  for (const mode of ['edible', 'danger'] as const) {
    const g = seg.startsWith(`${mode}-`) ? seg.slice(mode.length + 1) : '';
    if (isGroup(g)) return { mode, group: g };
  }
  return { mode: 'all', group: null };
}

export function parseGuideRoute(hash: string): GdRoute | null {
  const m = /^#guide(?:\/([^/?]*))?(?:\/([^/?]*))?(?:\/([^/?]*))?\/?(?:\?q=([^&]*))?$/.exec(hash);
  if (!m) return null;
  const { mode, group } = parseView(m[1]);
  const id = m[2] && ID.test(m[2]) ? m[2] : null;
  const tab = id && isGdTab(m[3]) ? m[3] : null;
  let q: string | null = null;
  try {
    q = m[4] ? decodeURIComponent(m[4]).slice(0, 60) || null : null;
  } catch {
    /* a broken escape: no search */
  }
  return { mode, group, id, tab, q };
}

export function guideHash(r: Partial<GdRoute> = {}): string {
  const view = viewSeg(r.mode ?? 'all', r.group ?? null);
  if (!r.id) return view === 'all' ? '#guide' : `#guide/${view}`;
  return `#guide/${view}/${r.id}${r.tab && r.tab !== 'about' ? `/${r.tab}` : ''}`;
}

/** Every view a link can name (for tests and the page's own checks). */
export const ALL_VIEWS: readonly string[] = [...GD_MODES, ...GROUPS, ...GROUPS.map((g) => `edible-${g}`), ...GROUPS.map((g) => `danger-${g}`)];
