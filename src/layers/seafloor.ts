/**
 * Seafloor map layer (PLAN 2.6): depth shading, contours, reef zones and seamarks.
 *
 * Detail follows the zoom tiers (DESIGN.md §5):
 *  - MACRO: depth-band shading with relief and the deep contours (200 to 4000 m).
 *  - COAST: finer 15″ shading and shelf contours (10, 50, 100, 200 m, then 5, 20, 30 m),
 *    named reef outlines, wrecks, lights and harbours.
 *  - SPOT: Allen Coral Atlas reef zones (crest, flats, slopes), then bottom cover
 *    (coral/algae, seagrass, rock); the shading dims so the reef detail reads.
 */
import type { ExpressionSpecification, FilterSpecification, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { SEAFLOOR, TIER_ZOOM } from '../region';
import type { Seafloor } from '../adapters/seafloor';
import { byTier, firstSymbolId } from '../map';
import { bake, type BakeInput } from './seafloor-bake';
import type { BakedShade, BakeOut } from './seafloor-worker';
import { paintColour as cssColour } from './paint';

export { contourLines } from './seafloor-bake';

const { COAST, SPOT } = TIER_ZOOM;
/**
 * The lowest contour layer. Area fills from other layers (fishing heat, protected zones) go
 * under it, so the contours and their labels always draw on top of them.
 */
export const CONTOURS_FROM = 'sf-contour-deep';
/** Fill layers that must stay under the contours, whichever loads first. */
const FILLS_UNDER_CONTOURS = ['fh-cells', 'pz-fill'];
const FONT = ['Noto Sans Regular'];

/** Theme colours come from the CSS variables in style.css. */
function rgbOf(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [57, 255, 122];
}

/** Image source from a baked raster: the worker's PNG, or the pixels encoded here via a canvas. */
async function shadeSource(img: BakedShade) {
  let blob: Blob;
  if ('png' in img) blob = img.png;
  else {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('seafloor: toBlob failed'))), 'image/png'));
  }
  return { type: 'image' as const, url: URL.createObjectURL(blob), coordinates: img.coordinates };
}

