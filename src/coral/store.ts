/**
 * Coral field log: wild reef sites, nurseries and outplant gardens, each a folder of dated visits
 * (status, measurements, actions taken, a frozen copy of the day's conditions), photos and planned
 * missions. Kept on this device (localStorage; photo files in IndexedDB, src/coral/photos.ts) and
 * PRIVATE: no layer or feed reads it but the owner's own panel and map rings. Records are plain JSON
 * with a uuid, createdAt/updatedAt and a schemaVersion, behind the `CoralStore` interface, so a
 * synced backend (the shared database, with an allowlist) can replace the local one without
 * changing the panel or the map layer.
 *
 * Schema 2 (PLAN 7.36) adds measurements, actions, per-visit photos with captions and tags, the
 * conditions snapshot and missions. Schema 1 records load and are upgraded in place; nothing is lost.
 */
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.coral.v1';
export const SCHEMA_VERSION = 2;

export type SiteKind = 'reef' | 'nursery' | 'garden';
export const SITE_KINDS: readonly SiteKind[] = ['reef', 'nursery', 'garden'];
export type CoralStatus = 'unknown' | 'healthy' | 'bleaching' | 'disease' | 'dead';
export const STATUSES: readonly CoralStatus[] = ['unknown', 'healthy', 'bleaching', 'disease', 'dead'];

/** Work done on a visit (the tick list). */
export type ActionId = 'outplant' | 'nursery' | 'algae' | 'predators' | 'disease' | 'measure' | 'survey';
export const ACTIONS: readonly ActionId[] = ['outplant', 'nursery', 'algae', 'predators', 'disease', 'measure', 'survey'];

/** How a site's position was set. */
export type LocSource = 'gps' | 'centre' | 'hand' | 'photo';

/** What a diver measures on a visit. All optional. */
export interface Measurements {
  /** Percent of colonies bleached, 0-100. */
  bleachPct?: number;
  /** Percent of coral surface covered by settled sediment, 0-100. */
  sedimentPct?: number;
  /** Secchi disk depth, m (horizontal or vertical, as your protocol does it). */
  secchiM?: number;
  /** Sediment trap rate, mg/cm²/day. */
  trapMgCm2Day?: number;
  /** Water temperature from a dive computer or logger, °C. */
  waterTempC?: number;
  /** Fragments outplanted on this visit. */
  outplanted?: number;
}
export type MeasureId = keyof Measurements;
/** Physical bounds; values outside are clamped, and non-numbers dropped. */
export const MEASURE_LIMITS: Record<MeasureId, [number, number]> = {
  bleachPct: [0, 100], sedimentPct: [0, 100], secchiM: [0, 60], trapMgCm2Day: [0, 1000], waterTempC: [15, 40], outplanted: [0, 100_000],
};
export const MEASURES = Object.keys(MEASURE_LIMITS) as MeasureId[];

/**
 * The conditions at the site when a visit was logged, frozen so they survive after the live feeds
 * move on. Only what was known then is kept; a missing feed is simply absent.
 */
export interface Conditions {
  /** When the snapshot was taken, ms since epoch. */
  at: number;
  /** The CRW reef whose pixel was read (src/region.ts CORAL_REEFS id). */
  reefId?: string;
  /** Degree Heating Weeks, °C-weeks. */
  dhw?: number;
  /** CRW alert level 0..7. */
  alert?: number;
  sstC?: number;
  sstAnomalyC?: number;
  /** River discharge / median for the reef's river. */
  flowRatio?: number;
  /** Effective catchment rain, mm. */
  rainMm?: number;
  /** Significant wave height at the reef, m. */
  hsM?: number;
  /** Lowest predicted tide in the next 24 h, m. */
  lowTideM?: number;
  sargassum?: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
}

export interface Visit extends Measurements {
  id: string;
  /** ms since epoch. */
  t: number;
  status: CoralStatus;
  notes: string;
  /** Who dived, free text. */
  team?: string;
  actions: ActionId[];
  conditions?: Conditions;
  /** The mission this visit carried out, if any. */
  missionId?: string;
}

export interface Photo {
  /** Key of the image in the on-device photo store. */
  id: string;
  addedAt: number;
  /** When the photo was taken (from the file), ms. */
  takenAt?: number;
  caption: string;
  /** e.g. before, after, a colony id. */
  tags: string[];
  /** The visit it belongs to; none = a site photo. */
  visitId?: string;
}

