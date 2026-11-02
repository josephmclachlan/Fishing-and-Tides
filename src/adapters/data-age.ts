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

/** "03H00" (hours and minutes) under 100 h, then "04D12H" (days and hours), for the segmented DATA AGE display. */
export function formatAge(ageMs: number): string {
  const h = Math.max(0, Number.isFinite(ageMs) ? ageMs : 0) / 3.6e6;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  return h < 100 ? `${pad(h)}H${pad((h % 1) * 60)}` : `${pad(h / 24)}D${pad(h % 24)}H`;
}

export interface AgeView {
  /** `none`: no live feed has loaded (first run offline, or the data build isn't published): the HUD is showing simulated values. */
  state: AgeState | 'none';
  text: string;
  /** The oldest feed is the phone's last stored copy, not a fresh download. */
  fromCache: boolean;
}

/** What DATA AGE shows for the oldest feed at time `now`. */
export function describeAge(oldest: FeedAge | undefined, now: number): AgeView {
  if (!oldest) return { state: 'none', text: '', fromCache: false };
  const ageMs = now - oldest.fetchedAt;
  return { state: ageState(ageMs), text: formatAge(ageMs), fromCache: oldest.fromCache };
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
