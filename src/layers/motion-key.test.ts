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
