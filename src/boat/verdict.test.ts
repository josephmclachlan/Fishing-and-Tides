import { describe, expect, it } from 'vitest';
import { boatVerdict } from './verdict';

const calm = { windKt: 8, gustKt: 11, hsM: 0.5, comfort: 90, squall: 'none' as const, lightning: false, stormKm: null, rainMmH: 0 };

describe('boatVerdict', () => {
  it('is GO in calm, clear weather', () => {
    expect(boatVerdict({ vessel: 'small', ...calm })).toEqual({ verdict: 'go', reasons: [] });
  });
  it('judges the same sea differently for a small boat and a yacht', () => {
    const c = { ...calm, windKt: 18, gustKt: 24, hsM: 1.5, comfort: 60 };
    expect(boatVerdict({ vessel: 'small', ...c }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'yacht', ...c }).verdict).toBe('go');
  });
  it('is NO-GO past the limit and names the reasons worst first', () => {
    const v = boatVerdict({ vessel: 'small', ...calm, windKt: 22, gustKt: 21, lightning: true });
    expect(v.verdict).toBe('nogo');
    expect(v.reasons.map((r) => r.id)).toEqual(['lightning', 'wind', 'gust']);
  });
  it('uses the same storm and small-boat limits as the activity verdicts (audit I)', () => {
    expect(boatVerdict({ vessel: 'small', ...calm, windKt: 14 }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'small', ...calm, windKt: 13.9 }).verdict).toBe('go');
    expect(boatVerdict({ vessel: 'small', ...calm, hsM: 1.3 }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'small', ...calm, stormKm: 499 }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'small', ...calm, stormKm: 500 }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'small', ...calm, stormKm: 1501 }).verdict).toBe('go');
  });

  it('caps on squall, storm and heavy rain whatever the wind', () => {
    expect(boatVerdict({ vessel: 'yacht', ...calm, squall: 'high' }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'yacht', ...calm, squall: 'watch' }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'yacht', ...calm, stormKm: 450 }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'yacht', ...calm, stormKm: 1400 }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'yacht', ...calm, stormKm: 2000 }).verdict).toBe('go');
    expect(boatVerdict({ vessel: 'yacht', ...calm, rainMmH: 12 }).verdict).toBe('marginal');
  });
  it('ignores missing inputs', () => {
    expect(boatVerdict({ vessel: 'small' }).verdict).toBe('go');
    expect(boatVerdict({ vessel: 'small', windKt: NaN }).verdict).toBe('go');
  });
  it('uses the comfort score', () => {
    expect(boatVerdict({ vessel: 'small', comfort: 40 }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'small', comfort: 20 }).verdict).toBe('nogo');
  });
  it('flags likely flood debris as at least MARGINAL', () => {
    expect(boatVerdict({ vessel: 'yacht', ...calm, debris: 'likely' })).toEqual({ verdict: 'marginal', reasons: [{ id: 'debris', level: 'marginal' }] });
    expect(boatVerdict({ vessel: 'yacht', ...calm, debris: 'possible' }).verdict).toBe('go');
  });
});

describe('boatVerdict for a dinghy or kayak', () => {
  it('reads TOO LIGHT when there is not enough wind to sail', () => {
    const v = boatVerdict({ vessel: 'dinghy', windKt: 2, hsM: 0.3 });
    expect(v.verdict).toBe('marginal');
    expect(v.reasons[0]).toMatchObject({ id: 'light' });
    expect(boatVerdict({ vessel: 'small', windKt: 2, hsM: 0.3 }).verdict).toBe('go');
  });
  it('warns of an offshore wind and stops a strong one', () => {
    expect(boatVerdict({ vessel: 'dinghy', windKt: 8, hsM: 0.3, windSide: 'offshore' }).reasons[0]).toMatchObject({ id: 'offshore', level: 'marginal' });
    expect(boatVerdict({ vessel: 'dinghy', windKt: 13, hsM: 0.3, windSide: 'offshore' }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'dinghy', windKt: 8, hsM: 0.3, windSide: 'onshore' }).verdict).toBe('go');
  });
  it('is stricter on wind than a small motor boat', () => {
    expect(boatVerdict({ vessel: 'dinghy', windKt: 15, hsM: 0.3 }).verdict).toBe('marginal');
  });
});
