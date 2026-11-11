import { describe, expect, it } from 'vitest';
import {
  CELL_DEG, KM_LAYERS, MODES, PRESETS, coastNear, isCustom, loadOrders, moveLayer, offered, offsetOfX, orderOf, placePins, PIN_SQUARE, labelRect, privateCells, saveOrders, slots,
  toggleLayer, xOfOffset, type Mask,
} from './model';
import { LAYERS } from '../layers/registry';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('kinetic map layers', () => {
  it('offers every one of the old map layers, plus its own', () => {
    for (const l of LAYERS) expect(KM_LAYERS.some((k) => k.id === l.id)).toBe(true);
    expect(offered('surf')).toContain('rating');
    expect(offered('surf')).not.toContain('heat');
    expect(offered('coral')).toContain('private');
    expect(offered('coral')).not.toContain('rating');
  });
  it('starts each mode from a preset of layers it offers, without repeats', () => {
    for (const m of MODES) {
      expect(new Set(PRESETS[m]).size).toBe(PRESETS[m].length);
      for (const id of PRESETS[m]) expect(offered(m)).toContain(id);
    }
  });
  it('keeps changes per mode and drops junk on load', () => {
    const s = mem();
    saveOrders(s, { surf: ['wind', 'rating'] });
    expect(orderOf(loadOrders(s), 'surf')).toEqual(['wind', 'rating']);
    expect(orderOf(loadOrders(s), 'fish')).toEqual([...PRESETS.fish]);
    s.setItem('ft.km.layers', JSON.stringify({ surf: ['wind', 'wind', 'nope', 'heat'], coral: 'x' }));
    expect(loadOrders(s)).toEqual({ surf: ['wind'] });
    s.setItem('ft.km.layers', '{bad');
    expect(loadOrders(s)).toEqual({});
  });
  it('turns a layer on at the top, off from anywhere, and moves it within the list', () => {
    expect(toggleLayer(['a', 'b'] as never, 'c' as never)).toEqual(['c', 'a', 'b']);
    expect(toggleLayer(['a', 'b'] as never, 'a' as never)).toEqual(['b']);
    const l = ['rating', 'wind', 'waves'] as const;
    expect(moveLayer(l, 'waves', -1)).toEqual(['rating', 'waves', 'wind']);
    expect(moveLayer(l, 'rating', -5)).toEqual([...l]);
    expect(moveLayer(l, 'rating', 9)).toEqual(['wind', 'waves', 'rating']);
    expect(isCustom({}, 'surf')).toBe(false);
    expect(isCustom({ surf: [...PRESETS.surf].reverse() }, 'surf')).toBe(true);
  });
});

describe('30-day scrubber', () => {
  it('maps offsets to the track and back', () => {
    const w = 900;
    for (const o of [0, 1, 50, 167, 168, 200, 383, 384, 500, 719, 720]) expect(offsetOfX(xOfOffset(o, w), w)).toBeCloseTo(o, 6);
    expect(xOfOffset(0, w)).toBe(0);
    expect(xOfOffset(720, w)).toBeCloseTo(w, 6);
    // The forecast week gets more than half the track.
    expect(xOfOffset(168, w) / w).toBeGreaterThan(0.5);
  });
  it('draws a bar every hour, then every 3 h, then every day, end to end', () => {
    const s = slots();
    expect(s[0].o).toBe(0);
    for (let i = 1; i < s.length; i++) expect(s[i].o).toBe(s[i - 1].o + s[i - 1].w);
    expect(s.at(-1)!.o + s.at(-1)!.w).toBe(720);
  });
});

describe('coast ribbon', () => {
  // Land west of a north-south shore at lng 0.0045 (cell centres every 0.001°).
  const cols = 10, rows = 10;
  const z = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) z[r * cols + c] = 1;
  const mask: Mask = { z, cols, rows, lon0: 0, lat0: 0.009, dlon: 0.001, dlat: 0.001 };
  it('traces the shore near a point, inside the radius', () => {
    const at: [number, number] = [0.0045, 0.0045];
    const line = coastNear(mask, at, 300);
    expect(line.length).toBeGreaterThan(2);
    for (const [lng] of line) expect(lng).toBeCloseTo(0.0045, 6);
    for (const [, lat] of line) expect(Math.abs(lat - at[1]) * 111_320).toBeLessThanOrEqual(300 + 1e-6);
  });
  it('finds nothing when no coast is near', () => {
    expect(coastNear({ ...mask, z: new Uint8Array(cols * rows) }, [0.0045, 0.0045], 300)).toEqual([]);
  });
});

