/**
 * Phone GPS for boat mode (PLAN 4.6): a thin wrapper over `watchPosition` plus a screen wake lock
 * while recording (a web page cannot keep recording once the phone locks, so we ask the screen to
 * stay on). Works with no signal: GPS needs no network.
 */
import type { TrackPoint } from './track';

export type GpsState = 'off' | 'acquiring' | 'ok' | 'denied' | 'unavailable';

export interface Gps {
  start(): void;
  stop(): void;
  state(): GpsState;
  /** Latest fix, kept for pins even when not recording. */
  last(): TrackPoint | null;
}

export function createGps(onFix: (p: TrackPoint) => void, onState: (s: GpsState) => void): Gps {
  let watch: number | null = null;
  let state: GpsState = 'off';
  let last: TrackPoint | null = null;
  let lock: WakeLockSentinel | null = null;
  const set = (s: GpsState) => {
    if (s !== state) {
      state = s;
      onState(s);
    }
  };
  const holdScreen = async () => {
    try {
      lock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      lock = null; // refused (low battery, background tab): recording still works while visible
    }
  };
  // The lock is released when the tab is hidden; take it again when it returns.
  document.addEventListener('visibilitychange', () => {
    if (watch !== null && document.visibilityState === 'visible') void holdScreen();
  });
  return {
    start() {
      if (watch !== null) return;
      if (!navigator.geolocation) return set('unavailable');
      set('acquiring');
      void holdScreen();
      watch = navigator.geolocation.watchPosition(
        (pos) => {
          last = { t: pos.timestamp, lng: pos.coords.longitude, lat: pos.coords.latitude, acc: pos.coords.accuracy };
          set('ok');
          onFix(last);
        },
        (err) => set(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
      );
    },
    stop() {
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      watch = null;
      void lock?.release().catch(() => {});
      lock = null;
      set('off');
    },
    state: () => state,
    last: () => last,
  };
}
