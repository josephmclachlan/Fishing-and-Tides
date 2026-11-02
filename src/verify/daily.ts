/**
 * The daily verify Action's report and issue decision (PLAN 2.8), on top of the SYSTEM CHECK
 * grouping in ./report (2.9). Pure.
 */
import type { CheckResult, Status } from './types';
import { groupByFeed } from './report';

const LAMP: Record<Status, string> = { pass: '🟢', warn: '🟠', fail: '🔴' };

/** Markdown: a one-line verdict, a table per feed, failing and amber checks spelled out. */
export function formatReport(results: readonly CheckResult[], at: number, site: string): string {
  const feeds = groupByFeed(results);
  const failing = feeds.filter((f) => f.status === 'fail');
  const amber = feeds.filter((f) => f.status === 'warn');
  const verdict = failing.length
    ? `**${failing.length} feed${failing.length > 1 ? 's' : ''} failing:** ${failing.map((f) => f.feed).join(', ')}`
    : amber.length
      ? `All feeds up; ${amber.length} degraded: ${amber.map((f) => f.feed).join(', ')}`
      : 'All feeds pass.';
  const rows = feeds.map((f) => {
    const bad = f.results.filter((r) => r.status !== 'pass');
    const what = bad.length ? bad.map((r) => `${LAMP[r.status]} ${r.label}: ${r.detail}`).join('<br>') : `${f.results.length} checks pass`;
    return `| ${LAMP[f.status]} | \`${f.feed}\` | ${what} |`;
  });
  return [
    `SYSTEM CHECK ${new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC against ${site}`,
    '',
    verdict,
    '',
    '| | Feed | Checks |',
    '|---|---|---|',
    ...rows,
  ].join('\n');
}

/** What the Action should do with the tracking issue. */
export function issueAction(results: readonly CheckResult[], issueOpen: boolean): 'open' | 'update' | 'close' | 'none' {
  const failing = results.some((r) => r.status === 'fail');
  if (failing) return issueOpen ? 'update' : 'open';
  return issueOpen ? 'close' : 'none';
}
