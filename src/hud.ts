import type { Map } from 'maplibre-gl';
import { REGION, SPOTS, tierForZoom } from './region';
import type { Conditions } from './mock';
import { alertStrip, gauge, panelHeader, readout, setAlert, setGauge } from './hud-kit';
import { nearest } from './geo';
import { formatAltitude, mapAltitudeM } from './zoom-fx';
import { t, type Key } from './i18n';
import { describeAge, type AgeView } from './adapters/data-age';
import { condSlot, groupsHtml } from './cond-groups';

/** Show `html` only at `tier` and finer (CSS keys off body[data-tier]). */
const from = (tier: 'coast' | 'spot', html: string) => `<div class="from-${tier}">${html}</div>`;

const fmt = (n: number, d = 1) => n.toFixed(d);
const pad3 = (n: number) => String(Math.round(n) % 360).padStart(3, '0');

/** Where DATA AGE and connectivity come from (PLAN 5.2). */
export interface HudStatus {
  age(): AgeView;
  online(): boolean;
  /** Extra alert-strip messages (storms, heavy rain). Shown after the rip warning, joined with a dot. */
  alerts?(): string[];
}

export function mountHud(root: HTMLElement, map: Map, getData: () => Conditions, status?: HudStatus) {
  root.innerHTML = `
    <header class="panel top">
      <div class="title"><span class="blink">◉</span> FISHING&amp;TIDES <span class="dim wide-only">// ${REGION.name}</span></div>
      <div class="ro"><span class="lbl tier-lbl">${t('hud.tier')}</span><span class="seg green" id="tier">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.utc')}</span><span class="seg" id="clock">--:--:--</span></div>
      <div class="top-tabs"></div>
    </header>
    <aside class="panel side" id="cond-panel">
      ${panelHeader(t('cond.title'), t('cond.mock'))}
      ${groupsHtml(`
        <div class="ro ro-multi"><span class="lbl">${t('cond.swell')}</span><span class="seg" id="swell">--</span><span class="unit">${t('unit.m')}</span><span class="seg" id="period">--</span><span class="unit">${t('unit.s')}</span><span class="seg" id="sdir">--</span><span class="unit">${t('unit.deg')}</span></div>
        <div class="ro ro-multi"><span class="lbl">${t('cond.wind')}</span><span class="seg" id="wind">--</span><span class="unit">${t('unit.kt')}</span><span class="seg" id="wdir">--</span><span class="unit">${t('unit.deg')}</span></div>
        ${from('coast', readout(t('cond.tide'), 'tide', t('unit.m')))}
        ${from('coast', `<div class="ro"><span class="lbl">${t('cond.rip')}</span><span class="seg" id="rip">--</span></div>`)}
        ${from('coast', gauge(t('cond.ripGauge'), 'ripgauge'))}`)}
    </aside>
    <footer class="panel bottom">
      <button type="button" class="dock-bar" id="dock-bar" aria-controls="dock-body" aria-expanded="false" title="${t('sheet.time')}">
        <span class="dock-chev" aria-hidden="true"></span>
        <span class="ro d-time"><span class="seg" id="d-off">--</span><span class="seg green" id="d-valid">--</span></span>
        <span class="ro"><span class="lbl">${t('cond.tide')}</span><span class="seg" id="d-tide">--</span></span>
        <span class="ro d-status" id="d-status" hidden><span class="tag" id="d-net"></span><span class="seg" id="d-age"></span></span>
      </button>
      <div class="dock-body" id="dock-body">
      <div class="ro"><span class="lbl">${t('hud.lat')}</span><span class="seg green" id="lat">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.lon')}</span><span class="seg green" id="lon">--</span></div>
      <div class="ro wide-only"><span class="lbl">${t('hud.zoom')}</span><span class="seg green" id="zoom">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.alt')}</span><span class="seg green" id="alt">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.dataAge')}</span><span class="seg" id="age">--</span><span class="tag" id="age-net" hidden></span></div>
      <button id="sync" class="btn" title="${t('hud.syncTitle')}">${t('hud.sync')}</button>
      </div>
    </footer>
    ${alertStrip('alert')}
    <div class="reticle" aria-hidden="true"></div>`;

  // SST opens the WATER group (currents, depth and dive rows join it); the target opens PLACE.
  condSlot(root, 'water', 10)!.insertAdjacentHTML('beforeend', readout(t('cond.sst'), 'sst', t('unit.degC')));
  condSlot(root, 'place', 10)!.insertAdjacentHTML(
    'beforeend',
    from(
      'spot',
      `<div class="ro"><span class="lbl">${t('target.spot')}</span><span class="seg green" id="tgt">--</span></div>
      ${readout(t('target.range'), 'tgtrng', t('unit.km'), 'green')}
      ${readout(t('target.bearing'), 'tgtbrg', t('unit.degT'), 'green')}`,
    ),
  );

  const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;

  const updateView = () => {
    const c = map.getCenter();
    $('lat').textContent = fmt(c.lat, 4);
    $('lon').textContent = fmt(c.lng, 4);
    $('zoom').textContent = fmt(map.getZoom(), 1);
    $('alt').textContent = formatAltitude(mapAltitudeM(map));
    $('tier').textContent = t(`tier.${document.body.dataset.tier ?? tierForZoom(map.getZoom())}` as Key);
    if (document.body.dataset.tier === 'SPOT') {
      const t = nearest([c.lng, c.lat], SPOTS)!;
      $('tgt').textContent = t.point.name;
      $('tgtrng').textContent = fmt(t.distanceM / 1000, 1);
      $('tgtbrg').textContent = pad3(t.bearingDeg);
    }
  };
  map.on('move', updateView);
  updateView();

  // DATA AGE: oldest live feed, coloured per DESIGN §7. With no live feed the readings are simulated, so say so
  // rather than show an invented age. OFFLINE / CACHED stay visible on the phone strip even with the drawer shut.
  const renderStatus = () => {
    const a = status?.age() ?? describeAge(undefined, Date.now());
    const online = status?.online() ?? true;
    const tone = a.state === 'stale' ? 'red' : a.state === 'fresh' ? 'green' : '';
    const text = a.state === 'none' ? t('age.sim') : a.text;
    const net = !online ? t('net.offline') : a.fromCache ? t('net.cached') : '';
    const age = $('age');
    age.textContent = text;
    age.className = `seg ${tone}`;
    const tag = $('age-net');
    tag.hidden = !net;
    tag.textContent = net;
    // Strip: only when something needs attention (not fresh, or no network).
    const attention = !!net || a.state === 'aging' || a.state === 'stale' || a.state === 'none';
    $('d-status').hidden = !attention;
    $('d-net').hidden = !net;
    $('d-net').textContent = net;
    const dAge = $('d-age');
    dAge.textContent = text;
    dAge.className = `seg ${tone}`;
    document.body.dataset.net = !online ? 'offline' : a.fromCache ? 'cached' : 'live';
  };

  const tick = () => {
    const d = getData();
    $('clock').textContent = new Date().toISOString().slice(11, 19);
    $('swell').textContent = fmt(d.swellHeightM);
    $('period').textContent = fmt(d.swellPeriodS, 0);
    $('sdir').textContent = pad3(d.swellDirDeg);
    $('wind').textContent = fmt(d.windKt, 0);
    $('wdir').textContent = pad3(d.windDirDeg);
    $('sst').textContent = fmt(d.waterTempC);
    $('tide').textContent = $('d-tide').textContent = (d.tideM >= 0 ? '+' : '') + fmt(d.tideM, 2) + (d.tideRising ? '▲' : '▼');
    const rip = $('rip');
    rip.textContent = t(`rip.${d.ripRisk}` as Key);
    rip.className = 'seg ' + (d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setGauge($('ripgauge'), { LOW: 0.2, MOD: 0.55, HIGH: 1 }[d.ripRisk], d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setAlert($('alert'), [...(d.ripRisk === 'HIGH' ? [t('hud.alertRip')] : []), ...(status?.alerts?.() ?? [])].join(' · ') || null);
    renderStatus();
  };
  tick();
  setInterval(tick, 1000);
  // #sync is wired by sync-ui.ts (PLAN 5.1).
}
