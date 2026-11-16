import { describe, expect, it } from 'vitest';
import { markLabel } from './seafloor';

describe('markLabel (the symbol says the kind, the label says the name)', () => {
  it('drops the WRECK prefix and labels unnamed wrecks with nothing', () => {
    expect(markLabel({ kind: 'wreck', name: 'FRIDERICUS QUARTUS' })).toBe('FRIDERICUS QUARTUS');
    expect(markLabel({ kind: 'wreck', name: 'WRECK' })).toBe('');
    expect(markLabel({ kind: 'wreck' })).toBe('');
  });
  it("spells LIGHTHOUSE out instead of the chart's LT and keeps the light's character", () => {
    expect(markLabel({ kind: 'light', name: 'SIXAOLA', info: 'W 10S 12M 12NM' })).toBe('SIXAOLA LIGHTHOUSE\nW 10S 12M 12NM');
    expect(markLabel({ kind: 'light', name: 'SIXAOLA' })).toBe('SIXAOLA LIGHTHOUSE');
  });
  it('keeps REEF, which is how reefs are named', () => {
    expect(markLabel({ kind: 'reef', name: 'PUNTA CAHUITA' })).toBe('PUNTA CAHUITA REEF');
  });
});
