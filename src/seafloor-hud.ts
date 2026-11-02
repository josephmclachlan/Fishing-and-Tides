/**
 * SEAFLOOR readouts in the side panel: depth and its data source under the reticle,
 * plus the reef zone and bottom cover at the spot tier (PLAN 2.6).
 */
import type { Map } from 'maplibre-gl';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Seafloor } from './adapters/seafloor';
import { cellAt, sample, tidLabel, tidMeasured } from './physics/bathy';
import { pointInPolygon } from './geo';
import { panelHeader, readout } from './hud-kit';
import { t, type Key } from './i18n';
import { en } from './i18n/en';

/** Allen Coral Atlas classes, shortened to fit the panel (text in i18n `sf.cls.*`; unknown classes show as-is). */
const short = (cls: string | null) => (cls ? (`sf.cls.${cls}` in en ? t(`sf.cls.${cls}` as Key) : cls) : null);

const tidText = (label: string) => (`sf.tid.${label}` in en ? t(`sf.tid.${label}` as Key) : label);

type Poly = { cls: string; layer: string; bbox: [number, number, number, number]; rings: [number, number][][][] };

function index(features: Feature[]): Poly[] {
  const out: Poly[] = [];
  for (const f of features) {
    const g = f.geometry as Polygon | MultiPolygon;
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as [number, number][][][];
    const bbox: Poly['bbox'] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of polys) for (const [x, y] of p[0]) (bbox[0] = Math.min(bbox[0], x)), (bbox[1] = Math.min(bbox[1], y)), (bbox[2] = Math.max(bbox[2], x)), (bbox[3] = Math.max(bbox[3], y));
    out.push({ cls: String(f.properties?.cls ?? ''), layer: String(f.properties?.layer ?? ''), bbox, rings: polys });
  }
  return out;
}

/** Class of the first polygon in `layer` containing p, or null. */
function classAt(polys: Poly[], layer: string, p: [number, number]): string | null {
  for (const q of polys) {
    if (q.layer !== layer || p[0] < q.bbox[0] || p[0] > q.bbox[2] || p[1] < q.bbox[1] || p[1] > q.bbox[3]) continue;
    if (q.rings.some((rings) => pointInPolygon(p, rings))) return q.cls;
  }
  return null;
}

export function mountSeafloorHud(root: HTMLElement, map: Map, sf: Seafloor) {
  const side = root.querySelector<HTMLElement>('.side');
  if (!side) return;
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="wide-only">${panelHeader(t('sf.title'), t('sf.tag'))}</div>
    ${readout(t('sf.depth'), 'depth', t('unit.m'), 'green')}
    <div class="wide-only"><div class="ro"><span class="lbl">${t('sf.source')}</span><span class="seg sm" id="dsrc">--</span></div></div>
    <div class="from-spot">
      <div class="ro"><span class="lbl">${t('sf.reef')}</span><span class="seg sm" id="dzone">--</span></div>
      <div class="ro"><span class="lbl">${t('sf.bottom')}</span><span class="seg sm" id="dbottom">--</span></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;
  const reefs = index(sf.reefs.features);

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const onLand = cellAt(sf.land, c.lng, c.lat) === 1;
    let z = onLand ? 1 : sample(sf.region, c.lng, c.lat);
    let src: string;
    if (Number.isFinite(z)) {
      const tid = cellAt(sf.regionTid, c.lng, c.lat);
      src = tidText(tidLabel(tid));
      $('dsrc').className = 'seg sm ' + (tidMeasured(tid) ? 'green' : '');
    } else {
      z = sample(sf.macro, c.lng, c.lat);
      src = Number.isFinite(z) ? t('sf.gebco1') : '--';
      $('dsrc').className = 'seg sm';
    }
    // Water by the coastline but above sea level in the coarse grid: the surf zone, too shallow for GEBCO to say.
    const shore = !onLand && z >= 0;
    $('depth').textContent = onLand ? t('sf.land') : shore ? '<1' : Number.isFinite(z) ? String(Math.round(-z)) : '--';
    $('dsrc').textContent = onLand ? t('sf.osmCoast') : shore ? t('sf.shoreline') : src;
    if (document.body.dataset.tier === 'SPOT') {
      const p: [number, number] = [c.lng, c.lat];
      const zone = short(classAt(reefs, 'zone', p));
      $('dzone').textContent = zone ?? t('sf.none');
      $('dzone').className = 'seg sm ' + (zone ? '' : 'green');
      $('dbottom').textContent = short(classAt(reefs, 'bottom', p)) ?? '--';
    }
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
}
