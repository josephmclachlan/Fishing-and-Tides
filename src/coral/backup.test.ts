import { describe, expect, it } from 'vitest';
import { crc32, unzip, zipParts } from './zip';
import { buildBackup, folderName, mergeSite, mergeSites, readBackup } from './backup';
import { upgradeSite, type CoralSite } from './store';

const bytesOf = async (parts: Uint8Array[]) => new Uint8Array(await new Blob(parts as BlobPart[]).arrayBuffer());
const reader = (buf: Uint8Array) => (o: number, l: number) => Promise.resolve(buf.slice(o, o + l));
const site = (o: object) => upgradeSite({ id: 'site-0001', kind: 'nursery', name: 'Nursery 2', lng: -82.8, lat: 9.7, visits: [], createdAt: 1, updatedAt: 1, ...o })! as CoralSite;

describe('coral backup zip', () => {
  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('round-trips entries and detects damage', async () => {
    const a = new TextEncoder().encode('{"x":1}');
    const b = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const buf = await bytesOf(zipParts([{ name: 'coral-log.json', data: a, t: 0 }, { name: 'photos/ñandú/1.jpg', data: b, t: 0 }]));
    const es = await unzip(reader(buf), buf.length);
    expect(es.map((e) => e.name)).toEqual(['coral-log.json', 'photos/ñandú/1.jpg']);
    expect(await es[1].bytes()).toEqual(b);
    buf[buf.length - 22 - 2 * 46 - 30 - 7] ^= 1; // flip a byte inside the second file's data
    const es2 = await unzip(reader(buf), buf.length);
    await expect(es2[1].bytes()).rejects.toThrow(/damaged/);
    await expect(unzip(reader(new Uint8Array(40)), 40)).rejects.toThrow(/not a zip/);
  });
});

describe('coral backup merge', () => {
  const v = (id: string, t: number, notes = '') => ({ id, t, status: 'healthy', notes, actions: [] });
  it('keeps the newer copy fields and the union of visits, photos and missions', () => {
    const a = site({ name: 'Old name', updatedAt: 10, visits: [v('v1', 1, 'mine'), v('v2', 2)], photos: [{ id: 'p1' }], missions: [{ id: 'm1', t: 5, goal: 'a', updatedAt: 3 }] });
    const b = site({ name: 'New name', updatedAt: 20, visits: [v('v1', 1, 'theirs'), v('v3', 3)], photos: [{ id: 'p2' }], missions: [{ id: 'm1', t: 5, goal: 'b', updatedAt: 9 }] });
    const m = mergeSite(a, b);
    expect(m.name).toBe('New name');
    expect(m.updatedAt).toBe(20);
    expect(m.visits.map((x) => [x.id, x.notes])).toEqual([['v1', 'theirs'], ['v2', ''], ['v3', '']]);
    expect(m.photos.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(m.missions[0].goal).toBe('b');
    expect(mergeSite(b, a)).toEqual(m);
  });
  it('adds new sites, merges known ones, skips junk and lists photos to copy', () => {
    const local = [site({ photos: [{ id: 'p1' }] })];
    const r = mergeSites(local, [site({ photos: [{ id: 'p1' }, { id: 'p2' }], updatedAt: 5 }), { ...site({ photos: [{ id: 'p3' }] }), id: 'site-0002' }, { nope: 1 }]);
    expect(r).toMatchObject({ added: 1, merged: 1 });
    expect(r.sites).toHaveLength(2);
    expect(r.newPhotoIds.sort()).toEqual(['p2', 'p3']);
    // Idempotent: importing the result again changes nothing.
    const again = mergeSites(r.sites, r.sites);
    expect(again.sites).toEqual(r.sites);
    expect(again.newPhotoIds).toEqual([]);
  });
  it('names photo folders safely', () => {
    expect(folderName(site({ name: 'Cahuita / nursery #2' }))).toBe('Cahuita-nursery-2-site-000');
    expect(folderName(site({ name: '' }))).toBe('site-site-000');
  });
});

describe('coral backup file', () => {
  it('writes the log and photos, and reads them back', async () => {
    const s = site({ photos: [{ id: 'p1', addedAt: Date.UTC(2026, 10, 4, 18) }, { id: 'gone', addedAt: 1 }], visits: [v2()] });
    function v2() { return { id: 'v1', t: 5, status: 'healthy', notes: 'x', actions: ['algae'] }; }
    const jpg = new Blob([new Uint8Array([0xff, 0xd8, 9, 9, 0xff, 0xd9])], { type: 'image/jpeg' });
    const { blob, photos, missing } = await buildBackup([s], async (id) => (id === 'p1' ? jpg : null), Date.UTC(2026, 10, 4));
    expect({ photos, missing }).toEqual({ photos: 1, missing: 1 });
    const r = await readBackup(blob);
    expect(r.log.sites[0].visits[0].actions).toEqual(['algae']);
    expect(r.log.photoFiles.p1).toBe('photos/Nursery-2-site-000/2026-11-04-p1.jpg');
    expect(new Uint8Array(await (await r.photo('p1'))!.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 9, 9, 0xff, 0xd9]));
    expect(await r.photo('gone')).toBeNull();
    await expect(readBackup(new Blob([new Uint8Array(zipParts([{ name: 'x.txt', data: new Uint8Array([1]) }]).flatMap((p) => [...p]))]))).rejects.toThrow(/not a coral backup/);
  });
});
