/**
 * Verify tool building blocks (DESIGN.md §10, PLAN 2.8/2.9). Each adapter exports a list of
 * `Check`s built from these helpers; the daily GitHub Action (2.8) and the SYSTEM CHECK
 * panel (2.9) run the same list. Pure apart from whatever a check's `run` fetches.
 */

export type CheckKind = 'reach' | 'fresh' | 'schema' | 'range' | 'agree';
/** pass = green, warn = amber (stale or sources disagree), fail = red. */
export type Status = 'pass' | 'warn' | 'fail';

export interface Outcome {
  status: Status;
  detail: string;
}

export interface Check {
  feed: string;
  kind: CheckKind;
  /** One line saying what is checked, e.g. "Hs within 0..8 m". */
  label: string;
  run(): Promise<Outcome>;
}

export interface CheckResult extends Outcome {
  feed: string;
  kind: CheckKind;
  label: string;
  /** Epoch ms the check ran. */
  at: number;
}

const worst = (a: Status, b: Status): Status => (a === 'fail' || b === 'fail' ? 'fail' : a === 'warn' || b === 'warn' ? 'warn' : 'pass');
export const worstOf = (xs: readonly { status: Status }[]): Status => xs.reduce<Status>((s, x) => worst(s, x.status), 'pass');

/** Data age against the source's expected cadence: amber past 2 cadences, red past 4. */
export function freshness(ageMs: number, cadenceMs: number): Outcome {
  const h = (ageMs / 3.6e6).toFixed(1);
  if (!Number.isFinite(ageMs) || ageMs < -5 * 60e3) return { status: 'fail', detail: 'no valid timestamp' };
  if (ageMs > 4 * cadenceMs) return { status: 'fail', detail: `${h} h old` };
  if (ageMs > 2 * cadenceMs) return { status: 'warn', detail: `${h} h old` };
  return { status: 'pass', detail: `${h} h old` };
}

/**
 * Physical range: every finite value must sit in [min, max]. NaN is "no data" and ignored,
 * but if more than `maxMissing` of the values are NaN the check warns.
 */
export function inRange(values: Iterable<number>, min: number, max: number, unit: string, maxMissing = 1): Outcome {
  let n = 0, nan = 0, bad = 0, lo = Infinity, hi = -Infinity;
  for (const x of values) {
    n++;
    if (!Number.isFinite(x)) { nan++; continue; }
    if (x < lo) lo = x;
    if (x > hi) hi = x;
    if (x < min || x > max) bad++;
  }
  const span = lo <= hi ? `${lo.toFixed(2)}..${hi.toFixed(2)} ${unit}` : 'no values';
  if (n === 0 || nan === n) return { status: 'fail', detail: 'no values' };
  if (bad) return { status: 'fail', detail: `${bad} of ${n} outside ${min}..${max} ${unit} (${span})` };
  if (nan / n > maxMissing) return { status: 'warn', detail: `${Math.round((100 * nan) / n)}% missing (${span})` };
  return { status: 'pass', detail: span };
}

/** Two sources measuring the same thing: RMS difference against a tolerance (amber past it, red past 2×). */
export function agreement(a: readonly number[], b: readonly number[], tol: number, unit: string): Outcome {
  let s = 0, n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) { s += (a[i] - b[i]) ** 2; n++; }
  }
  if (!n) return { status: 'warn', detail: 'no overlapping values' };
  const rms = Math.sqrt(s / n);
  const detail = `RMS diff ${rms.toFixed(3)} ${unit} over ${n}`;
  return { status: rms > 2 * tol ? 'fail' : rms > tol ? 'warn' : 'pass', detail };
}

/** Run checks in parallel; a check that throws becomes a red result naming the error. */
export async function runChecks(checks: readonly Check[], now = Date.now): Promise<CheckResult[]> {
  return Promise.all(
    checks.map(async (c) => {
      let o: Outcome;
      try {
        o = await c.run();
      } catch (err) {
        o = { status: 'fail', detail: err instanceof Error ? err.message : String(err) };
      }
      return { feed: c.feed, kind: c.kind, label: c.label, at: now(), ...o };
    }),
  );
}
