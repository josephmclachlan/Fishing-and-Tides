/**
 * Map work that waits until the map is first shown (PLAN 7.102). The forecast page is the app's main page and covers
 * the map, so drawing work done for the map at start-up (sea images, circled zones, crest lines, rip shading) only
 * slowed the forecast down. The feeds still load once, at start-up, for both pages; only what turns them into map
 * drawings waits here, and runs when the map first opens, one job per task so the map stays responsive.
 *
 * Nothing waits unless `holdMapWork` was called (main.ts does, at start-up), so modules used on their own (tests, the
 * old map) behave as before.
 */
let held = false;
let released = false;
const queue = new Map<unknown, () => void>();
/** How far the released jobs have got, for the map loader (src/boot.ts). */
let progress: [number, number] | null = null;
const watchers = new Set<(done: number, total: number) => void>();
const tell = (done: number, total: number) => {
  progress = [done, total];
  watchers.forEach((fn) => fn(done, total));
};

/** Follow the waiting map drawing as it runs: (done, total), at once if it has already started. Returns an unsubscribe. */
export function onMapWork(fn: (done: number, total: number) => void): () => void {
  watchers.add(fn);
  if (progress) fn(...progress);
  return () => watchers.delete(fn);
}

/** From now until `releaseMapWork`, `whenMapShown` jobs wait. */
export function holdMapWork(): void {
  if (!released) held = true;
}

/** True while map work is waiting for the map to be shown. */
export const mapWorkHeld = (): boolean => held;

/**
 * Run `job` now, or, while map work is held, once the map is shown. Jobs are kept by `key`: a later job with the same
 * key replaces the waiting one (only the newest drawing of a layer matters), keeping its place in the queue.
 */
export function whenMapShown(key: unknown, job: () => void): void {
  if (!held) return job();
  queue.set(key, job);
}

/** The map is shown: run every waiting job, each in its own task, in the order they were first asked for. */
export function releaseMapWork(schedule: (fn: () => void) => void = (fn) => setTimeout(fn, 0)): void {
  if (released) return;
  released = true;
  held = false;
  const jobs = [...queue.values()];
  queue.clear();
  const total = jobs.length;
  tell(0, total);
  const next = () => {
    const job = jobs.shift();
    if (!job) return;
    try {
      job();
    } catch (err) {
      console.warn('map job failed', err);
    }
    tell(total - jobs.length, total);
    if (jobs.length) schedule(next);
  };
  schedule(next);
}

/** Tests only: back to the start state. */
export function resetMapWork(): void {
  held = released = false;
  queue.clear();
  progress = null;
  watchers.clear();
}