/** A planned future visit. */
export interface Mission {
  id: string;
  /** Planned day, ms since epoch. */
  t: number;
  goal: string;
  actions: ActionId[];
  notes: string;
  /** Set when a visit carried it out. */
  doneVisitId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CoralSite {
  id: string;
  schemaVersion: number;
  kind: SiteKind;
  name: string;
  lng: number;
  lat: number;
  /** GPS accuracy of the position, m, when it came from GPS. */
  gpsAccuracyM?: number;
  locSource?: LocSource;
  depthM?: number;
  /** Free text, e.g. "Acropora cervicornis, Orbicella". */
  species: string;
  notes: string;
  photos: Photo[];
  /** Only 'private' exists: these locations never leave the device (or, later, the allowlisted people). */
  privacy: 'private';
  createdAt: number;
  updatedAt: number;
  visits: Visit[];
  missions: Mission[];
}

type SiteFields = 'kind' | 'name' | 'lng' | 'lat' | 'gpsAccuracyM' | 'locSource' | 'depthM' | 'species' | 'notes';
export type NewSite = Pick<CoralSite, 'kind' | 'name' | 'lng' | 'lat'> & Partial<Pick<CoralSite, 'gpsAccuracyM' | 'locSource' | 'depthM' | 'species' | 'notes'>>;
export type NewVisit = Omit<Visit, 'id' | 'actions'> & { actions?: ActionId[] };
export type NewPhoto = Omit<Photo, 'addedAt' | 'caption' | 'tags'> & Partial<Pick<Photo, 'addedAt' | 'caption' | 'tags'>>;
export type NewMission = Pick<Mission, 't' | 'goal'> & Partial<Pick<Mission, 'actions' | 'notes'>>;

export interface CoralStore {
  list(): readonly CoralSite[];
  add(s: NewSite, now?: number): CoralSite;
  update(id: string, patch: Partial<Pick<CoralSite, SiteFields>>, now?: number): void;
  remove(id: string): void;
  addVisit(siteId: string, v: NewVisit, now?: number): Visit | null;
  updateVisit(siteId: string, visitId: string, patch: Partial<Omit<Visit, 'id'>>, now?: number): void;
  /** Removes the visit; its photos stay with the site. */
  removeVisit(siteId: string, visitId: string, now?: number): void;
  addPhoto(siteId: string, p: NewPhoto, now?: number): void;
  updatePhoto(siteId: string, photoId: string, patch: Partial<Pick<Photo, 'caption' | 'tags' | 'visitId' | 'takenAt'>>, now?: number): void;
  /** Forgets the photo; the caller deletes the image (deletePhoto). */
  removePhoto(siteId: string, photoId: string, now?: number): void;
  addMission(siteId: string, m: NewMission, now?: number): Mission | null;
  updateMission(siteId: string, missionId: string, patch: Partial<Pick<Mission, 't' | 'goal' | 'actions' | 'notes'>>, now?: number): void;
  removeMission(siteId: string, missionId: string, now?: number): void;
  /** Logs a visit for a mission (its planned actions unless the visit lists its own) and marks it done. */
  completeMission(siteId: string, missionId: string, v: NewVisit, now?: number): Visit | null;
  flush(): void;
  subscribe(fn: () => void): () => void;
}

export const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown) => (typeof x === 'string' ? x : '');
const actionsOf = (x: unknown): ActionId[] => (Array.isArray(x) ? [...new Set(x.filter((a): a is ActionId => ACTIONS.includes(a)))] : []);

/** Measurements with non-numbers dropped and numbers clamped to MEASURE_LIMITS (outplanted rounded). Pure. */
export function cleanMeasures(m: Partial<Record<MeasureId, unknown>>): Measurements {
  const out: Measurements = {};
  for (const k of MEASURES) {
    const v = m[k];
    if (!fin(v)) continue;
    const [lo, hi] = MEASURE_LIMITS[k];
    const c = Math.min(hi, Math.max(lo, v));
    out[k] = k === 'outplanted' || k === 'bleachPct' || k === 'sedimentPct' ? Math.round(c) : c;
  }
  return out;
}

