/**
 * SYSTEM CHECK data layer (PLAN 2.9): group raw `CheckResult`s by feed for the panel, and keep the
 * last run on the device so the panel can show it (with its age) when there is no network.
 * Pure apart from the storage it is given.
 */
import { worstOf, type CheckResult, type Status } from './types';

export interface FeedReport {
  feed: string;
  status: Status;
  results: CheckResult[];
  passed: number;
  /** The first failing (else warning) check, i.e. the one to show on the collapsed row. */
  worst: CheckResult | null;
}

const RANK: Record<Status, number> = { fail: 0, warn: 1, pass: 2 };

/** One report per feed, worst feeds first, then in the order the feeds were first seen. */
export function groupByFeed(results: readonly CheckResult[]): FeedReport[] {
  const by = new Map<string, CheckResult[]>();
  for (const r of results) (by.get(r.feed) ?? by.set(r.feed, []).get(r.feed)!).push(r);
  const reports = [...by.entries()].map(([feed, rs]) => {
    const status = worstOf(rs);
    return { feed, status, results: rs, passed: rs.filter((r) => r.status === 'pass').length, worst: rs.find((r) => r.status === status && status !== 'pass') ?? null };
  });
  return reports.map((r, i) => ({ r, i })).sort((a, b) => RANK[a.r.status] - RANK[b.r.status] || a.i - b.i).map((x) => x.r);
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KEY = 'ft.check';

export function saveResults(storage: Storage | undefined, results: readonly CheckResult[]) {
  try {
    storage?.setItem(KEY, JSON.stringify(results));
  } catch {
    /* private mode: the panel just has no last result next time */
  }
}

const STATUSES = new Set<string>(['pass', 'warn', 'fail']);
const KINDS = new Set<string>(['reach', 'fresh', 'schema', 'range', 'agree']);

export function loadResults(storage: Storage | undefined): CheckResult[] {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return [];
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (r): r is CheckResult =>
        !!r && typeof r.feed === 'string' && typeof r.label === 'string' && typeof r.detail === 'string' && Number.isFinite(r.at) && STATUSES.has(r.status) && KINDS.has(r.kind),
    );
  } catch {
    return [];
  }
}

/** When the stored run happened: the oldest result in it (they are stamped as they finish). */
export const lastRunAt = (results: readonly CheckResult[]): number | null => (results.length ? Math.min(...results.map((r) => r.at)) : null);
