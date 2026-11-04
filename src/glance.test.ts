import { describe, expect, it } from 'vitest';
import { CELLS, MODES, nextMode } from './glance';

describe('glance cells', () => {
  it('shows underwater visibility in metres for snorkelling', () => {
    expect(CELLS.dive.find((c) => c.src === 'vis')).toMatchObject({ label: 'glance.vis', unit: 'unit.m', help: 'vis' });
  });

  it('keeps four values per activity and cycles through every mode', () => {
    for (const m of MODES) expect(CELLS[m]).toHaveLength(4);
    expect(nextMode('boat')).toBe('surf');
  });
});
