/**
 * Runs the launch screen and the map loader (PLAN 7.160). Their look is in src/boot-view.ts; the launch screen is
 * already in the page when this runs (vite.config.ts puts it into index.html).
 *
 * Launch: main.ts hands each start-up feed to `track(step, promise)`. A step is done when every promise given to it has
 * settled, loaded or failed. Each done step lights the next dot, left to right, so the row is real progress. When every
 * step is in, the page is drawn once more with everything (`ready`), and only then does the screen fade, so the first
 * page opens already filled. A slow feed never holds it: after CAP_MS it opens anyway and says which part is still
 * loading. Offline the adapters answer from the stored copy, so it opens as fast as the phone can read it.
 *
 * Map: the first time the map is shown, the same loader, smaller, until the map style, the drawing that waited for
 * the map (src/map-shown.ts) and the first full frame of tiles are all done.
 */
import { BOOT_ID, bootHtml, DOTS, litDots } from './boot-view';

/** Longest a loader stays up before opening anyway. */
export const CAP_MS = 8000;
/** Shortest the launch screen shows, so the mark gets to draw instead of flashing. */
export const MIN_MS = 700;
/**
 * Stragglers: once this share of the start-up feeds is in, the rest get STRAGGLER_MS more, then the app opens and
 * they fill in as they land (the page is redrawn for each). One slow outside service (the town rain, say, which can
 * take its full 15 s timeout when Open-Meteo is busy) then costs a second and a half, not the whole cap.
 */
export const STRAGGLER_SHARE = 0.85;
export const STRAGGLER_MS = 1500;

/** True when the launch should stop waiting for the feeds still out. Pure, for tests. */
export function stragglersDue(settled: number, tracked: number, sinceShareMs: number | null): boolean {
  if (tracked === 0 || settled >= tracked) return true;
  return settled / tracked >= STRAGGLER_SHARE && sinceShareMs !== null && sinceShareMs >= STRAGGLER_MS;
}

export interface StepState {
  id: string;
  pending: number;
  done: boolean;
}

/** Pure progress over named steps, in the order they were declared. */
export function createProgress(ids: readonly string[]) {
  const steps: StepState[] = ids.map((id) => ({ id, pending: 0, done: false }));
  const by = new Map(steps.map((s) => [s.id, s]));
  return {
    add(id: string) {
      const s = by.get(id);
      if (s && !s.done) s.pending++;
    },
    settle(id: string) {
      const s = by.get(id);
      if (!s || s.done) return;
      s.pending = Math.max(0, s.pending - 1);
      if (s.pending === 0) s.done = true;
    },
    /** A step nothing was tracked for (say, a feed this page never asks for) counts as done. */
    close() {
      for (const s of steps) if (s.pending === 0) s.done = true;
    },
    done: () => steps.filter((s) => s.done).length,
    total: () => steps.length,
    complete: () => steps.every((s) => s.done),
    /** The first step still loading, for the line under the dots. */
    waiting: () => steps.find((s) => !s.done)?.id ?? null,
  };
}

const raf2 = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function view(el: HTMLElement) {
  const dots = [...el.querySelectorAll<HTMLElement>('.sc-d')];
  const line = el.querySelector<HTMLElement>('.sc-lt')!;
  let lit = 0;
  // The word mark waits for its font, so it never shows in a stand-in face first.
  const fontLoad = document.fonts?.load?.('620 40px "Anybody Variable"') ?? Promise.resolve();
  Promise.race([fontLoad, sleep(1500)]).finally(() => el.classList.add('sc-f'));
  return {
    show(n: number, text: string) {
      lit = Math.max(lit, Math.min(DOTS, n));
      dots.forEach((d, i) => {
        d.classList.toggle('sc-on', i < lit);
        d.classList.toggle('sc-now', i === lit);
      });
      el.setAttribute('aria-valuenow', String(lit));
      line.textContent = text;
    },
    gone(): Promise<void> {
      el.classList.add('sc-gone');
      return sleep(reduced() ? 0 : 520).then(() => el.remove());
    },
  };
}

export interface LaunchText {
  region: string;
  /** "LOADING {step}" for the line under the dots. */
  loading: (step: string) => string;
  /** The step's name, plain words. */
  step: (id: string) => string;
  ready: string;
  /** "OPENING, STILL LOADING {step}" when the cap is reached. */
  slow: (step: string) => string;
}

export interface Launch {
  /** Count `p` toward `step`. Returns `p`, so the call can wrap a fetch in place. After launch it does nothing. */
  track<T>(step: string, p: Promise<T>): Promise<T>;
  /**
   * Every start-up feed has been handed over: wait for them (or the cap), run `draw` so the first page is drawn with
   * everything, then fade. Resolves when the screen is gone.
   */
  ready(draw: () => void, extra?: Promise<unknown>): Promise<void>;
  /** Also wait for `p` before opening (the map, when the app opens on it). Ignored once the screen has gone. */
  hold(p: Promise<unknown>): void;
  /** True until the launch screen has started to fade. */
  showing(): boolean;
}

