import { describe, expect, it } from 'vitest';
import { alertLevelOf, bleachShare, logTotals, riskLevelOf, sitesByReef, soften, titleCase, upcomingMissions } from './view';
import type { CoralSite } from '../coral/store';

const site = (p: Partial<CoralSite>): CoralSite => ({
  id: 'a', schemaVersion: 2, kind: 'reef', name: '', lng: -82.8, lat: 9.74, species: '', notes: '', photos: [], privacy: 'private', createdAt: 0, updatedAt: 0, visits: [], missions: [], ...p,
});

describe('coral page view', () => {
  it('maps alerts and risks onto the page colours', () => {
    expect([0, 1, 2, 3, 4, 7].map(alertLevelOf)).toEqual([3, 2, 1, 0, 0, 0]);
    expect(alertLevelOf(null)).toBeNull();
    expect([riskLevelOf('ok'), riskLevelOf('watch'), riskLevelOf('high'), riskLevelOf('none')]).toEqual([3, 2, 0, null]);
  });
  it('pales the picture with heat', () => {
    expect(bleachShare(0)).toBe(0);
    expect(bleachShare(12)).toBe(1);
    expect(bleachShare(30)).toBe(1);
    expect(bleachShare(NaN)).toBe(0);
  });
  it('turns caps into sentences, keeping acronyms and places', () => {
    expect(soften('NO ANCHORING ON CORAL. USE MOORING BUOYS WHERE SINAC HAS PLACED THEM (ART. 7).')).toBe('No anchoring on coral. Use mooring buoys where SINAC has placed them (art. 7).');
    expect(soften('CAHUITA PARK: SWIM ONLY IN COSTA RICA')).toBe('Cahuita park: Swim only in Costa Rica');
    expect(soften('STONY CORAL TISSUE LOSS (SCTLD)')).toBe('Stony coral tissue loss (SCTLD)');
    expect(soften('Already a sentence, SINAC.')).toBe('Already a sentence, SINAC.');
    expect(soften('REFUGIO GANDOCA-MANZANILLO: CONSULTE AL SINAC')).toBe('Refugio Gandoca-Manzanillo: Consulte al SINAC');
  });
  it('title-cases names', () => {
    expect(titleCase('LIMÓN · ISLA UVITA')).toBe('Limón · Isla Uvita');
    expect(titleCase('PUERTO VIEJO · COCLES')).toBe('Puerto Viejo · Cocles');
  });
  it('groups sites by reef and counts the log', () => {
    const now = Date.UTC(2026, 10, 10, 18);
    const a = site({ id: 'a', name: 'B', visits: [{ id: 'v', t: now - 5 * 864e5, status: 'healthy', notes: '', actions: [], outplanted: 12 }] });
    const b = site({ id: 'b', name: 'A', kind: 'nursery', missions: [{ id: 'm1', t: Date.UTC(2026, 10, 1, 12), goal: 'late', actions: [], notes: '', createdAt: 0, updatedAt: 0 }, { id: 'm2', t: Date.UTC(2026, 10, 20, 12), goal: 'soon', actions: [], notes: '', createdAt: 0, updatedAt: 0 }] });
    const c = site({ id: 'c', name: 'C' });
    const g = sitesByReef([a, b, c], (s) => (s.id === 'c' ? 'limon' : 'cahuita'), ['limon', 'cahuita']);
    expect(g.map((x) => [x.reefId, x.sites.map((s) => s.name)])).toEqual([['limon', ['C']], ['cahuita', ['A', 'B']]]);
    const ups = upcomingMissions([a, b, c], now);
    expect(ups.map((u) => [u.mission.goal, u.overdue])).toEqual([['late', true], ['soon', false]]);
    expect(logTotals([a, b, c], now)).toEqual({ sites: 3, reef: 2, nursery: 1, garden: 0, visits30: 1, outplanted: 12, open: 2, overdue: 1 });
  });
});

describe('soften extras', () => {
  it('keeps Secchi, Kd490 and month names', () => {
    expect(soften('YOUR SECCHI READINGS. SATELLITE KD490, AUG–OCT.')).toBe('Your Secchi readings. Satellite Kd490, Aug–Oct.');
  });
});