const SARG = ['NONE', 'LOW', 'MODERATE', 'HIGH'] as const;
function cleanConditions(c: unknown): Conditions | undefined {
  const x = c as Record<string, unknown> | null;
  if (!x || typeof x !== 'object' || !fin(x.at)) return undefined;
  const out: Conditions = { at: x.at };
  if (typeof x.reefId === 'string') out.reefId = x.reefId;
  for (const k of ['dhw', 'alert', 'sstC', 'sstAnomalyC', 'flowRatio', 'rainMm', 'hsM', 'lowTideM'] as const) if (fin(x[k])) out[k] = x[k] as number;
  if (SARG.includes(x.sargassum as (typeof SARG)[number])) out.sargassum = x.sargassum as Conditions['sargassum'];
  return out;
}

function cleanVisit(v: unknown): Visit | null {
  const x = v as Record<string, unknown> | null;
  if (!x || typeof x.id !== 'string' || !fin(x.t)) return null;
  const out: Visit = {
    id: x.id, t: x.t, status: STATUSES.includes(x.status as CoralStatus) ? (x.status as CoralStatus) : 'unknown', notes: str(x.notes),
    actions: actionsOf(x.actions), ...cleanMeasures(x as Partial<Record<MeasureId, unknown>>),
  };
  if (typeof x.team === 'string' && x.team) out.team = x.team;
  if (typeof x.missionId === 'string') out.missionId = x.missionId;
  const c = cleanConditions(x.conditions);
  if (c) out.conditions = c;
  return out;
}

function cleanPhoto(p: unknown, fallbackT: number): Photo | null {
  // Schema 1 kept bare ids in photoIds.
  if (typeof p === 'string') return { id: p, addedAt: fallbackT, caption: '', tags: [] };
  const x = p as Record<string, unknown> | null;
  if (!x || typeof x.id !== 'string') return null;
  const out: Photo = { id: x.id, addedAt: fin(x.addedAt) ? x.addedAt : fallbackT, caption: str(x.caption), tags: Array.isArray(x.tags) ? x.tags.filter((g): g is string => typeof g === 'string' && !!g) : [] };
  if (fin(x.takenAt)) out.takenAt = x.takenAt;
  if (typeof x.visitId === 'string') out.visitId = x.visitId;
  return out;
}

function cleanMission(m: unknown): Mission | null {
  const x = m as Record<string, unknown> | null;
  if (!x || typeof x.id !== 'string' || !fin(x.t)) return null;
  const out: Mission = { id: x.id, t: x.t, goal: str(x.goal), actions: actionsOf(x.actions), notes: str(x.notes), createdAt: fin(x.createdAt) ? x.createdAt : x.t, updatedAt: fin(x.updatedAt) ? x.updatedAt : x.t };
  if (typeof x.doneVisitId === 'string') out.doneVisitId = x.doneVisitId;
  return out;
}

/**
 * A stored site of any schema as a schema-2 site, or null if it is not a site. Unknown fields are
 * dropped; bad visits, photos and missions are skipped one by one rather than losing the site. Pure.
 */
export function upgradeSite(raw: unknown): CoralSite | null {
  const x = raw as Record<string, unknown> | null;
  if (!x || typeof x.id !== 'string' || !fin(x.lng) || !fin(x.lat) || !SITE_KINDS.includes(x.kind as SiteKind) || !Array.isArray(x.visits)) return null;
  const createdAt = fin(x.createdAt) ? x.createdAt : 0;
  const photosRaw: unknown[] = Array.isArray(x.photos) ? x.photos : Array.isArray(x.photoIds) ? x.photoIds : [];
  const site: CoralSite = {
    id: x.id, schemaVersion: SCHEMA_VERSION, kind: x.kind as SiteKind, name: str(x.name), lng: x.lng, lat: x.lat,
    species: str(x.species), notes: str(x.notes),
    photos: photosRaw.map((p) => cleanPhoto(p, createdAt)).filter((p): p is Photo => !!p),
    privacy: 'private', createdAt, updatedAt: fin(x.updatedAt) ? x.updatedAt : createdAt,
    visits: x.visits.map(cleanVisit).filter((v): v is Visit => !!v).sort((a, b) => a.t - b.t),
    missions: (Array.isArray(x.missions) ? x.missions : []).map(cleanMission).filter((m): m is Mission => !!m).sort((a, b) => a.t - b.t),
  };
  if (fin(x.depthM)) site.depthM = x.depthM;
  if (fin(x.gpsAccuracyM)) site.gpsAccuracyM = x.gpsAccuracyM;
  if (['gps', 'centre', 'hand', 'photo'].includes(x.locSource as string)) site.locSource = x.locSource as LocSource;
  return site;
}

