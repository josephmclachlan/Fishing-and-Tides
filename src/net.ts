/**
 * Connectivity (PLAN 5.2): `navigator.onLine` plus the online/offline events. It only says whether the
 * radio thinks it has a network; whether data actually came from the network is `FeedAge.fromCache`.
 */
export interface Net {
  online(): boolean;
  subscribe(fn: () => void): () => void;
}

export function createNet(target: Pick<EventTarget, 'addEventListener'> | null = typeof window !== 'undefined' ? window : null, initial = typeof navigator === 'undefined' || navigator.onLine !== false): Net {
  let on = initial;
  const subs = new Set<() => void>();
  const set = (v: boolean) => {
    if (v === on) return;
    on = v;
    subs.forEach((fn) => fn());
  };
  target?.addEventListener('online', () => set(true));
  target?.addEventListener('offline', () => set(false));
  return {
    online: () => on,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
