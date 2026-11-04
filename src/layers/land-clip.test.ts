/**
 * Every sea overlay stays off the land (Joseph, 2026-11-02: "the land is getting clarity
 * highlights"). Each layer is built against the real coastline mask and checked point by point:
 * nothing it paints may fall on a land cell. Protected areas, weather, lightning and wind are left
 * out on purpose: they belong over land too.
 */
import { describe, expect, it } from 'vitest';
import { land, macro, region } from '../physics/fixtures/seafloor';
import { cellAt, isWater, type Grid } from '../physics/bathy';
import { latOfMercY, mercY } from './seafloor-shade';
import { clarityGrid, clarityImage, seaDepthAt, type ClarityContext } from './clarity';
import { cellGeometry, STEP } from '../fishing/cells';
import { crestGrid } from '../waves-lines';
import { isotherms, sstImage, SST_PIXEL_DEG } from './sst';
import { coastTest, paintSea, type SeaImage } from './sea-image';
import { clearanceM, coastStations, glowRadius, offset } from './rip';
import type { GridSeries } from '../adapters/pack';
import type { SeaState } from '../adapters/waves';

const onLand = (lng: number, lat: number) => cellAt(land, lng, lat) === 1;
const water = (lng: number, lat: number) => isWater(land, macro, lng, lat);
/** Cahuita village, inland of the beach: the ~460 m depth grid calls much of it sea. */
const CAHUITA_TOWN: [number, number, number, number] = [-82.8445, 9.7335, -82.8385, 9.7375];
const COLOURS = { GOOD: [0, 255, 0], FAIR: [255, 176, 0], POOR: [255, 0, 0] } as const;

const ctx = (withLand: Grid | null): ClarityContext => ({
  satellite: null, rain: null, elevation: region, land: withLand, ms: 0,
  seaAt: () => ({ hs: 1.2, tp: 9 }),
});

describe('clarity stays in the sea', () => {
  it('the coarse depth grid alone puts sea in Cahuita village: the coastline mask decides', () => {
    // The bug as reported: GEBCO says sea at points the coastline calls land.
    const [w, s, e, n] = CAHUITA_TOWN;
    let wetByGebco = 0;
    for (let x = w; x <= e; x += 0.0005) for (let y = s; y <= n; y += 0.0005) if (onLand(x, y) && seaDepthAt(ctx(null), x, y) !== null) wetByGebco++;
    expect(wetByGebco).toBeGreaterThan(0);
    for (let x = w; x <= e; x += 0.0005) for (let y = s; y <= n; y += 0.0005) if (onLand(x, y)) expect(seaDepthAt(ctx(land), x, y)).toBeNull();
  });

  it('paints no pixel on land and reaches the beach', () => {
    const g = clarityGrid(ctx(land));
    const img = clarityImage(g, land, COLOURS);
    const [[w, n], [e], , [, s]] = img.coordinates;
    const yN = mercY(n), yS = mercY(s);
    let painted = 0, onShore = 0, landPainted = 0;
    for (let j = 0; j < img.height; j++) {
      const lat = latOfMercY(yN - ((j + 0.5) / img.height) * (yN - yS));
      for (let i = 0; i < img.width; i++) {
        if (!img.data[(j * img.width + i) * 4 + 3]) continue;
        const lng = w + ((i + 0.5) / img.width) * (e - w);
        painted++;
        if (onLand(lng, lat)) landPainted++;
        // A painted pixel with land one pixel away: the colour goes right up to the coastline.
        const d = 0.0006;
        if (onLand(lng + d, lat) || onLand(lng - d, lat) || onLand(lng, lat + d) || onLand(lng, lat - d)) onShore++;
      }
    }
    expect(landPainted).toBe(0);
    expect(painted).toBeGreaterThan(500_000);
    expect(onShore).toBeGreaterThan(1000);
  }, 30_000);

  it('places the image in Web Mercator rows, so the middle row is where it says', () => {
    const img = clarityImage(clarityGrid(ctx(land)), land, COLOURS);
    const [[, n], , [, s]] = img.coordinates;
    const mid = latOfMercY((mercY(n) + mercY(s)) / 2);
    // Linear-in-latitude rows would put this row ~20 m off at this latitude span.
    expect(Math.abs(mid - (n + s) / 2) * 110574).toBeGreaterThan(5);
  }, 30_000);
});

