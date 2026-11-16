import { describe, expect, it } from 'vitest';
import {
  CELL_DEG, KM_LAYERS, MODES, PRESETS, coastNear, isCustom, loadOrders, moveLayer, offered, offsetOfX, orderOf, placeChips, DOT_R, privateCells, saveOrders, slots,
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

describe('spot number chips', () => {
  const chip = (id: string, x: number, y: number, rank: number, w = 30, h = 18) => ({ id, x, y, w, h, rank });
  const over = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const box = (c: ReturnType<typeof chip>) => ({ x: c.x - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h });
  const B = { w: 600, h: 600 };

  it('shows every chip when the spots are far apart', () => {
    const cs = [chip('a', 100, 100, 1), chip('b', 300, 100, 2), chip('c', 500, 300, 3)];
    expect(placeChips(cs, B)).toEqual({ chips: new Set(['a', 'b', 'c']), covered: new Set() });
  });
  it('never lets two chips touch, and the best spot in a cluster keeps its chip', () => {
    const cs = Array.from({ length: 12 }, (_, i) => chip(`p${i}`, 200 + (i % 3) * 8, 200 + i * 6, i));
    const { chips } = placeChips(cs, B);
    const shown = cs.filter((c) => chips.has(c.id));
    for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) expect(over(box(shown[i]), box(shown[j]))).toBe(false);
    expect(chips.has('p11')).toBe(true);
  });
  it('never covers a better spot; a worse spot under a chip waits for a closer zoom', () => {
    // b's dot sits under the edge of a's chip, so a (worse) stays a dot beside b's chip.
    const cs = [chip('a', 100, 100, 1, 40), chip('b', 100 + 20 + DOT_R - 2, 100, 5)];
    expect(placeChips(cs, B)).toEqual({ chips: new Set(['b']), covered: new Set() });
    // The chosen spot goes first, even over a better neighbour.
    expect(placeChips(cs, B, [], 'a')).toEqual({ chips: new Set(['a']), covered: new Set(['b']) });
    // A better spot that is only a dot (its chip is under a panel) keeps its dot clear.
    const panel = { x: 110, y: 80, w: 100, h: 40 };
    expect(placeChips(cs, B, [panel])).toEqual({ chips: new Set(), covered: new Set() });
  });
  it('keeps chips off the map panels and inside the screen', () => {
    const panel = { x: 380, y: 380, w: 220, h: 220 };
    const cs = [chip('a', 200, 200, 1), chip('b', 450, 450, 9), chip('c', 5, 300, 9)];
    expect(placeChips(cs, B, [panel]).chips).toEqual(new Set(['a']));
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
