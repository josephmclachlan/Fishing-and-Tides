import { describe, expect, it } from 'vitest';
import { ACTIVITIES, hazardLevel, verdict, verdictConfidence, type VerdictInputs } from './verdict';
import { outingScore } from './physics/outing';
import { safetyTerm } from './physics/safety';

// A calm morning: light wind, small sea, good surf, and a clear, still reef for both dive depths.
const reef = outingScore({ surgeMs: 0.05, visM: 12, windMs: 3, waterM: 3, localHour: 10 });
const calm: VerdictInputs = {
  windKt: 10, hsM: 0.6, comfort: 'comfortable', rip: 'LOW', surf: 'GOOD', breakerM: 1.2, bite: 70,
  outing: { snorkel: reef, dive: reef }, band: 'forecast', leadH: 0,
};
const keys = (a: (typeof ACTIVITIES)[number], i: VerdictInputs) => verdict(a, i).reasons.map((r) => r.key);

describe('verdict', () => {
  it('says GO with the reasons to go on a good day', () => {
    expect(reef.score).toBeGreaterThanOrEqual(70);
    for (const a of ACTIVITIES) expect(verdict(a, calm).level, a).toBe('GO');
    expect(keys('fish', calm)).toEqual(['vd.r.calmSea', 'vd.r.biteGood']);
    expect(verdict('snorkel', calm).reasons).toEqual([{ key: 'vd.r.outingGood', level: 'GO', value: reef.score }]);
  });

  it('turns the sun activities MARGINAL in dangerous heat, not the swims (PLAN 7.58d)', () => {
    const hot = { ...calm, feelsC: 40.4 };
    expect(verdict('surf', hot).level).toBe('MARGINAL');
    expect(verdict('fish', hot).reasons[0]).toEqual({ key: 'vd.r.heat', level: 'MARGINAL', value: 40 });
    expect(verdict('snorkel', hot).level).toBe('GO');
    expect(verdict('dive', hot).level).toBe('GO');
    expect(verdict('surf', { ...calm, feelsC: 36 }).level).toBe('GO');
    expect(verdict('surf', { ...calm, feelsC: null }).level).toBe('GO');
  });

  it('reads snorkel and dive from the outing score, each at its own depth', () => {
    // Surge that is fine at 2 m for a snorkeller but not at 6 m for a diver, say: the two can differ.
    const surgy = outingScore({ surgeMs: 0.5, visM: 12, windMs: 3, waterM: 3, localHour: 10 });
    const v = verdict('dive', { ...calm, outing: { snorkel: reef, dive: surgy } });
    expect(v.level).toBe('NO-GO');
    expect(v.reasons[0]).toEqual({ key: 'dive.r.surge', level: 'NO-GO' });
    expect(verdict('snorkel', { ...calm, outing: { snorkel: reef, dive: surgy } }).level).toBe('GO');
    const murky = outingScore({ surgeMs: 0.05, visM: 4, windMs: 3, waterM: 3, localHour: 10 });
    expect(murky.score).toBeGreaterThanOrEqual(40);
    expect(murky.score).toBeLessThan(70);
    expect(verdict('snorkel', { ...calm, outing: { snorkel: murky } }).level).toBe('MARGINAL');
  });

  it('takes the worst rule and lists worst reasons first, three at most', () => {
    const v = verdict('fish', { ...calm, windKt: 22, hsM: 1.5, comfort: 'rough', heavyRain: true });
    expect(v.level).toBe('NO-GO');
    expect(v.reasons[0]).toEqual({ key: 'vd.r.windHigh', level: 'NO-GO', value: 22 });
    expect(v.reasons.length).toBe(3);
    expect(v.reasons.slice(1).every((r) => r.level === 'MARGINAL')).toBe(true);
  });

  it('judges the surf by the break, its size and its rips', () => {
    expect(verdict('surf', { ...calm, surf: 'FLAT' }).level).toBe('NO-GO');
    expect(verdict('surf', { ...calm, surf: 'FAIR' }).level).toBe('MARGINAL');
    expect(verdict('surf', { ...calm, breakerM: 3.5 }).reasons[0].key).toBe('vd.r.surfBig');
    expect(verdict('surf', { ...calm, rip: 'HIGH' }).level).toBe('MARGINAL');
  });

  it('uses the shared safety cap for weather, so every activity agrees', () => {
    expect(hazardLevel(safetyTerm(true, 'none'))).toBe('NO-GO');
    expect(hazardLevel(safetyTerm(false, 'high'))).toBe('NO-GO');
    expect(hazardLevel(safetyTerm(false, 'watch'))).toBe('MARGINAL');
    expect(hazardLevel(safetyTerm(false, 'none'))).toBe('GO');
    for (const a of ACTIVITIES) {
      expect(verdict(a, { ...calm, lightningKm: 12 }).level, a).toBe('NO-GO');
      expect(verdict(a, { ...calm, squall: 'high' }).level, a).toBe('NO-GO');
      expect(verdict(a, { ...calm, squall: 'watch' }).level, a).toBe('MARGINAL');
    }
    // Lightning is an observation: it says nothing about tomorrow.
    expect(verdict('fish', { ...calm, lightningKm: 12, leadH: 24 }).level).toBe('GO');
    // The outing score's own STORM RISK is not repeated next to the named hazard.
    const capped = outingScore({ surgeMs: 0.05, visM: 12, windMs: 3, waterM: 3, localHour: 10, squall: 'high' });
    expect(keys('dive', { ...calm, squall: 'high', outing: { dive: capped } })).toEqual(['vd.r.squall', 'vd.r.outing']);
  });

  it('weighs a tropical storm by distance', () => {
    expect(verdict('fish', { ...calm, stormKm: 300 }).level).toBe('NO-GO');
    expect(verdict('surf', { ...calm, stormKm: 1200 }).level).toBe('MARGINAL');
  });

  it("gives no verdict without the activity's key inputs, unless something already rules it out", () => {
    expect(verdict('surf', { band: 'forecast' }).level).toBeNull();
    expect(verdict('snorkel', { rip: 'LOW', outing: { dive: reef } }).level).toBeNull();
    expect(verdict('surf', { lightningKm: 5 }).level).toBe('NO-GO');
  });

  it('trusts the near forecast more than the far one', () => {
    expect(verdictConfidence('forecast', 24)).toBe('HIGH');
    expect(verdictConfidence('forecast', 120)).toBe('MED');
    expect(verdictConfidence('lowconf', 200)).toBe('LOW');
    expect(verdict('fish', { ...calm, band: 'outlook', leadH: 500 }).confidence).toBe('LOW');
  });
});