describe('fishing cells stay in the sea', () => {
  it('cuts shore cells at the coastline and leaves open-water cells whole', () => {
    // Every cell centre on water along the Cahuita to Punta Uva shore.
    let cut = 0, whole = 0;
    for (let lng = -82.85; lng < -82.68; lng += STEP)
      for (let lat = 9.63; lat < 9.75; lat += STEP) {
        if (onLand(lng, lat)) continue;
        const g = cellGeometry(land, lng, lat);
        if (g.type === 'Polygon') {
          whole++;
          continue;
        }
        cut++;
        for (const [ring] of g.coordinates) {
          // Each rectangle's centre and corner sub-squares are water (the sub-grid is about one mask cell, so an edge can be off by up to that).
          const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
          const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
          const inset = STEP / Math.ceil(STEP / land.dlon) / 2;
          for (const [x, y] of [[(x0 + x1) / 2, (y0 + y1) / 2], [x0 + inset, y0 + inset], [x1 - inset, y1 - inset], [x0 + inset, y1 - inset], [x1 - inset, y0 + inset]])
            expect(onLand(x, y)).toBe(false);
        }
      }
    expect(cut).toBeGreaterThan(50);
    expect(whole).toBeGreaterThan(cut);
  });
  it('is the plain square without a mask', () => {
    expect(cellGeometry(null, -82.8, 9.7).type).toBe('Polygon');
  });
});

