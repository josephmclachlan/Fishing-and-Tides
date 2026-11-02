import type { Map } from 'maplibre-gl';
import { REGION, tierForZoom } from './region';
import type { Conditions } from './mock';
import { alertStrip, gauge, panelHeader, readout, setAlert, setGauge } from './hud-kit';

const fmt = (n: number, d = 1) => n.toFixed(d);
const pad3 = (n: number) => String(Math.round(n) % 360).padStart(3, '0');

export function mountHud(root: HTMLElement, map: Map, getData: () => Conditions) {
  root.innerHTML = `
    <header class="panel top">
      <div class="title"><span class="blink">◉</span> FISHING&amp;TIDES <span class="dim">// ${REGION.name}</span></div>
      <div class="ro"><span class="lbl">TIER</span><span class="seg green" id="tier">--</span></div>
      <div class="ro"><span class="lbl">UTC</span><span class="seg" id="clock">--:--:--</span></div>
    </header>
    <aside class="panel side">
      ${panelHeader('CONDITIONS', 'MOCK')}
      ${readout('SWELL', 'swell', 'M')}
      ${readout('PERIOD', 'period', 'S')}
      ${readout('SWL DIR', 'sdir', '°')}
      ${readout('WIND', 'wind', 'KT')}
      ${readout('WND DIR', 'wdir', '°')}
      ${readout('SST', 'sst', '°C')}
      ${readout('TIDE', 'tide', 'M')}
      <div class="ro"><span class="lbl">RIP RISK</span><span class="seg" id="rip">--</span></div>
      ${gauge('RIP', 'ripgauge')}
    </aside>
    <footer class="panel bottom">
      <div class="ro"><span class="lbl">LAT</span><span class="seg green" id="lat">--</span></div>
      <div class="ro"><span class="lbl">LON</span><span class="seg green" id="lon">--</span></div>
      <div class="ro"><span class="lbl">ZOOM</span><span class="seg green" id="zoom">--</span></div>
      <div class="ro"><span class="lbl">DATA AGE</span><span class="seg" id="age">--</span></div>
      <button id="sync" class="btn" title="Full offline download arrives in PLAN 5.1">SYNC FOR TRIP</button>
    </footer>
    ${alertStrip('alert')}
    <div class="reticle" aria-hidden="true"></div>`;

  const $ = (id: string) => root.querySelector<HTMLElement>('#' + id)!;

  const updateView = () => {
    const c = map.getCenter();
    $('lat').textContent = fmt(c.lat, 4);
    $('lon').textContent = fmt(c.lng, 4);
    $('zoom').textContent = fmt(map.getZoom(), 1);
    $('tier').textContent = tierForZoom(map.getZoom());
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
    rip.textContent = d.ripRisk;
    rip.className = 'seg ' + (d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setGauge($('ripgauge'), { LOW: 0.2, MOD: 0.55, HIGH: 1 }[d.ripRisk], d.ripRisk === 'HIGH' ? 'red' : d.ripRisk === 'MOD' ? '' : 'green');
    setAlert($('alert'), d.ripRisk === 'HIGH' ? 'HIGH RIP CURRENT RISK' : null);
    const ageH = (Date.now() - d.fetchedAt) / 3.6e6;
    const age = $('age');
    age.textContent = `${String(Math.floor(ageH)).padStart(2, '0')}H${String(Math.floor((ageH % 1) * 60)).padStart(2, '0')}`;
    age.className = 'seg ' + (ageH >= 48 ? 'red' : ageH >= 12 ? '' : 'green');
  };
  tick();
  setInterval(tick, 1000);

  $('sync').addEventListener('click', () => {
    $('sync').textContent = 'SYNC: PHASE 5';
    setTimeout(() => ($('sync').textContent = 'SYNC FOR TRIP'), 1500);
  });
}
