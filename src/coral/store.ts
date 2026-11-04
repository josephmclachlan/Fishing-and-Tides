/**
 * Coral site and garden log: wild reef sites, nurseries and outplant gardens with dated visits.
 * Kept on this device (localStorage) and PRIVATE: no layer or feed reads it but the owner's own
 * panel. Records are plain JSON with a uuid, createdAt/updatedAt and a schemaVersion, behind the
 * `CoralStore` interface, so a synced backend (the shared database, with a device allowlist) can
 * replace the local one without changing the panel or the map layer.
 */
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.coral.v1';
export const SCHEMA_VERSION = 1;

export type SiteKind = 'reef' | 'nursery' | 'garden';
export const SITE_KINDS: readonly SiteKind[] = ['reef', 'nursery', 'garden'];
export type CoralStatus = 'unknown' | 'healthy' | 'bleaching' | 'disease' | 'dead';
export const STATUSES: readonly CoralStatus[] = ['unknown', 'healthy', 'bleaching', 'disease', 'dead'];

export interface Visit {
  id: string;
  /** ms since epoch. */
  t: number;
  status: CoralStatus;
  /** Percent of colonies bleached, 0-100. */
  bleachPct?: number;
  notes: string;
}

export interface CoralSite {
  id: string;
  schemaVersion: number;
  kind: SiteKind;
  name: string;
  lng: number;
  lat: number;
  depthM?: number;
  /** Free text, e.g. "Acropora cervicornis, Orbicella". */
  species: string;
  notes: string;
  /** Ids of photos in the on-device photo store (src/coral/photos.ts). */
  photoIds: string[];
  /** Only 'private' exists: these locations never leave the device (or, later, the allowlisted devices). */
  privacy: 'private';
  createdAt: number;
  updatedAt: number;
  visits: Visit[];
}

export type NewSite = Pick<CoralSite, 'kind' | 'name' | 'lng' | 'lat'> & Partial<Pick<CoralSite, 'depthM' | 'species' | 'notes'>>;

export interface CoralStore {
  list(): readonly CoralSite[];
  add(s: NewSite, now?: number): CoralSite;
  update(id: string, patch: Partial<Pick<CoralSite, 'kind' | 'name' | 'lng' | 'lat' | 'depthM' | 'species' | 'notes' | 'photoIds'>>, now?: number): void;
  remove(id: string): void;
  addVisit(siteId: string, v: Omit<Visit, 'id'>, now?: number): void;
  removeVisit(siteId: string, visitId: string): void;
  flush(): void;
  subscribe(fn: () => void): () => void;
}

export const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const valid = (s: unknown): s is CoralSite => {
  const x = s as CoralSite;
  return !!x && typeof x.id === 'string' && Number.isFinite(x.lng) && Number.isFinite(x.lat) && SITE_KINDS.includes(x.kind) && Array.isArray(x.visits);
};

export function createCoralStore(storage?: Storage): CoralStore {
  let sites: CoralSite[] = [];
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (raw && Array.isArray(raw.sites)) sites = raw.sites.filter(valid).map((x: CoralSite) => ({ ...x, photoIds: Array.isArray(x.photoIds) ? x.photoIds : [] }));
  } catch {
    /* blocked or corrupt: start empty */
  }
  const subs = new Set<() => void>();
  const flush = () => {
    try {
      storage?.setItem(KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, sites }));
    } catch {
      /* storage full or private mode: keep going in memory */
    }
  };
  const commit = (next: CoralSite[]) => {
    sites = next;
    flush();
    subs.forEach((fn) => fn());
  };
  const edit = (id: string, f: (s: CoralSite) => CoralSite) => commit(sites.map((s) => (s.id === id ? f(s) : s)));
  return {
    list: () => sites,
    add(n, now = Date.now()) {
      const site: CoralSite = { id: newId(), schemaVersion: SCHEMA_VERSION, species: '', notes: '', photoIds: [], ...n, privacy: 'private', createdAt: now, updatedAt: now, visits: [] };
      commit([...sites, site]);
      return site;
    },
    update: (id, patch, now = Date.now()) => edit(id, (s) => ({ ...s, ...patch, updatedAt: now })),
    remove: (id) => commit(sites.filter((s) => s.id !== id)),
    addVisit: (id, v, now = Date.now()) => edit(id, (s) => ({ ...s, updatedAt: now, visits: [...s.visits, { ...v, id: newId() }].sort((a, b) => a.t - b.t) })),
    removeVisit: (id, vid) => edit(id, (s) => ({ ...s, visits: s.visits.filter((v) => v.id !== vid) })),
    flush,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
