/**
 * The daily verify run (PLAN 2.8): every adapter's checks from src/verify/registry.ts against
 * the live site, the same list the SYSTEM CHECK panel runs. Runs under Vitest (which resolves
 * the app's imports and import.meta.env) via `npm run verify`; writes verify-report.json and
 * verify-report.md for the workflow to post. It never fails the run itself: the workflow
 * decides what to do from the results.
 *
 *   VERIFY_BASE=https://josephmclachlan.github.io/Fishing-and-Tides/ npm run verify
 */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { allChecks } from '../../src/verify/registry';
import { runChecks } from '../../src/verify/types';
import { groupByFeed } from '../../src/verify/report';
import { formatReport } from '../../src/verify/daily';

it('runs every feed check', async () => {
  const site = process.env.VERIFY_BASE ?? 'https://josephmclachlan.github.io/Fishing-and-Tides/';
  const at = Date.now();
  const results = await runChecks(allChecks(site));
  writeFileSync('verify-report.json', JSON.stringify({ at, site, results }, null, 1));
  writeFileSync('verify-report.md', formatReport(results, at, site));
  for (const f of groupByFeed(results)) console.log(`${f.status.toUpperCase().padEnd(4)} ${f.feed}`);
});
