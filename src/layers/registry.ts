/**
 * Layer registry and activity presets (PLAN 1.8). Pure: no DOM, no MapLibre.
 *
 * The catalog below is the single list of toggleable layers (display text: i18n `layer.<id>`, `activity.<id>`). A layer is "live" once something
 * registers an implementation for its id (see `register`), otherwise the panel shows it as SOON.
 * Layers that are plain MapLibre layers can instead declare `mapPrefixes`; `bindMapLayers`
 * (layers/visibility.ts) then shows/hides every style layer whose id starts with one of them.
 */

export type LayerId =
  | 'waves' | 'currents' | 'wind' | 'sst' | 'clarity' | 'sargassum' | 'weather' | 'lightning' | 'obs'
  | 'rip' | 'surf'
  | 'depth' | 'reefs' | 'seamarks'
  | 'fishing' | 'zones' | 'anchorages';

export type LayerGroup = 'OCEAN' | 'SURF ZONE' | 'SEAFLOOR' | 'USE';

export interface LayerDef {
  id: LayerId;
  group: LayerGroup;
  /** MapLibre style-layer id prefixes this layer controls; the map binding registers them. */
  mapPrefixes?: string[];
}

export const LAYERS: readonly LayerDef[] = [
  { id: 'waves', group: 'OCEAN', mapPrefixes: ['wv-'] },
  { id: 'currents', group: 'OCEAN' },
  { id: 'wind', group: 'OCEAN' },
  { id: 'sst', group: 'OCEAN', mapPrefixes: ['ss-'] },
  { id: 'clarity', group: 'OCEAN', mapPrefixes: ['cl-'] },
  { id: 'sargassum', group: 'OCEAN', mapPrefixes: ['sg-'] },
  { id: 'weather', group: 'OCEAN', mapPrefixes: ['st-'] },
  { id: 'lightning', group: 'OCEAN', mapPrefixes: ['lt-'] },
  { id: 'obs', group: 'OCEAN', mapPrefixes: ['ob-'] },
  { id: 'rip', group: 'SURF ZONE', mapPrefixes: ['rp-'] },
  { id: 'surf', group: 'SURF ZONE', mapPrefixes: ['sb-'] },
  { id: 'depth', group: 'SEAFLOOR', mapPrefixes: ['sf-shade', 'sf-contour'] },
  { id: 'reefs', group: 'SEAFLOOR', mapPrefixes: ['sf-reef', 'sf-zone', 'sf-bottom'] },
  { id: 'seamarks', group: 'SEAFLOOR', mapPrefixes: ['sf-marks'] },
  { id: 'fishing', group: 'USE', mapPrefixes: ['fh-', 'bt-'] },
  { id: 'zones', group: 'USE', mapPrefixes: ['pz-'] },
  { id: 'anchorages', group: 'USE', mapPrefixes: ['an-'] },
];

export type ActivityId = 'all' | 'fishing' | 'dive' | 'surf' | 'sail';
export interface Activity { id: ActivityId; layers: readonly LayerId[] }

const ALL_IDS = LAYERS.map((l) => l.id);

/** One-tap presets. `all` is every layer; the rest are what that activity needs to see. */
export const ACTIVITIES: readonly Activity[] = [
  { id: 'all', layers: ALL_IDS },
  { id: 'fishing', layers: ['fishing', 'sst', 'clarity', 'weather', 'lightning', 'obs', 'currents', 'wind', 'depth', 'reefs', 'zones'] },
  { id: 'dive', layers: ['lightning', 'clarity', 'sargassum', 'waves', 'currents', 'rip', 'depth', 'reefs', 'zones', 'seamarks'] },
  { id: 'surf', layers: ['lightning', 'sargassum', 'waves', 'wind', 'rip', 'surf', 'depth', 'reefs'] },
  { id: 'sail', layers: ['wind', 'weather', 'lightning', 'obs', 'waves', 'currents', 'depth', 'seamarks', 'anchorages', 'reefs'] },
];

export interface LayerImpl {
  /** Called with the current state on register and again on every change. */
  setVisible(on: boolean): void;
}

export interface LayerStore {
  isOn(id: LayerId): boolean;
  isLive(id: LayerId): boolean;
  /** Preset the enabled set matches exactly, or null for a custom mix. */
  activity(): ActivityId | null;
  toggle(id: LayerId): void;
  setActivity(id: ActivityId): void;
  /** Hook an implementation (e.g. the particle layer) into a catalog id. Returns an unregister function. */
  register(id: LayerId, impl: LayerImpl): () => void;
  subscribe(fn: () => void): () => void;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.layers.off';

/** State is stored as the layers switched OFF, so layers added later default to on. */
export function createLayerStore(storage?: Storage): LayerStore {
  const known = new Set<string>(ALL_IDS);
  let off = new Set<LayerId>();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) ?? '[]');
    if (Array.isArray(saved)) off = new Set(saved.filter((s): s is LayerId => known.has(s)));
  } catch {
    /* storage blocked or corrupt: start with everything on */
  }
  const impls = new Map<LayerId, LayerImpl>();
  const listeners = new Set<() => void>();

  const isOn = (id: LayerId) => !off.has(id);
  const apply = () => impls.forEach((impl, id) => impl.setVisible(isOn(id)));
  const commit = () => {
    try {
      storage?.setItem(KEY, JSON.stringify([...off]));
    } catch {
      /* private mode: keep going without persistence */
    }
    apply();
    listeners.forEach((fn) => fn());
  };

  return {
    isOn,
    isLive: (id) => impls.has(id),
    activity() {
      const on = new Set(ALL_IDS.filter(isOn));
      return ACTIVITIES.find((a) => a.layers.length === on.size && a.layers.every((l) => on.has(l)))?.id ?? null;
    },
    toggle(id) {
      if (off.has(id)) off.delete(id);
      else off.add(id);
      commit();
    },
    setActivity(id) {
      const a = ACTIVITIES.find((x) => x.id === id);
      if (!a) return;
      off = new Set(ALL_IDS.filter((l) => !a.layers.includes(l)));
      commit();
    },
    register(id, impl) {
      impls.set(id, impl);
      impl.setVisible(isOn(id));
      listeners.forEach((fn) => fn());
      return () => {
        if (impls.get(id) === impl) impls.delete(id);
        listeners.forEach((fn) => fn());
      };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The app-wide store. Layer modules register into it, e.g. the particle layer:
 * `layers.register('wind', { setVisible: (on) => (windParticles.visible = on) })`.
 */
export const layers = createLayerStore(safeStorage());