/** Shading and contours, baked in a worker (PLAN 5.4); in-thread where workers are missing or fail. */
function bakeSeafloor(inp: BakeInput): Promise<{ macro: BakedShade; region: BakedShade; contours: FeatureCollection }> {
  if (typeof Worker === 'undefined') return Promise.resolve(bake(inp));
  return new Promise((resolve) => {
    let w: Worker;
    const inThread = (why: unknown) => {
      console.warn('seafloor: baking in-thread', why);
      w?.terminate();
      resolve(bake(inp));
    };
    try {
      w = new Worker(new URL('./seafloor-worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      return inThread(err);
    }
    w.onmessage = (e: MessageEvent<BakeOut>) => {
      w.terminate();
      if (e.data.ok) resolve(e.data);
      else inThread(e.data.message);
    };
    w.onerror = (e) => inThread(e.message);
    w.postMessage(inp);
  });
}

const HUD_NAME: Record<string, string> = { reef: 'REEF', wreck: 'WRECK', light: 'LT', harbour: '', hazard: 'HAZARD', buoy: 'BUOY' };

/** Map labels for OSM marks, e.g. "PUNTA CAHUITA REEF", "WRECK FRIDERICUS QUARTUS", "LT SIXAOLA\nW 10S 12M 12NM". */
function markLabel(p: Record<string, string>) {
  const { kind, name, info } = p;
  if (kind === 'reef') return `${name} REEF`;
  if (kind === 'light') return `LT ${name}${info ? `\n${info}` : ''}`;
  if (name === HUD_NAME[kind] || !HUD_NAME[kind]) return name;
  return `${HUD_NAME[kind]} ${name}`;
}

export async function mountSeafloor(map: Map, sf: Seafloor) {
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');
  const red = cssColour('--red', '#ff3b2f');

  // Heavy work first, off the main thread, before touching the style.
  const baked = await bakeSeafloor({ macro: sf.macro, region: sf.region, land: sf.land, rgb: rgbOf(green) });
  const [macroShade, regionShade] = await Promise.all([shadeSource(baked.macro), shadeSource(baked.region)]);
  const contours = baked.contours;
  const marks: FeatureCollection = {
    ...sf.marks,
    features: sf.marks.features.map((f) => ({ ...f, properties: { ...f.properties, label: markLabel((f.properties ?? {}) as Record<string, string>) } })),
  };

  const add = () => {
    if (map.getSource('sf-contours')) return;
    // Under the graticule and coastline glow, over the water fill.
    const below = map.getLayer('grat-macro') ? 'grat-macro' : firstSymbolId(map);
    map.addSource('sf-shade-macro', macroShade);
    map.addSource('sf-shade-region', regionShade);
    map.addSource('sf-contours', { type: 'geojson', data: contours, attribution: 'GEBCO 2026 (not for navigation)' });
    map.addSource('sf-reefs', { type: 'geojson', data: sf.reefs, attribution: 'Allen Coral Atlas' });
    map.addSource('sf-marks', { type: 'geojson', data: marks, attribution: '© OpenStreetMap' });

    const shadeOpacity = byTier(1, 0.9, 0.45);
    map.addLayer({ id: 'sf-shade-macro', type: 'raster', source: 'sf-shade-macro', paint: { 'raster-opacity': shadeOpacity, 'raster-fade-duration': 0 } }, below);
    map.addLayer({ id: 'sf-shade-region', type: 'raster', source: 'sf-shade-region', paint: { 'raster-opacity': shadeOpacity, 'raster-fade-duration': 0 } }, below);

    // Contours: majors solid, minors dashed; each set fades in at its tier.
    const d = ['get', 'd'] as ExpressionSpecification;
    const isMajor: FilterSpecification = ['==', ['get', 'major'], true];
    const line = (id: string, filter: FilterSpecification, minzoom: number, maxzoom: number, opacity: ExpressionSpecification | number, dashed: boolean) =>
      map.addLayer(
        {
          id, type: 'line', source: 'sf-contours', filter, minzoom, maxzoom,
          paint: { 'line-color': green, 'line-width': dashed ? 0.7 : byTier(0.8, 1, 1.3), 'line-opacity': opacity, ...(dashed ? { 'line-dasharray': [3, 3] } : {}) },
        },
        below,
      );
    const fadeIn = (z: number, to: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], z, 0, z + 0.6, to];
    line('sf-contour-deep', ['all', ['==', ['get', 'grid'], 'macro'], ['>=', d, 500], isMajor], 0, 24, byTier(0.45, 0.3, 0.2), false);
    line('sf-contour-deep-minor', ['all', ['==', ['get', 'grid'], 'macro'], ['>=', d, 500], ['!', isMajor]], 0, 24, byTier(0.3, 0.2, 0.15), true);
    line('sf-contour-macro-200', ['all', ['==', ['get', 'grid'], 'macro'], ['==', d, 200]], 0, COAST + 0.5, ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0.55, COAST + 0.5, 0], false);
    line('sf-contour-coast', ['all', ['==', ['get', 'grid'], 'coast'], isMajor], COAST - 0.5, 24, ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0, COAST + 0.5, 0.55, SPOT, 0.65], false);
    line('sf-contour-coast-minor', ['all', ['==', ['get', 'grid'], 'coast'], ['!', isMajor]], SEAFLOOR.minorZoom, 24, fadeIn(SEAFLOOR.minorZoom, 0.45), true);

    for (const id of FILLS_UNDER_CONTOURS) if (map.getLayer(id)) map.moveLayer(id, CONTOURS_FROM);

    // OSM named reef outlines: the coast-tier view of where the reefs are.
    const osmReef: FilterSpecification = ['==', ['get', 'kind'], 'reef-area'];
    map.addLayer({ id: 'sf-reef-area', type: 'fill', source: 'sf-marks', filter: osmReef, minzoom: 9, paint: { 'fill-color': amber, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 0.14, SPOT - 1, 0.14, SPOT, 0] } }, below);
    map.addLayer({ id: 'sf-reef-area-line', type: 'line', source: 'sf-marks', filter: osmReef, minzoom: 9, paint: { 'line-color': amber, 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 0.8, SPOT, 0.8, SPOT + 1, 0.25] } }, below);

    // Allen Coral Atlas zones: red on the crest (where it breaks), amber on the flats (awash at low tide,
    // brightest on the outer flat), faint amber on slopes and lagoons. Outlines only on crest and flats.
    const cls = ['get', 'cls'] as ExpressionSpecification;
    const zoneColour: ExpressionSpecification = ['match', cls, 'REEF CREST', red, amber];
    const zoneFill: ExpressionSpecification = ['match', cls, 'REEF CREST', 0.4, 'OUTER REEF FLAT', 0.3, ['INNER REEF FLAT', 'TERRESTRIAL REEF FLAT', 'PLATEAU'], 0.18, 0.07];
    const flats: FilterSpecification = ['in', cls, ['literal', ['REEF CREST', 'OUTER REEF FLAT', 'INNER REEF FLAT', 'TERRESTRIAL REEF FLAT', 'PLATEAU']]];
    const zone: FilterSpecification = ['==', ['get', 'layer'], 'zone'];
    const zMin = SPOT - 1;
    map.addLayer({ id: 'sf-zone-fill', type: 'fill', source: 'sf-reefs', filter: zone, minzoom: zMin, paint: { 'fill-color': zoneColour, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], zMin, 0, SPOT, zoneFill] } }, below);
    map.addLayer({ id: 'sf-zone-line', type: 'line', source: 'sf-reefs', filter: ['all', zone, flats], minzoom: zMin, paint: { 'line-color': zoneColour, 'line-width': ['interpolate', ['linear'], ['zoom'], SPOT, 0.5, 16, 1.2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], zMin, 0, SPOT, 0.55] } }, below);
    // Bottom cover, dotted: seagrass green (forage beds), coral/algae and rock amber.
    const bottom: FilterSpecification = ['all', ['==', ['get', 'layer'], 'bottom'], ['in', cls, ['literal', ['SEAGRASS', 'CORAL/ALGAE', 'ROCK']]]];
    map.addLayer({ id: 'sf-bottom-line', type: 'line', source: 'sf-reefs', filter: bottom, minzoom: 13.5, paint: { 'line-color': ['match', cls, 'SEAGRASS', green, amber], 'line-width': 1.2, 'line-dasharray': [0.5, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 0.8] } }, below);

    // Labels and marks sit with the other symbols on top.
    map.addLayer({
      id: 'sf-contour-label', type: 'symbol', source: 'sf-contours',
      filter: ['any', ['all', ['==', ['get', 'grid'], 'macro'], ['>=', d, 500], isMajor], ['all', ['==', ['get', 'grid'], 'coast'], isMajor]],
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 320, 'text-field': ['to-string', d], 'text-font': FONT, 'text-size': 10, 'text-max-angle': 30, 'text-padding': 12 },
      paint: { 'text-color': green, 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': ['step', ['zoom'], ['case', ['==', ['get', 'grid'], 'macro'], 0.8, 0], COAST, ['case', ['==', ['get', 'grid'], 'coast'], 0.9, 0.5]] },
    });
    map.addLayer({
      id: 'sf-contour-label-minor', type: 'symbol', source: 'sf-contours', minzoom: SEAFLOOR.minorZoom + 0.5,
      filter: ['all', ['==', ['get', 'grid'], 'coast'], ['!', isMajor]],
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 380, 'text-field': ['to-string', d], 'text-font': FONT, 'text-size': 9, 'text-max-angle': 30, 'text-padding': 12 },
      paint: { 'text-color': green, 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.65 },
    });

    // Marks: reefs, lights and harbours from the coast tier; wrecks and hazards closer in.
    const kind = ['get', 'kind'] as ExpressionSpecification;
    const markColour: ExpressionSpecification = ['match', kind, ['wreck', 'hazard'], red, 'harbour', green, amber];
    const marksLayer = (id: string, kinds: string[], minzoom: number, opt: { allowOverlap?: boolean } = {}) => {
      const filter: FilterSpecification = ['all', ['==', ['geometry-type'], 'Point'], ['in', kind, ['literal', kinds]]];
      map.addLayer({
        id, type: 'circle', source: 'sf-marks', minzoom, filter,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, ['match', kind, 'light', 3, 'reef', 4, 3.5], SPOT + 2, ['match', kind, 'light', 4, 'reef', 7, 5.5]],
          'circle-color': ['match', kind, 'light', amber, 'rgba(0,0,0,0)'],
          'circle-stroke-color': markColour,
          'circle-stroke-width': ['match', kind, 'light', 0, 1.5],
          'circle-blur': ['match', kind, 'light', 0.3, 0],
        },
      });
      map.addLayer({
        id: `${id}-label`, type: 'symbol', source: 'sf-marks', minzoom: minzoom + 0.5, filter,
        layout: {
          'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': ['match', kind, 'reef', 11, 10], ...(opt.allowOverlap ? { 'text-allow-overlap': true } : {}),
          'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-justify': 'left', 'text-letter-spacing': 0.08,
        },
        paint: { 'text-color': markColour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
      });
    };
    marksLayer('sf-marks', ['reef', 'light', 'harbour'], 9);
    marksLayer('sf-marks-near', ['hazard', 'buoy'], 11);
    // Wrecks stay at the spot-level zoom and normal size; on a phone their name labels were being hidden
    // by collisions with contour and reef labels, so they alone may overlap (they are few).
    marksLayer('sf-marks-wreck', ['wreck'], 11, { allowOverlap: true });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
