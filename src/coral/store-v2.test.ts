import { describe, expect, it } from 'vitest';
import { cleanMeasures, createCoralStore, openMissions, photosOf, upgradeSite } from './store';
import { buildConditions } from './conditions';
import { CSV_HEADER, toCSV, toGeoJSON } from './export';
import type { CoralNow } from '../adapters/coral-parse';

const mem = () => {
  const m: Record<string, string> = {};
  return { m, getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v) };
};
const site = { kind: 'nursery', name: 'N2', lng: -82.82, lat: 9.74 } as const;

describe('coral log schema 2', () => {
  it('upgrades a schema 1 site without losing visits or photos', () => {
    const v1 = { id: 's', schemaVersion: 1, kind: 'reef', name: 'Old', lng: -82.8, lat: 9.7, species: 'Orbicella', notes: 'n', photoIds: ['a', 'b'], privacy: 'private', createdAt: 10, updatedAt: 20,
      visits: [{ id: 'v', t: 5, status: 'bleaching', bleachPct: 40, notes: 'pale' }] };
    const s = upgradeSite(v1)!;
    expect(s).toMatchObject({ schemaVersion: 2, name: 'Old', species: 'Orbicella', createdAt: 10, updatedAt: 20, missions: [] });
    expect(s.photos).toEqual([{ id: 'a', addedAt: 10, caption: '', tags: [] }, { id: 'b', addedAt: 10, caption: '', tags: [] }]);
    expect(s.visits[0]).toEqual({ id: 'v', t: 5, status: 'bleaching', bleachPct: 40, notes: 'pale', actions: [] });
  });
  it('rewrites storage as schema 2 and reloads the same', () => {
    const st = mem();
    st.setItem('ft.coral.v1', JSON.stringify({ sites: [{ id: 'y', kind: 'garden', lng: 1, lat: 2, photoIds: ['p'], visits: [] }] }));
    const a = createCoralStore(st);
    a.update('y', { name: 'G' }, 3);
    expect(JSON.parse(st.m['ft.coral.v1']).schemaVersion).toBe(2);
    expect(createCoralStore(st).list()).toEqual(a.list());
  });
  it('drops bad visits, photos and missions one by one, keeping the site', () => {
    const s = upgradeSite({ id: 'x', kind: 'reef', lng: 0, lat: 0, visits: [{ id: 'ok', t: 1 }, { t: 2 }, null], photos: [{ id: 'p' }, 7], missions: [{ id: 'm', t: 9, goal: 'g', actions: ['outplant', 'bogus', 'outplant'] }, { id: 'n' }] })!;
    expect(s.visits.map((v) => v.id)).toEqual(['ok']);
    expect(s.visits[0].status).toBe('unknown');
    expect(s.photos.map((p) => p.id)).toEqual(['p']);
    expect(s.missions).toHaveLength(1);
    expect(s.missions[0].actions).toEqual(['outplant']);
  });
  it('clamps measurements to physical limits and drops non-numbers', () => {
    expect(cleanMeasures({ bleachPct: 140.4, sedimentPct: 12.6, secchiM: -1, trapMgCm2Day: 'x', waterTempC: 29.4, outplanted: 12.7 })).toEqual({ bleachPct: 100, sedimentPct: 13, secchiM: 0, waterTempC: 29.4, outplanted: 13 });
  });
  it('logs a visit with measurements, actions, team and conditions', () => {
    const s = createCoralStore(mem());
    const x = s.add({ ...site, gpsAccuracyM: 6, locSource: 'gps' }, 1);
    const v = s.addVisit(x.id, { t: 100, status: 'healthy', notes: 'ok', team: 'J+K', secchiM: 8, trapMgCm2Day: 12, actions: ['nursery', 'algae'], conditions: { at: 100, dhw: 2.1, flowRatio: 1.8 } }, 2)!;
    expect(s.list()[0]).toMatchObject({ gpsAccuracyM: 6, locSource: 'gps', updatedAt: 2 });
    expect(s.list()[0].visits[0]).toEqual({ ...v, id: v.id });
    expect(v).toMatchObject({ secchiM: 8, trapMgCm2Day: 12, team: 'J+K', actions: ['nursery', 'algae'], conditions: { at: 100, dhw: 2.1, flowRatio: 1.8 } });
    s.updateVisit(x.id, v.id, { bleachPct: 5, notes: 'later' }, 3);
    expect(s.list()[0].visits[0]).toMatchObject({ bleachPct: 5, notes: 'later', secchiM: 8 });
    expect(s.addVisit('nope', { t: 1, status: 'unknown', notes: '' })).toBeNull();
  });
  it('files photos under a visit, captions and tags them, and keeps them when the visit goes', () => {
    const s = createCoralStore(mem());
    const x = s.add(site);
    const v = s.addVisit(x.id, { t: 5, status: 'unknown', notes: '' })!;
    s.addPhoto(x.id, { id: 'site' });
    s.addPhoto(x.id, { id: 'dive', visitId: v.id, takenAt: 4 });
    s.updatePhoto(x.id, 'dive', { caption: 'colony 3', tags: ['before', ''] });
    let cur = s.list()[0];
    expect(photosOf(cur, null).map((p) => p.id)).toEqual(['site']);
    expect(photosOf(cur, v.id)).toMatchObject([{ id: 'dive', caption: 'colony 3', tags: ['before'], takenAt: 4 }]);
    s.removeVisit(x.id, v.id);
    cur = s.list()[0];
    expect(photosOf(cur, null).map((p) => p.id)).toEqual(['site', 'dive']);
    s.removePhoto(x.id, 'site');
    expect(s.list()[0].photos.map((p) => p.id)).toEqual(['dive']);
  });
  it('plans missions, completes one into a visit with its actions, and reopens it if the visit is removed', () => {
    const s = createCoralStore(mem());
    const x = s.add(site);
    const late = s.addMission(x.id, { t: 300, goal: 'Check outplants' })!;
    const m = s.addMission(x.id, { t: 200, goal: 'Outplant 20 fragments', actions: ['outplant', 'measure'] })!;
    expect(openMissions(s.list()[0]).map((q) => q.goal)).toEqual(['Outplant 20 fragments', 'Check outplants']);
    const v = s.completeMission(x.id, m.id, { t: 210, status: 'healthy', notes: '', outplanted: 20 })!;
    expect(v).toMatchObject({ missionId: m.id, actions: ['outplant', 'measure'], outplanted: 20 });
    expect(openMissions(s.list()[0]).map((q) => q.id)).toEqual([late.id]);
    s.removeVisit(x.id, v.id);
    expect(openMissions(s.list()[0])).toHaveLength(2);
    s.updateMission(x.id, late.id, { t: 100 });
    expect(s.list()[0].missions[0].id).toBe(late.id);
    s.removeMission(x.id, late.id);
    expect(s.list()[0].missions.map((q) => q.id)).toEqual([m.id]);
    expect(s.completeMission(x.id, 'nope', { t: 1, status: 'unknown', notes: '' })).toBeNull();
  });
});

