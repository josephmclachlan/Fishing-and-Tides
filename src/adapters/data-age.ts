/**
 * DATA AGE tracking (PLAN 2.1). Each adapter reports when the data it is showing was fetched;
 * the HUD shows the oldest, since that is the reading most likely to mislead.
 * Thresholds from DESIGN.md §7: green when fresh, amber after 12 h, red after 48 h.
 */

export type AgeState = 'fresh' | 'aging' | 'stale';
export const AGE_AMBER_H = 12;
export const AGE_RED_H = 48;

export function ageState(ageMs: number): AgeState {
  const h = ageMs / 3.6e6;
  return h >= AGE_RED_H ? 'stale' : h >= AGE_AMBER_H ? 'aging' : 'fresh';
}

export interface FeedAge {
  feed: string;
  fetchedAt: number;
  fromCache: boolean;
}

export interface DataAge {
  report(feed: string, fetchedAt: number, fromCache?: boolean): void;
  get(feed: string): FeedAge | undefined;
  all(): FeedAge[];
  /** The feed with the oldest data, or undefined before anything has loaded. */
  oldest(): FeedAge | undefined;
  subscribe(fn: () => void): () => void;
}

export function createDataAge(): DataAge {
  const feeds = new Map<string, FeedAge>();
  const subs = new Set<() => void>();
  return {
    report(feed, fetchedAt, fromCache = false) {
      if (!Number.isFinite(fetchedAt)) return;
      feeds.set(feed, { feed, fetchedAt, fromCache });
      subs.forEach((fn) => fn());
    },
    get: (feed) => feeds.get(feed),
    all: () => [...feeds.values()],
    oldest() {
      let o: FeedAge | undefined;
      for (const f of feeds.values()) if (!o || f.fetchedAt < o.fetchedAt) o = f;
      return o;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** The app-wide tracker. */
export const dataAge = createDataAge();