/** The photos of one visit, or the site photos (no visit) when visitId is null. */
export const photosOf = (s: CoralSite, visitId: string | null) => s.photos.filter((p) => (visitId === null ? !p.visitId : p.visitId === visitId));

/** Missions not yet carried out, soonest first. */
export const openMissions = (s: CoralSite) => s.missions.filter((m) => !m.doneVisitId);

export function createCoralStore(storage?: Storage): CoralStore {
  let sites: CoralSite[] = [];
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (raw && Array.isArray(raw.sites)) sites = raw.sites.map(upgradeSite).filter((s: CoralSite | null): s is CoralSite => !!s);
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
  const edit = (id: string, now: number, f: (s: CoralSite) => CoralSite) => commit(sites.map((s) => (s.id === id ? { ...f(s), updatedAt: now } : s)));
  const has = (id: string) => sites.some((s) => s.id === id);
  const makeVisit = (v: NewVisit): Visit => {
    const c = cleanVisit({ ...v, id: newId() });
    return c ?? { id: newId(), t: v.t, status: 'unknown', notes: '', actions: [] };
  };
  const byT = <T extends { t: number }>(xs: T[]) => xs.sort((a, b) => a.t - b.t);
  return {
    list: () => sites,
    add(n, now = Date.now()) {
      const site = upgradeSite({ id: newId(), species: '', notes: '', ...n, photos: [], visits: [], missions: [], createdAt: now, updatedAt: now })!;
      commit([...sites, site]);
      return site;
    },
    update: (id, patch, now = Date.now()) => edit(id, now, (s) => ({ ...s, ...patch })),
    remove: (id) => commit(sites.filter((s) => s.id !== id)),
    addVisit(id, v, now = Date.now()) {
      if (!has(id)) return null;
      const visit = makeVisit(v);
      edit(id, now, (s) => ({ ...s, visits: byT([...s.visits, visit]) }));
      return visit;
    },
    updateVisit: (id, vid, patch, now = Date.now()) =>
      edit(id, now, (s) => ({ ...s, visits: byT(s.visits.map((v) => (v.id === vid ? (cleanVisit({ ...v, ...patch, id: vid }) ?? v) : v))) })),
    removeVisit: (id, vid, now = Date.now()) =>
      edit(id, now, (s) => ({
        ...s,
        visits: s.visits.filter((v) => v.id !== vid),
        photos: s.photos.map((p) => (p.visitId === vid ? { ...p, visitId: undefined } : p)),
        missions: s.missions.map((m) => (m.doneVisitId === vid ? { ...m, doneVisitId: undefined } : m)),
      })),
    addPhoto: (id, p, now = Date.now()) => edit(id, now, (s) => ({ ...s, photos: [...s.photos, cleanPhoto({ addedAt: now, ...p }, now)!] })),
    updatePhoto: (id, pid, patch, now = Date.now()) => edit(id, now, (s) => ({ ...s, photos: s.photos.map((p) => (p.id === pid ? (cleanPhoto({ ...p, ...patch }, p.addedAt) ?? p) : p)) })),
    removePhoto: (id, pid, now = Date.now()) => edit(id, now, (s) => ({ ...s, photos: s.photos.filter((p) => p.id !== pid) })),
    addMission(id, m, now = Date.now()) {
      if (!has(id)) return null;
      const mission = cleanMission({ ...m, id: newId(), createdAt: now, updatedAt: now });
      if (!mission) return null;
      edit(id, now, (s) => ({ ...s, missions: byT([...s.missions, mission]) }));
      return mission;
    },
    updateMission: (id, mid, patch, now = Date.now()) =>
      edit(id, now, (s) => ({ ...s, missions: byT(s.missions.map((m) => (m.id === mid ? (cleanMission({ ...m, ...patch, id: mid, updatedAt: now }) ?? m) : m))) })),
    removeMission: (id, mid, now = Date.now()) => edit(id, now, (s) => ({ ...s, missions: s.missions.filter((m) => m.id !== mid) })),
    completeMission(id, mid, v, now = Date.now()) {
      const m = sites.find((s) => s.id === id)?.missions.find((x) => x.id === mid);
      if (!m) return null;
      const visit = makeVisit({ ...v, actions: v.actions?.length ? v.actions : m.actions, missionId: mid });
      edit(id, now, (s) => ({
        ...s,
        visits: byT([...s.visits, visit]),
        missions: s.missions.map((x) => (x.id === mid ? { ...x, doneVisitId: visit.id, updatedAt: now } : x)),
      }));
      return visit;
    },
    flush,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
