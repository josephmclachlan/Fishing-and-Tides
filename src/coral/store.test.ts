import { describe, expect, it, vi } from 'vitest';
import { createCoralStore } from './store';
import { toCSV, toGeoJSON } from './export';

const mem = () => {
  const m: Record<string, string> = {};
  return { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v) };
};
const site = { kind: 'garden', name: 'Garden A', lng: -82.7, lat: 9.7 } as const;

describe('coral store', () => {
  it('adds private, versioned, timestamped sites with a unique id', () => {
    const s = createCoralStore(mem());
    const a = s.add(site, 100);
    const b = s.add(site, 100);
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ privacy: 'private', schemaVersion: 2, photos: [], missions: [], createdAt: 100, updatedAt: 100, visits: [], species: '', notes: '' });
  });
  it('persists across a restart', () => {
    const st = mem();
    const a = createCoralStore(st);
    const x = a.add(site);
    a.addVisit(x.id, { t: 5, status: 'bleaching', bleachPct: 30, notes: 'pale' });
    const b = createCoralStore(st);
    expect(b.list()[0].visits[0]).toMatchObject({ status: 'bleaching', bleachPct: 30 });
  });
  it('keeps visits in date order, updates updatedAt, removes and notifies', () => {
    const s = createCoralStore(mem());
    const fn = vi.fn();
    s.subscribe(fn);
    const x = s.add(site, 1);
    s.addVisit(x.id, { t: 9, status: 'healthy', notes: '' }, 50);
    s.addVisit(x.id, { t: 3, status: 'unknown', notes: '' }, 60);
    expect(s.list()[0].visits.map((v) => v.t)).toEqual([3, 9]);
    expect(s.list()[0].updatedAt).toBe(60);
    s.removeVisit(x.id, s.list()[0].visits[0].id);
    s.update(x.id, { name: 'B' }, 70);
    expect(s.list()[0]).toMatchObject({ name: 'B', updatedAt: 70 });
    expect(s.list()[0].visits).toHaveLength(1);
    s.remove(x.id);
    expect(s.list()).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(6);
  });
  it('drops invalid stored records and survives corrupt or blocked storage', () => {
    const st = mem();
    st.setItem('ft.coral.v1', JSON.stringify({ sites: [{ id: 'x' }, { id: 'y', kind: 'reef', lng: 1, lat: 2, visits: [] }] }));
    expect(createCoralStore(st).list().map((s) => s.id)).toEqual(['y']);
    const bad = { getItem: () => '{nope', setItem: () => { throw new Error('full'); } };
    const s = createCoralStore(bad);
    s.add(site);
    expect(s.list()).toHaveLength(1);
  });
});

describe('coral export', () => {
  const s = createCoralStore(mem());
  const x = s.add({ ...site, name: '=cmd, "q"', depthM: 4 }, 0);
  s.addVisit(x.id, { t: 0, status: 'healthy', bleachPct: 0, notes: 'ok' });
  it('writes GeoJSON points with visits', () => {
    const g = toGeoJSON(s.list());
    expect(g.features[0].geometry.coordinates).toEqual([-82.7, 9.7]);
    expect(g.features[0].properties.visits).toHaveLength(1);
  });
  it('writes CSV with quoting and formula guard', () => {
    const lines = toCSV(s.list()).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=cmd, ""q"""`);
  });
});

import { fitSize } from './photos';
describe('coral photos and moves', () => {
  it('scales photos down by the long side and never up', () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 1280, h: 960 });
    expect(fitSize(600, 800)).toEqual({ w: 600, h: 800 });
  });
  it('moves a site and tracks photos, and old records get an empty photo list', () => {
    const st = mem();
    st.setItem('ft.coral.v1', JSON.stringify({ sites: [{ id: 'y', kind: 'reef', lng: 1, lat: 2, visits: [] }] }));
    const s = createCoralStore(st);
    expect(s.list()[0].photos).toEqual([]);
    s.update('y', { lng: 3, lat: 4 }, 9);
    s.addPhoto('y', { id: 'p1' }, 9);
    expect(s.list()[0]).toMatchObject({ lng: 3, lat: 4, photos: [{ id: 'p1', addedAt: 9, caption: '', tags: [] }], updatedAt: 9 });
  });
});
