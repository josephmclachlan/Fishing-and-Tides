import type { Map } from 'maplibre-gl';
import { REGION, SPOTS, tierForZoom } from './region';
import type { Conditions } from './mock';
import { alertStrip, gauge, panelHeader, readout, setAlert, setGauge } from './hud-kit';
import { nearest } from './geo';
import { formatAltitude, mapAltitudeM } from './zoom-fx';
import { t, type Key } from './i18n';

/** Show `html` only at `tier` and finer (CSS keys off body[data-tier]). */
const from = (tier: 'coast' | 'spot', html: string) => `<div class="from-${tier}">${html}</div>`;

const fmt = (n: number, d = 1) => n.toFixed(d);
const pad3 = (n: number) => String(Math.round(n) % 360).padStart(3, '0');

export function mountHud(root: HTMLElement, map: Map, getData: () => Conditions) {
  root.innerHTML = `
    <header class="panel top">
      <div class="title"><span class="blink">◉</span> FISHING&amp;TIDES <span class="dim">// ${REGION.name}</span></div>
      <div class="ro"><span class="lbl">${t('hud.tier')}</span><span class="seg green" id="tier">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.utc')}</span><span class="seg" id="clock">--:--:--</span></div>
    </header>
    <aside class="panel side">
      ${panelHeader(t('cond.title'), t('cond.mock'))}
      ${readout(t('cond.swell'), 'swell', t('unit.m'))}
      ${readout(t('cond.period'), 'period', t('unit.s'))}
      ${readout(t('cond.swellDir'), 'sdir', t('unit.deg'))}
      ${readout(t('cond.wind'), 'wind', t('unit.kt'))}
      ${readout(t('cond.windDir'), 'wdir', t('unit.deg'))}
      ${readout(t('cond.sst'), 'sst', t('unit.degC'))}
      ${from('coast', readout(t('cond.tide'), 'tide', t('unit.m')))}
      ${from('coast', `<div class="ro"><span class="lbl">${t('cond.rip')}</span><span class="seg" id="rip">--</span></div>`)}
      ${from('coast', gauge(t('cond.ripGauge'), 'ripgauge'))}
      ${from(
        'spot',
        `${panelHeader(t('target.title'))}
        <div class="ro"><span class="lbl">${t('target.spot')}</span><span class="seg green" id="tgt">--</span></div>
        ${readout(t('target.range'), 'tgtrng', t('unit.km'), 'green')}
        ${readout(t('target.bearing'), 'tgtbrg', t('unit.degT'), 'green')}`,
      )}
    </aside>
    <footer class="panel bottom">
      <div class="ro"><span class="lbl">${t('hud.lat')}</span><span class="seg green" id="lat">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.lon')}</span><span class="seg green" id="lon">--</span></div>
      <div class="ro wide-only"><span class="lbl">${t('hud.zoom')}</span><span class="seg green" id="zoom">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.alt')}</span><span class="seg green" id="alt">--</span></div>
      <div class="ro"><span class="lbl">${t('hud.dataAge')}</span><span class="seg" id="age">--</span></div>
      <button id="sync" class="btn" title="${t('hud.syncTitle')}">${t('hud.sync')}</button>
    </footer>
    ${alertStrip('alert')}
    <div class="reticle" aria-hidden="true"></div>`;

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

  const tick = () => {
    const d = getData();
    $('clock').textContent = new Date().toISOString().slice(11, 19);
    $('swell').textContent = fmt(d.swellHeightM);
    $('period').textContent = fmt(d.swellPeriodS, 0);
    $('sdir').textContent = pad3(d.swellDirDeg);
    $('wind').textContent = fmt(d.windKt, 0);
    $('wdir').textContent = pad3(d.windDirDeg);
    $('sst').textContent = fmt(d.waterTempC);
    $('tide').textContent = (d.tideM >= 0 ? '+' : '') + fmt(d.tideM, 2) + (d.tideRising ? '▲' : '▼');
    const rip = $('rip');
    rip.textContent = t(`rip.${d.ripRisk}` as Key);
    rip.className = 'seg ' + (d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setGauge($('ripgauge'), { LOW: 0.2, MOD: 0.55, HIGH: 1 }[d.ripRisk], d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setAlert($('alert'), d.ripRisk === 'HIGH' ? t('hud.alertRip') : null);
    const ageH = (Date.now() - d.fetchedAt) / 3.6e6;
    const age = $('age');
    age.textContent = `${String(Math.floor(ageH)).padStart(2, '0')}H${String(Math.floor((ageH % 1) * 60)).padStart(2, '0')}`;
    age.className = 'seg ' + (ageH >= 48 ? 'red' : ageH >= 12 ? '' : 'green');
  };
  tick();
  setInterval(tick, 1000);

  $('sync').addEventListener('click', () => {
    $('sync').textContent = t('hud.syncSoon');
    setTimeout(() => ($('sync').textContent = t('hud.sync')), 1500);
  });
}
