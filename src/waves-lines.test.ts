import { describe, expect, it } from 'vitest';
import { crestGrid, crestLine, dominantTrain } from './waves-lines';
import type { SeaState } from './adapters/waves';

const sea = (o: Partial<SeaState> = {}): SeaState => ({ hs: 1.5, tm: 8, dir: 90, swellHs: NaN, swellT: NaN, swellDir: NaN, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast', ...o });

describe('crest lines', () => {
  it('waves from the east have north-south crests', () => {
    const [[x1, y1], [x2, y2]] = crestLine(-83, 10, 90, 0.1);
    expect(x1).toBeCloseTo(x2, 9);
    expect(Math.abs(y2 - y1)).toBeCloseTo(0.1, 9);
  });
  it('waves from the north have east-west crests, stretched by 1/cos(lat)', () => {
    const [[x1, y1], [x2, y2]] = crestLine(-83, 10, 0, 0.1);
    expect(y1).toBeCloseTo(y2, 9);
    expect(Math.abs(x2 - x1)).toBeCloseTo(0.1 / Math.cos((10 * Math.PI) / 180), 6);
  });
  it('direction is the same for opposite arrival bearings', () => {
    const a = crestLine(0, 0, 40, 0.1);
    const b = crestLine(0, 0, 220, 0.1);
    expect(a[0][0]).toBeCloseTo(b[1][0], 9);
    expect(a[0][1]).toBeCloseTo(b[1][1], 9);
  });
  it('draws the swell when it carries half the height, else the mean sea', () => {
    expect(dominantTrain(sea({ swellHs: 1.2, swellDir: 40, swellT: 11 }))).toEqual({ hs: 1.2, dir: 40, periodS: 11 });
    expect(dominantTrain(sea({ swellHs: 0.3, swellDir: 40, swellT: 11 }))).toEqual({ hs: 1.5, dir: 90, periodS: 8 });
    expect(dominantTrain(sea())).toEqual({ hs: 1.5, dir: 90, periodS: 8 });
  });
  it('fills a box, skipping land and points without data', () => {
    const box: [[number, number], [number, number]] = [[0, 0], [1, 1]];
    expect(crestGrid(box, 0.25, () => sea())).toHaveLength(16);
    expect(crestGrid(box, 0.25, () => sea(), (lng) => lng > 0.5)).toHaveLength(8);
    expect(crestGrid(box, 0.25, () => null)).toHaveLength(0);
    expect(crestGrid(box, 0.25, () => sea({ hs: NaN }))).toHaveLength(0);
  });
});
