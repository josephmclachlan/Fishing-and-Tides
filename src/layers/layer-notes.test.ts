import { describe, expect, it } from 'vitest';
import { layerNotes } from './layer-notes';

describe('empty-layer notes (clarity CL15)', () => {
  it('names layers below their zoom and layers with nothing in view, not image layers', () => {
    const r = layerNotes(
      [
        { id: 'surf', minZoom: 10, rendered: 0 },
        { id: 'rip', minZoom: 9, rendered: 0 },
        { id: 'zones', minZoom: 0, rendered: 4 },
        { id: 'clarity', minZoom: 0, rendered: null },
      ],
      9.3,
    );
    expect(r).toEqual({ zoomIn: ['surf'], empty: ['rip'] });
  });
});