export function createLaunch(steps: readonly string[], text: LaunchText, now = () => performance.now()): Launch {
  const el = document.getElementById(BOOT_ID);
  const prog = createProgress(steps);
  const t0 = now();
  let open = !!el;
  const v = el ? view(el) : null;
  if (el) el.querySelector<HTMLElement>('.sc-ls')!.textContent = text.region;
  const paint = () => {
    if (!v || !open) return;
    const w = prog.waiting();
    v.show(litDots(prog.done(), prog.total()), w ? text.loading(text.step(w)) : text.ready);
  };
  let changed: () => void = () => {};
  const extras: Promise<unknown>[] = [];
  let tracked = 0;
  let settled = 0;
  let shareAt: number | null = null;
  /** Redraws the page when a straggler lands after the screen has gone. */
  let late: (() => void) | null = null;
  paint();
  return {
    track(step, p) {
      if (!open) return p;
      prog.add(step);
      tracked++;
      const settle = () => {
        settled++;
        if (shareAt === null && settled / tracked >= STRAGGLER_SHARE) shareAt = now();
        if (!open) return void late?.();
        prog.settle(step);
        paint();
        changed();
      };
      p.then(settle, settle);
      return p;
    },
    async ready(draw, extra) {
      if (!el || !v) return void draw();
      prog.close();
      paint();
      const all = new Promise<void>((resolve) => {
        const check = () => {
          if (prog.complete() || stragglersDue(settled, tracked, shareAt === null ? null : now() - shareAt)) resolve();
        };
        changed = () => {
          check();
          // Start the straggler clock when the share is first reached.
          if (shareAt !== null) setTimeout(check, Math.max(0, STRAGGLER_MS - (now() - shareAt)) + 5);
        };
        changed();
      });
      if (extra) extras.push(extra);
      // Wait for the steps and anything held, including what is held while waiting.
      const everything = async () => {
        await all;
        for (let n = 0; n < extras.length; n = extras.length) await Promise.all(extras.slice(n));
      };
      await Promise.race([
        everything().then(() => false),
        sleep(Math.max(0, CAP_MS - (now() - t0))).then(() => true),
      ]);
      const w = prog.waiting();
      // Let the handlers that turn feeds into numbers finish, draw the page with everything, and show it a frame.
      await raf2();
      try {
        draw();
      } catch (err) {
        console.warn('first draw failed', err);
      }
      await raf2();
      // Opened on the cap, or with stragglers still out: say which part is still coming.
      v.show(DOTS, w ? text.slow(text.step(w)) : text.ready);
      await sleep(Math.max(reduced() ? 0 : 450, MIN_MS - (now() - t0)));
      open = false;
      late = () => {
        try {
          draw();
        } catch (err) {
          console.warn('late draw failed', err);
        }
      };
      await v.gone();
    },
    hold(p) {
      if (open) extras.push(p.catch(() => undefined));
    },
    showing: () => open,
  };
}

export interface MapLoadText {
  title: string;
  tiles: string;
  drawing: string;
  ready: string;
  slow: string;
}

/** The map's own milestones, as 0..1 of the way: the style, then the waiting drawing jobs, then a full frame of tiles. */
export function mapFraction(style: boolean, jobsDone: number, jobsTotal: number, idle: boolean): number {
  if (idle && style && jobsDone >= jobsTotal) return 1;
  const jobs = jobsTotal > 0 ? jobsDone / jobsTotal : style ? 1 : 0;
  return (style ? 0.25 : 0) + 0.6 * jobs;
}

export interface MapHooks {
  styleLoaded(): boolean;
  onStyle(fn: () => void): void;
  /** Called with (done, total) as the waiting map drawing runs; total 0 when nothing waited. */
  onJobs(fn: (done: number, total: number) => void): void;
  /** Called once when every tile in view is loaded and drawn. */
  onIdle(fn: () => void): void;
}

/** Follow the map to its first full drawing: `report` gets the fraction (0..1) and whether the style is in. */
export function watchMap(hooks: MapHooks, report: (f: number, style: boolean) => void = () => {}): Promise<void> {
  let style = hooks.styleLoaded();
  let jd = 0;
  let jt = -1;
  let idle = false;
  let asked = false;
  return new Promise<void>((resolve) => {
    const paint = () => {
      const f = jt < 0 ? (style ? 0.25 : 0) : mapFraction(style, jd, jt, idle);
      report(f, style);
      if (f >= 1) resolve();
    };
    const waitIdle = () => {
      if (asked || !style || jt < 0 || jd < jt) return;
      asked = true;
      hooks.onIdle(() => ((idle = true), paint()));
    };
    hooks.onStyle(() => ((style = true), waitIdle(), paint()));
    hooks.onJobs((d, t) => ((jd = d), (jt = t), waitIdle(), paint()));
    paint();
  });
}

/** Show the map loader over the map until it is drawn (or CAP_MS). Shows only if it takes longer than a blink. */
export function runMapLoader(hooks: MapHooks, text: MapLoadText, parent: HTMLElement = document.body): Promise<void> {
  const wrap = document.createElement('div');
  wrap.innerHTML = bootHtml('map');
  const el = wrap.firstElementChild as HTMLElement;
  el.querySelector<HTMLElement>('.sc-lw')!.textContent = text.title;
  // Shown every time the map opens (Joseph 2026-11-16: the loader appears whenever data has to load).
  parent.appendChild(el);
  const v = view(el);
  let finished = false;
  const finish = (capped: boolean) => {
    if (finished) return Promise.resolve();
    finished = true;
    v.show(DOTS, capped ? text.slow : text.ready);
    return sleep(reduced() ? 0 : 450).then(() => v.gone());
  };
  return Promise.race([
    watchMap(hooks, (f, style) => !finished && f < 1 && v.show(litDots(f, 1), style ? text.drawing : text.tiles)).then(() => false),
    sleep(CAP_MS).then(() => true),
  ]).then(finish);
}
