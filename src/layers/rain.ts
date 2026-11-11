/**
 * RAIN NOW on the map (PLAN 7.24 item 3), part of the WEATHER layer (style ids start `rn-`): the
 * satellite rain rate as a translucent image over RAIN_BOX, and an arrow from each rain cell showing
 * where it will be in 30 minutes. With the slider in the last hour it shows the scan nearest that
 * time; up to 2 hours ahead, the newest scan moved along the motion (src/rain/nowcast.ts); beyond
 * that, nothing. Colours: green light (1-5 mm/h), amber moderate (5-15), red heavy (15+); under
 * 1 mm/h is a faint green.
 */
import type { Map, GeoJSONSource, ImageSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import type { RainCellsData } from '../adapters/rain-cells';
import { extrapolate, findCells, HORIZON_MIN, motion, type Motion } from '../rain/nowcast';
import { paintColour as cssColour } from './paint';

const ARROW_MIN = 30;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => parseInt(c + c, 16)) : [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
  return v.every(Number.isFinite) ? (v as [number, number, number]) : [255, 176, 0];
}

/** RGBA bytes for a rate field (exported for tests): alpha 0 where dry or missing. */
export function paint(field: Float32Array, colours: { green: [number, number, number]; amber: [number, number, number]; red: [number, number, number] }): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(field.length * 4));
  field.forEach((r, k) => {
    if (!(r >= 0.25)) return;
    const [c, a] = r >= 15 ? [colours.red, 200] : r >= 5 ? [colours.amber, 180] : r >= 1 ? [colours.green, 150] : [colours.green, 60];
    out.set([...c, a], k * 4);
  });
  return out;
}

export function mountRainLayer(map: Map) {
  let data: RainCellsData | null = null;
  let m: Motion | null = null;
  let validMs = Date.now();
  let ready = false;

  const draw = () => {
    if (!ready || !data || !data.frames.length) return;
    const g = data.grid;
    const last = data.frames.at(-1)!;
    const lead = (validMs - last.t) / 60000;
    let field: Float32Array | null = null;
    let arrows = false;
    if (lead >= -60 && lead <= 5) {
      // Observed: the scan nearest the slider.
      field = data.frames.reduce((b, f) => (Math.abs(f.t - validMs) < Math.abs(b.t - validMs) ? f : b)).rate;
      arrows = lead >= -15;
    } else if (lead > 5 && lead <= HORIZON_MIN + 45) {
      field = extrapolate(g, last, m, lead);
      arrows = true;
    }
    const canvas = document.createElement('canvas');
    canvas.width = g.nx;
    canvas.height = g.ny;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (field) {
      const colours = { green: rgb(cssColour('--green', '#33ff66')), amber: rgb(cssColour('--amber', '#ffb000')), red: rgb(cssColour('--red', '#ff3b30')) };
      ctx.putImageData(new ImageData(paint(field, colours), g.nx, g.ny), 0, 0);
    }
    (map.getSource('rn') as ImageSource | undefined)?.updateImage({ url: canvas.toDataURL('image/png'), coordinates: corners(data) });
    const cells = field && arrows && m && m.speedKmh >= 3 ? findCells(g, field, 2, 3) : [];
    const deg = (km: number) => km / 111.32;
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: cells.map((c) => {
        const lat = c.lngLat[1];
        const to: [number, number] = [c.lngLat[0] + deg((m!.eastKmh * ARROW_MIN) / 60) / Math.cos((lat * Math.PI) / 180), lat + deg((m!.northKmh * ARROW_MIN) / 60)];
        return { type: 'Feature', properties: { heavy: c.peakMmH >= 15 }, geometry: { type: 'LineString', coordinates: [c.lngLat, to] } };
      }),
    };
    const heads: FeatureCollection = { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: (f.geometry as GeoJSON.LineString).coordinates[1] } })) };
    (map.getSource('rn-move') as GeoJSONSource | undefined)?.setData(fc);
    (map.getSource('rn-head') as GeoJSONSource | undefined)?.setData(heads);
  };

  const corners = (d: RainCellsData): [[number, number], [number, number], [number, number], [number, number]] => {
    const g = d.grid;
    const e = g.west + g.nx * g.step;
    const s = g.north - g.ny * g.step;
    return [[g.west, g.north], [e, g.north], [e, s], [g.west, s]];
  };

  const add = () => {
    if (map.getSource('rn') || !data) return;
    const before = firstSymbolId(map);
    const blank = document.createElement('canvas');
    blank.width = blank.height = 1;
    map.addSource('rn', { type: 'image', url: blank.toDataURL('image/png'), coordinates: corners(data) });
    map.addLayer({ id: 'rn-img', type: 'raster', source: 'rn', paint: { 'raster-opacity': 0.75, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, before);
    map.addSource('rn-move', { type: 'geojson', data: EMPTY });
    map.addSource('rn-head', { type: 'geojson', data: EMPTY });
    const amber = cssColour('--amber', '#ffb000');
    const red = cssColour('--red', '#ff3b30');
    map.addLayer({ id: 'rn-move', type: 'line', source: 'rn-move', paint: { 'line-color': ['case', ['get', 'heavy'], red, amber], 'line-width': 2, 'line-dasharray': [2, 1] } }, before);
    map.addLayer({ id: 'rn-head', type: 'circle', source: 'rn-head', paint: { 'circle-radius': 3, 'circle-color': ['case', ['get', 'heavy'], red, amber], 'circle-stroke-color': '#000', 'circle-stroke-width': 1 } }, before);
    ready = true;
    draw();
  };
  const whenStyle = (fn: () => void) => (map.getLayer('grat-macro') || map.isStyleLoaded() ? fn() : map.once('style.load', fn));

  return {
    set(d: RainCellsData) {
      data = d;
      m = motion(d.grid, d.frames);
      if (!ready) whenStyle(add);
      else draw();
    },
    setTime(ms: number) {
      validMs = ms;
      draw();
    },
  };
}