describe('wave crests stay in the sea', () => {
  const sea = (): SeaState => ({ hs: 1.5, tm: 8, dir: 45, swellHs: NaN, swellT: NaN, swellDir: NaN, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast' });
  const box: [[number, number], [number, number]] = [[-83.1, 9.55], [-82.5, 10.05]];
  it('cuts crests where they cross a headland', () => {
    const hits = (crests: ReturnType<typeof crestGrid>) => {
      let n = 0;
      for (const { line: [[x0, y0], [x1, y1]] } of crests) for (let k = 0; k <= 20; k++) if (onLand(x0 + ((x1 - x0) * k) / 20, y0 + ((y1 - y0) * k) / 20)) n++;
      return n;
    };
    const mid = (c: ReturnType<typeof crestGrid>[number]) => [(c.line[0][0] + c.line[1][0]) / 2, (c.line[0][1] + c.line[1][1]) / 2] as const;
    // Uncut, some crests centred on water run onto land.
    const uncut = crestGrid(box, 0.04, sea).filter((c) => water(...mid(c)));
    const cut = crestGrid(box, 0.04, sea, water);
    expect(hits(uncut)).toBeGreaterThan(5);
    // Only a sliver narrower than the 55 m test step could slip through.
    expect(hits(cut)).toBeLessThanOrEqual(2);
    expect(cut.length).toBeGreaterThan(0.8 * uncut.length);
  });
});

describe('water temperature lines stay in the sea', () => {
  it('cuts isotherms that cross the coast', () => {
    // A synthetic SST field on the coast nest's 0.01° grid, warming steadily north-west to south-east, so lines cross the shore.
    const grid = { cols: 126, rows: 101, lon0: -83.5, lat0: 10.3, dlon: 0.01, dlat: 0.01 };
    const z = new Float32Array(grid.cols * grid.rows);
    for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) z[r * grid.cols + c] = 27 + 0.02 * c + 0.02 * r;
    const s = { meta: { grid, times: [0] }, values: { sst: [z] } } as unknown as GridSeries;
    const raw = isotherms(s, 0.25, 'coast');
    const cut = isotherms(s, 0.25, 'coast', water);
    const vertsOnLand = (fs: typeof raw) => fs.flatMap((f) => f.geometry.coordinates).filter(([x, y]) => onLand(x, y)).length;
    expect(vertsOnLand(raw)).toBeGreaterThan(0);
    expect(vertsOnLand(cut)).toBe(0);
    expect(cut.length).toBeGreaterThan(0);
  });
});

describe('rip glow stays in the surf zone', () => {
  const stations = coastStations(land);
  it('gives each shore station a radius that stops short of land', () => {
    expect(stations.length).toBeGreaterThan(300);
    let bad = 0;
    for (const st of stations) {
      expect(st.clearM).toBeGreaterThanOrEqual(15);
      expect(st.clearM).toBeLessThanOrEqual(110);
      // An independent, finer look: 32 bearings, every 4 m, out to just inside the radius.
      for (let k = 0; k < 32 && !bad; k++) for (let m = 4; m < st.clearM - 10; m += 4) if (onLand(...offset(st.p, k * 11.25, m))) bad++;
    }
    expect(bad).toBe(0);
    expect(clearanceM(land, stations[0].p)).toBeCloseTo(stations[0].clearM, 6);
  }, 30_000);
  it('draws the radius at true map scale from the coast tier in', () => {
    const e = glowRadius() as unknown[];
    expect(e[0]).toBe('interpolate');
    // At zoom 16, 100 m is 100 / (40075016.686 cos(9.79°) / 512 / 2^16) ≈ 85 px.
    const z16 = e[e.indexOf(16) + 1] as [string, number, [string, unknown, number]];
    expect(100 * z16[2][2]).toBeCloseTo(85, 0);
  });
});

/** Painted pixels of an image, and how many of them sit on land by the coastline mask. */
function audit(img: SeaImage) {
  const [[w, n], [e], , [, s]] = img.coordinates;
  const yN = mercY(n), yS = mercY(s);
  let painted = 0, onLandPx = 0;
  for (let j = 0; j < img.height; j++) {
    const lat = latOfMercY(yN - ((j + 0.5) / img.height) * (yN - yS));
    for (let i = 0; i < img.width; i++) {
      if (!img.data[(j * img.width + i) * 4 + 3]) continue;
      painted++;
      if (onLand(w + ((i + 0.5) / img.width) * (e - w), lat)) onLandPx++;
    }
  }
  return { painted, onLandPx };
}

describe('water temperature fill stays in the sea', () => {
  // A 1 km SST grid with values everywhere, land included (worse than MUR, whose land cells are empty).
  const grid = { cols: 126, rows: 101, lon0: -83.5, lat0: 10.3, dlon: 0.01, dlat: 0.01 };
  const z = Float32Array.from({ length: grid.cols * grid.rows }, (_, i) => 27 + 0.02 * (i % grid.cols));
  const s = { meta: { grid, times: [0] }, values: { sst: [z] } } as unknown as GridSeries;
  const colours = { green: [0, 255, 0], amber: [255, 176, 0], red: [255, 0, 0] } as const;
  it('paints land without the coastline and none with it', () => {
    expect(audit(sstImage(s, colours, undefined, { pixelDeg: SST_PIXEL_DEG.coast })).onLandPx).toBeGreaterThan(10_000);
    const cut = audit(sstImage(s, colours, undefined, { pixelDeg: SST_PIXEL_DEG.coast, coast: coastTest(land, macro) }));
    expect(cut.onLandPx).toBe(0);
    expect(cut.painted).toBeGreaterThan(500_000);
  }, 30_000);
});

describe('block layers (sargassum, fishing boats) stay in the sea', () => {
  it('paints a block on the shore only where it is sea', () => {
    // One 0.1° block straddling the Cahuita shore.
    const img = paintSea([-82.88, 9.7, -82.78, 9.8], 0.002, coastTest(land, macro), () => 0xffffffff);
    const a = audit(img);
    expect(a.onLandPx).toBe(0);
    expect(a.painted).toBeGreaterThan(0.2 * img.width * img.height);
    expect(a.painted).toBeLessThan(0.9 * img.width * img.height);
  });
});
