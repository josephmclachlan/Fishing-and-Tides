/**
 * The CORAL page's own link (PLAN 7.66): `#coral`, `#coral/<tab>`, `#coral/reefs/<reef>` and
 * `#coral/sites/<site>/<folder tab>`. Pure, so the parsing is tested without a DOM. Any other hash is not
 * this page's: the page hides and the forecast or the map takes over (src/forecast/model.ts `landing`).
 */
export const CP_TABS = ['reefs', 'sites', 'spawning', 'guide', 'rules'] as const;
export type CpTab = (typeof CP_TABS)[number];
export const isCpTab = (v: unknown): v is CpTab => typeof v === 'string' && (CP_TABS as readonly string[]).includes(v);

export interface CpRoute {
  tab: CpTab;
  /** A reef id (reefs tab) or a logged site's id (sites tab); null for the tab's own front. */
  id: string | null;
  /** A site folder's tab (sites only), as the drawer names them. */
  sub: string | null;
}

/** Ids are uuids or slugs: anything else in the hash is ignored rather than trusted. */
const ID = /^[a-z0-9-]{1,64}$/i;

export function parseCoralRoute(hash: string): CpRoute | null {
  const m = /^#coral(?:\/([^/]*))?(?:\/([^/]*))?(?:\/([^/]*))?\/?$/.exec(hash);
  if (!m) return null;
  const tab = isCpTab(m[1]) ? m[1] : 'reefs';
  const id = (tab === 'reefs' || tab === 'sites') && m[2] && ID.test(m[2]) ? m[2] : null;
  const sub = tab === 'sites' && id && m[3] && ID.test(m[3]) ? m[3] : null;
  return { tab, id, sub };
}

export function coralHash(r: Partial<CpRoute> = {}): string {
  const tab = r.tab ?? 'reefs';
  if (tab === 'reefs' && !r.id) return '#coral';
  const parts = ['#coral', tab];
  if ((tab === 'reefs' || tab === 'sites') && r.id) {
    parts.push(r.id);
    if (tab === 'sites' && r.sub) parts.push(r.sub);
  }
  return parts.join('/');
}
