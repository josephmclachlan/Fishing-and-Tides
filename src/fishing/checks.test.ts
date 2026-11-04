import { describe, expect, it } from 'vitest';
import { runChecks } from '../verify/types';
import { occurrenceChecks } from './checks';

const file = (over: object = {}) => ({ fetchedAt: new Date().toISOString(), box: [-84, 9, -82, 10.5], sources: ['OBIS'], species: { snook: [[-82.8, 9.74, 2012], [-82.7, 9.7, null]] }, ...over });
const deps = (body: unknown, ok = true) => ({
  fetch: (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 503 })) as typeof fetch,
  caches: null,
  now: () => Date.now(),
});

describe('occurrence checks', () => {
  it('pass on a good file and reachable sources', async () => {
    const res = await runChecks(occurrenceChecks('/', deps(file())));
    expect(res.map((r) => r.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass']);
  });
  it('fail when the file is old, malformed or out of the box', async () => {
    const old = await runChecks(occurrenceChecks('/', deps(file({ fetchedAt: '2020-01-01T00:00:00Z' }))));
    expect(old.find((r) => r.kind === 'fresh')?.status).toBe('fail');
    const bad = await runChecks(occurrenceChecks('/', deps(file({ species: { snook: [['x']] } }))));
    expect(bad.find((r) => r.kind === 'schema')?.status).toBe('fail');
    const out = await runChecks(occurrenceChecks('/', deps(file({ species: { snook: [[10, 10, 2000]] } }))));
    expect(out.find((r) => r.kind === 'range')?.status).toBe('fail');
  });
  it('fail the reach checks when a source is down', async () => {
    const res = await runChecks(occurrenceChecks('/', deps(file(), false)));
    expect(res.filter((r) => r.kind === 'reach').every((r) => r.status === 'fail')).toBe(true);
  });
});