describe('rating tiles', () => {
  it('never overlap, and the better spot keeps its tile', () => {
    const pins = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, x: 200 + (i % 3) * 8, y: 200 + i * 6, w: 110, h: 44, rank: i }));
    const at = placePins(pins, { w: 600, h: 600 });
    const boxes = [...at.values()].map((p) => ({ ...p, w: 110, h: 44 }));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
      }
    expect(at.has('p11')).toBe(true);
    for (const p of at.values()) expect(p.x).toBeGreaterThanOrEqual(4);
  });

  it('steps tiles around the fish zone names where it can, and covers one only when nothing else fits (PLAN 7.85)', () => {
    const pin = { id: 'a', x: 200, y: 200, w: 110, h: 44, rank: 90 };
    const first = placePins([pin], { w: 600, h: 600 }).get('a')!;
    const name = { x: first.x, y: first.y, w: 110, h: 44 };
    const moved = placePins([pin], { w: 600, h: 600 }, 4, [], [name]).get('a')!;
    expect(moved.x !== first.x || moved.y !== first.y).toBe(true);
    // Names all round: the tile still shows, over one of them.
    expect(placePins([pin], { w: 600, h: 600 }, 4, [], [{ x: 0, y: 0, w: 600, h: 600 }]).has('a')).toBe(true);
  });
  it('estimates a map label\'s box from its lines, anchor and em offset', () => {
    const r = labelRect({ x: 100, y: 100 }, [{ text: 'SNAPPER', size: 10 }, { text: 'REEF', size: 8 }], 'left', [0.5, 0]);
    expect(r.x).toBeCloseTo(105);
    expect(r.w).toBeCloseTo(7 * 10 * 0.72);
    expect(r.h).toBeCloseTo(21.6);
    expect(r.y).toBeCloseTo(100 - 10.8);
    const br = labelRect({ x: 0, y: 0 }, [{ text: 'AB', size: 10 }], 'bottom-right');
    expect(br.x).toBeCloseTo(-14.4);
    expect(br.y).toBeCloseTo(-12);
  });
  it('keeps tiles off every pin square and off the map panels', () => {
    const pins = [
      { id: 'a', x: 200, y: 200, w: 110, h: 44, rank: 90 },
      { id: 'b', x: 240, y: 150, w: 110, h: 44, rank: 50 },
      { id: 'c', x: 520, y: 520, w: 110, h: 44, rank: 70 },
    ];
    const panel = { x: 380, y: 380, w: 220, h: 220 };
    const at = placePins(pins, { w: 600, h: 600 }, 4, [panel]);
    const sq = (p: { x: number; y: number }) => ({ x: p.x - PIN_SQUARE, y: p.y - PIN_SQUARE, w: 2 * PIN_SQUARE, h: 2 * PIN_SQUARE });
    const over = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const t of at.values()) {
      const box = { x: t.x, y: t.y, w: 110, h: 44 };
      for (const p of pins) expect(over(box, sq(p))).toBe(false);
      expect(over(box, panel)).toBe(false);
    }
    // The pin under the panel has nowhere to go: it stays a square.
    expect(at.has('c')).toBe(false);
    expect(at.has('a')).toBe(true);
  });
});

describe('private coral sites', () => {
  it('shows only the 5 km cell a site is in, never the site', () => {
    const sites = [{ lng: -82.7312, lat: 9.7381 }, { lng: -82.7344, lat: 9.7302 }, { lng: -82.6113, lat: 9.6071 }];
    const cells = privateCells(sites);
    expect(cells.reduce((n, c) => n + c.n, 0)).toBe(3);
    for (const s of sites) {
      const c = cells.find((x) => s.lng >= x.lng - 1e-9 && s.lng < x.lng + CELL_DEG && s.lat >= x.lat - 1e-9 && s.lat < x.lat + CELL_DEG);
      expect(c).toBeTruthy();
      expect(c!.lng === s.lng && c!.lat === s.lat).toBe(false);
    }
    expect(privateCells([{ lng: NaN, lat: 1 }])).toEqual([]);
  });
});
