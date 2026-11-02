/**
 * Main-thread side of the physics worker (PLAN 3.6). `spot()` returns a promise; while a
 * request is running, newer ones for the same caller replace older queued ones, so a fast
 * time-slider scrub never builds a backlog. Falls back to running in-thread where Workers
 * aren't available (old browsers, tests).
 */
import { spotModelFromGrids, type SeafloorGrids, type SpotRequest, type SpotResult } from './spot-model';
import type { WorkerIn, WorkerOut } from './worker';

export interface PhysicsClient {
  /** Conditions at a pin; resolves null when there's no sea nearby, rejects only on a worker fault. */
  spot(req: SpotRequest): Promise<SpotResult | null>;
  /** Like `spot`, but if called again before the previous one starts, the earlier call resolves with the newer result. */
  latest(req: SpotRequest): Promise<SpotResult | null>;
  /** Several spots at once, coalesced the same way (a newer batch replaces a waiting one). */
  latestMany(reqs: SpotRequest[]): Promise<(SpotResult | null)[]>;
  dispose(): void;
}

export function createPhysicsClient(grids: SeafloorGrids): PhysicsClient {
  let send: (req: SpotRequest) => Promise<SpotResult | null>;
  let dispose = () => {};
  if (typeof Worker !== 'undefined') {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const pending = new Map<number, { resolve: (r: SpotResult | null) => void; reject: (e: Error) => void }>();
    let nextId = 1;
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.type === 'spot') {
        pending.get(m.id)?.resolve(m.result);
        pending.delete(m.id);
      } else if (m.type === 'error') {
        if (m.id != null) {
          pending.get(m.id)?.reject(new Error(m.message));
          pending.delete(m.id);
        } else console.warn(m.message);
      }
    };
    w.postMessage({ type: 'init', grids } satisfies WorkerIn);
    send = (req) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        w.postMessage({ type: 'spot', id, req } satisfies WorkerIn);
      });
    dispose = () => w.terminate();
  } else {
    const model = spotModelFromGrids(grids);
    send = (req) => Promise.resolve(model.spot(req));
  }

  return {
    spot: send,
    latest: coalesce(send),
    latestMany: coalesce((reqs: SpotRequest[]) => Promise.all(reqs.map(send))),
    dispose,
  };
}

/**
 * Wrap an async function so only one call runs at a time; while it runs, the most recent
 * new call waits and replaces any older waiting one, and everyone who waited gets its result.
 */
export function coalesce<A, R>(fn: (arg: A) => Promise<R>): (arg: A) => Promise<R> {
  let busy = false;
  let queued: { arg: A; waiters: ((r: Promise<R>) => void)[] } | null = null;
  const run = (arg: A): Promise<R> => {
    busy = true;
    const p = fn(arg);
    p.finally(() => {
      busy = false;
      if (queued) {
        const q = queued;
        queued = null;
        const next = run(q.arg);
        q.waiters.forEach((w) => w(next));
      }
    }).catch(() => {});
    return p;
  };
  return (arg) => {
    if (!busy) return run(arg);
    return new Promise<R>((resolve) => {
      const waiters = queued?.waiters ?? [];
      waiters.push(resolve);
      queued = { arg, waiters };
    });
  };
}
