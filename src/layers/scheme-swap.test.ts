import { describe, expect, it } from 'vitest';
import { liftedTagged, schemeSwap, type RoleSnapshot } from './paint';

const L = (gain: number, floor: number, cap: number) => ({ gain, floor, cap });
const snap = (colours: [string, string][], strong: ReturnType<typeof L>): RoleSnapshot => ({ colours: new Map(colours), lifts: [strong, strong] });

/** A minimal map: layers with paint/layout, recording what was set. */
function fakeMap(layers: { id: string; type: string; source?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> }[]) {
  return {
    getStyle: () => ({ layers }),
    setPaintProperty: (id: string, k: string, v: unknown) => void (layers.find((l) => l.id === id)!.paint![k] = v),
    setLayoutProperty: (id: string, k: string, v: unknown) => void (layers.find((l) => l.id === id)!.layout![k] = v),
  };
}

describe('schemeSwap', () => {
  it('swaps role colours in paint, nested expressions and format styles, and leaves the base map alone', () => {
    const m = fakeMap([
      { id: 'a', type: 'line', paint: { 'line-color': ['case', ['get', 'x'], '#FF0000', '#00ff00'] } },
      { id: 'b', type: 'symbol', paint: {}, layout: { 'text-field': ['format', 'x', { 'text-color': '#00FF00' }] } },
      { id: 'base', type: 'fill', source: 'openmaptiles', paint: { 'fill-color': '#ff0000' } },
    ]);
    const lift = L(1, 0, 1);
    schemeSwap(m, snap([['v--red', '#ff0000'], ['v--green', '#00ff00']], lift), snap([['v--red', '#aa0000'], ['v--green', '#00aa00']], lift));
    expect(m.getStyle().layers[0].paint).toEqual({ 'line-color': ['case', ['get', 'x'], '#aa0000', '#00aa00'] });
    expect((m.getStyle().layers[1].layout as { 'text-field': unknown[] })['text-field'][2]).toEqual({ 'text-color': '#00aa00' });
    expect(m.getStyle().layers[2].paint).toEqual({ 'fill-color': '#ff0000' });
  });

  it('re-lifts tagged wash opacities and leaves plain opacities alone', () => {
    const light = L(2, 0.16, 0.8), dark = L(1.5, 0.06, 0.7);
    const m = fakeMap([{ id: 'z', type: 'fill', paint: { 'fill-opacity': liftedTagged(0.3, light), 'line-opacity': 0.8 } }]);
    schemeSwap(m, snap([], light), snap([], dark));
    expect(m.getStyle().layers[0].paint!['fill-opacity']).toBeCloseTo(0.3 * 1.5 + 0.06, 5);
    expect(m.getStyle().layers[0].paint!['line-opacity']).toBe(0.8);
  });
});
