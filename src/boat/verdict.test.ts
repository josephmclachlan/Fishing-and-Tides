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
  it('caps on squall, storm and heavy rain whatever the wind', () => {
    expect(boatVerdict({ vessel: 'yacht', ...calm, squall: 'high' }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'yacht', ...calm, squall: 'watch' }).verdict).toBe('marginal');
    expect(boatVerdict({ vessel: 'yacht', ...calm, stormKm: 250 }).verdict).toBe('nogo');
    expect(boatVerdict({ vessel: 'yacht', ...calm, stormKm: 800 }).verdict).toBe('marginal');
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