describe('coral conditions snapshot', () => {
  const heat = { reef: { id: 'cahuita' }, dhw: 4.256, alert: 3, sst: 30.123, sstAnomaly: 1.04, dhwDay: 0, hotspot: 1, alertDay: 0, peakDhw: 5 } as unknown as CoralNow;
  it('keeps what is loaded, rounded, and leaves out what is missing', () => {
    expect(buildConditions(9, heat, { flowRatio: 2.345, rainMm: null, sargassum: 'LOW', hsM: NaN, lowTideM: -0.214 })).toEqual({ at: 9, reefId: 'cahuita', dhw: 4.26, alert: 3, sstC: 30.12, sstAnomalyC: 1.04, flowRatio: 2.35, sargassum: 'LOW', lowTideM: -0.21 });
    expect(buildConditions(9, null, null)).toEqual({ at: 9 });
    expect(buildConditions(9, null, null, 3.456)).toEqual({ at: 9, mudWeeks: 3.46 });
    expect(buildConditions(9, null, null, NaN)).toEqual({ at: 9 });
  });
});

describe('coral export schema 2', () => {
  const s = createCoralStore(mem());
  const x = s.add(site, 0);
  const v = s.addVisit(x.id, { t: 0, status: 'healthy', notes: 'ok', secchiM: 7.5, actions: ['algae', 'survey'], conditions: { at: 0, dhw: 1.5, lowTideM: -0.21 } })!;
  s.addPhoto(x.id, { id: 'p', visitId: v.id });
  s.addMission(x.id, { t: 864e5, goal: 'Next' });
  it('writes the new visit fields and conditions to CSV, with negative numbers unquoted', () => {
    const [head, row] = toCSV(s.list()).trim().split('\n');
    const cols = head.split(',');
    const vals = row.split(',');
    const at = (k: string) => vals[cols.indexOf(k)];
    expect(cols).toEqual(CSV_HEADER);
    expect(vals).toHaveLength(cols.length);
    expect(at('secchi_m')).toBe('7.5');
    expect(at('actions')).toBe('algae;survey');
    expect(at('photos')).toBe('1');
    expect(at('dhw')).toBe('1.5');
    expect(at('low_tide_m')).toBe('-0.21');
    expect(at('lng')).toBe('-82.82');
  });
  it('writes photos and missions to GeoJSON with ISO times', () => {
    const p = toGeoJSON(s.list()).features[0].properties;
    expect(p.photoCount).toBe(1);
    expect(p.missions[0].t).toBe('1970-01-02T00:00:00.000Z');
    expect(p.visits[0].conditions).toMatchObject({ at: '1970-01-01T00:00:00.000Z', dhw: 1.5 });
  });
});
