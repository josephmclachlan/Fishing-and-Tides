/**
 * "What's here" (PLAN 7.12): tap bare map and a card lists the sea and wind at that point for the slider's
 * hour: swell, sea, wind, depth and visibility. Pure row-building here; main.ts supplies the samplers.
 */
import type { Map } from 'maplibre-gl';
import { t } from './i18n';

export interface HereSample {
  /** Water depth, m; undefined on land or off the grid. */
  depthM?: number;
  land: boolean;
  swell?: { hs: number; tp: number; fromDeg: number } | null;
  sea?: { hs: number; tm: number } | null;
  wind?: { ms: number; fromDeg: number } | null;
  visM?: number | null;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
const KT = 3600 / 1852;
const visText = (v: number) => (v >= 20 ? '20+' : v.toFixed(v < 3 ? 1 : 0));

/** Label/value pairs for the card, in reading order; land shows only what is true on land. */
export function hereRows(s: HereSample): [string, string][] {
  const rows: [string, string][] = [];
  if (s.land) rows.push([t('here.land'), '—']);
  else {
    if (s.swell && Number.isFinite(s.swell.hs)) rows.push([t('here.swell'), `${s.swell.hs.toFixed(1)} m · ${s.swell.tp.toFixed(0)} s · ${t('here.from')} ${compass(s.swell.fromDeg)}`]);
    if (s.sea && Number.isFinite(s.sea.hs)) rows.push([t('here.wave'), `${s.sea.hs.toFixed(1)} m · ${s.sea.tm.toFixed(0)} s`]);
  }
  if (s.wind && Number.isFinite(s.wind.ms)) rows.push([t('here.wind'), `${(s.wind.ms * KT).toFixed(0)} kt ${t('here.from')} ${compass(s.wind.fromDeg)}`]);
  if (!s.land && s.depthM !== undefined) rows.push([t('here.depth'), `${s.depthM.toFixed(s.depthM < 10 ? 1 : 0)} m`]);
  if (!s.land && s.visM != null && Number.isFinite(s.visM)) rows.push([t('here.vis'), `${visText(s.visM)} m`]);
  return rows;
}

/** Layers whose own card wins where the tap hits them (the explainers in main.ts and map-explain.ts). */
const MARKS = ['ob-dot', 'ob-label', 'lt-dot', 'st-ring', 'st-label', 'wv-crest', 'rp-site', 'rp-coast', 'sg-mat', 'sg-beach', 'cs-sites'];
const TAP_BOX_PX = 9;

let tapClaims = 0;
/** A feature that takes the next map tap for itself (e.g. picking a forecast spot) calls this, and the returned function when it is done. */
export function claimMapTap(): () => void {
  tapClaims++;
  let released = false;
  // Release after the current click has reached every handler, so this tap is not also "what's here".
  return () => {
    if (released) return;
    released = true;
    setTimeout(() => tapClaims--, 0);
  };
}

/** True while some feature has claimed map taps (other tap cards stay quiet then). */
export const mapTapClaimed = () => tapClaims > 0;

export function mountHere(map: Map, sample: (lng: number, lat: number) => HereSample, show: (title: string, rows: [string, string][], at: { x: number; y: number }) => void) {
  map.on('click', (e) => {
    if (tapClaims > 0) return;
    const layers = MARKS.filter((id) => map.getLayer(id));
    const { x, y } = e.point;
    if (layers.length && map.queryRenderedFeatures([[x - TAP_BOX_PX, y - TAP_BOX_PX], [x + TAP_BOX_PX, y + TAP_BOX_PX]], { layers }).length) return;
    show(t('here.title'), hereRows(sample(e.lngLat.lng, e.lngLat.lat)), e.point);
  });
}
