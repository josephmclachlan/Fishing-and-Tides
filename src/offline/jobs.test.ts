import { describe, expect, it } from 'vitest';
import { allChecks } from '../verify/registry';
import { JOB_FEEDS, PRECACHED_FEEDS, tripJobs } from './jobs';

describe('trip jobs', () => {
  it('sync every live feed the daily verify run checks (PLAN 7.9)', () => {
    const covered = new Set([...Object.values(JOB_FEEDS).flat(), ...PRECACHED_FEEDS]);
    const missing = [...new Set(allChecks('/').map((c) => c.feed))].filter((f) => !covered.has(f));
    expect(missing).toEqual([]);
  });
  it('has a job for every entry in the feed map, and no others', () => {
    expect(tripJobs('/').map((j) => j.name).sort()).toEqual(Object.keys(JOB_FEEDS).sort());
  });
});
