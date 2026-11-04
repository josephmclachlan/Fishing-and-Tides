import { describe, expect, it } from 'vitest';
import { movingShown } from './motion-key';
import type { LayerId } from './registry';

describe('moving-layer key (clarity CL5)', () => {
  const on = (...ids: LayerId[]) => (id: LayerId) => ids.includes(id);
  it('shows only when two or more moving layers are on', () => {
    expect(movingShown(on('waves'))).toEqual([]);
    expect(movingShown(on('waves', 'depth'))).toEqual([]);
    expect(movingShown(on('waves', 'currents')).map((m) => m.id)).toEqual(['waves', 'currents']);
    expect(movingShown(on('wind', 'waves', 'currents')).map((m) => m.id)).toEqual(['waves', 'wind', 'currents']);
  });
});

describe('fill key (persona review J10)', async () => {
  const { fillsShown } = await import('./motion-key');
  const on = (...ids: LayerId[]) => (id: LayerId) => ids.includes(id);
  const layer = (id: string, type = 'fill', minzoom = 0, maxzoom = 24, visible = true) => ({ id, type, minzoom, maxzoom, visible });
  it('names a fill layer that is on and painting at this zoom', () => {
    expect(fillsShown(on('clarity'), [layer('cl-fill')], 9).map((f) => f.id)).toEqual(['clarity']);
  });
  it('leaves out layers that are off, hidden, out of zoom range or only lines', () => {
    expect(fillsShown(on(), [layer('cl-fill')], 9)).toEqual([]);
    expect(fillsShown(on('clarity'), [layer('cl-fill', 'fill', 0, 24, false)], 9)).toEqual([]);
    expect(fillsShown(on('depth'), [layer('sf-shade', 'fill', 12)], 9)).toEqual([]);
    expect(fillsShown(on('depth'), [layer('sf-contour', 'line')], 13)).toEqual([]);
    expect(fillsShown(on('depth'), [layer('sf-shade', 'fill', 12)], 13).map((f) => f.id)).toEqual(['depth']);
  });
});
