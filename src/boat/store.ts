/**
 * Boat mode state (PLAN 4.6): whether a track is recording, its points and the pins. Kept on the
 * device (localStorage) so it survives a closed tab, a dead signal or a restart. Writes are
 * batched (the track can be thousands of points); `flush` forces one, e.g. when the page hides.
 */
import { M_PER_NM, MAX_POINTS, shouldKeep, thin, type Pin, type PinKind, type TrackPoint } from './track';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.boat.v1';

export interface BoatState {
  recording: boolean;
  points: TrackPoint[];
  pins: Pin[];
}

export interface BoatStore {
  state(): Readonly<BoatState>;
  /** Start or resume recording. */
  start(): void;
  stop(): void;
  /** Feed a GPS fix; kept only while recording and when it passes `shouldKeep`. Returns whether it was kept. */
  addFix(p: TrackPoint): boolean;
  /** Drop a pin at a position. */
  addPin(at: { lng: number; lat: number; t: number }, kind: PinKind, extra?: { species?: string; depthM?: number; bite?: number; biteDay?: number }): Pin;
  removePin(id: string): void;
  /** Forget the track and the marks. Catches are kept: they are the catch log the fishing model learns from (PLAN 7.16). */
  clear(): void;
  flush(): void;
  subscribe(fn: () => void): () => void;
}

export function createBoatStore(storage?: Storage, saveEvery = 30): BoatStore {
  let s: BoatState = { recording: false, points: [], pins: [] };
  try {
    const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (raw && Array.isArray(raw.points) && Array.isArray(raw.pins)) s = { recording: !!raw.recording, points: raw.points, pins: raw.pins };
  } catch {
    /* blocked or corrupt: start empty */
  }
  const subs = new Set<() => void>();
  let sinceSave = 0;
  const flush = () => {
    sinceSave = 0;
    try {
      storage?.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full or private mode: keep going in memory */
    }
  };
  const emit = () => subs.forEach((fn) => fn());
  return {
    state: () => s,
    start() {
      if (s.recording) return;
      s = { ...s, recording: true };
      flush();
      emit();
    },
    stop() {
      if (!s.recording) return;
      s = { ...s, recording: false };
      flush();
      emit();
    },
    addFix(p) {
      if (!s.recording || !shouldKeep(s.points[s.points.length - 1], p)) return false;
      s = { ...s, points: thin([...s.points, p], MAX_POINTS) };
      if (++sinceSave >= saveEvery) flush();
      emit();
      return true;
    },
    addPin(at, kind, extra = {}) {
      const pin: Pin = { id: `${at.t.toString(36)}${Math.random().toString(36).slice(2, 6)}`, t: at.t, lng: at.lng, lat: at.lat, kind, ...extra };
      s = { ...s, pins: [...s.pins, pin] };
      flush();
      emit();
      return pin;
    },
    removePin(id) {
      s = { ...s, pins: s.pins.filter((p) => p.id !== id) };
      flush();
      emit();
    },
    clear() {
      s = { recording: s.recording, points: [], pins: s.pins.filter((p) => p.kind === 'catch') };
      flush();
      emit();
    },
    flush,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export { M_PER_NM };
