/**
 * Forecast time slider (PLAN 1.5): a HUD row in the bottom panel that scrubs the shared time
 * store (src/time.ts) from NOW out to 30 days in three confidence bands (see time.ts). Step buttons and PLAY give thumb-sized controls
 * on a phone; the range input keeps keyboard and screen-reader support for free.
 */
import { t, type Key } from './i18n';
import { BANDS, HORIZON_H, bandFor, offsetLabel, validLabel, type TimeStore } from './time';

/** Playback speed in slider steps per second, so every band moves at a watchable pace. */
const PLAY_STEPS_PER_S = 4;
const STEP_BUTTON = 3; // band steps per press
const stepLabel = (h: number) => { const b = bandFor(h); return b.stepH === 24 ? `${STEP_BUTTON}${t('time.dayUnit')}` : `${b.stepH * STEP_BUTTON}${t('time.hourUnit')}`; };

export function mountTimeSlider(root: HTMLElement, time: TimeStore) {
  const bottom = root.querySelector<HTMLElement>('.dock-body');
  if (!bottom) return;
  const el = document.createElement('div');
  el.className = 'timebar';
  el.innerHTML = `
    <div class="ro"><span class="lbl">${t('time.fcst')}</span><span class="seg" id="t-off">${t('time.now')}</span></div>
    <div class="ro"><span class="lbl">${t('time.validUtc')}</span><span class="seg green" id="t-valid">--</span></div>
    <div class="ro band-ro"><span class="lbl">${t('time.band')}</span><span class="seg" id="t-band">${t('band.forecast')}</span></div>
    <div class="t-track">
      <input id="t-range" class="range" type="range" min="0" max="${HORIZON_H}" step="1" value="0" aria-label="${t('time.aria')}" />
      <div class="t-bands" aria-hidden="true">${BANDS.map((b, i) => `<span class="b-${b.id}" style="flex:${(BANDS[i + 1]?.fromH ?? HORIZON_H) - b.fromH}">${t(`band.${b.id}` as Key)}</span>`).join('')}</div>
    </div>
    <div class="t-btns">
      <button type="button" class="tab" id="t-back" aria-label="${t('time.back')}">−</button>
      <button type="button" class="tab" id="t-fwd" aria-label="${t('time.forward')}">+</button>
      <button type="button" class="tab" id="t-play" aria-pressed="false">${t('time.play')}</button>
      <button type="button" class="tab" id="t-now">${t('time.now')}</button>
    </div>`;
  bottom.prepend(el);

  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const range = $<HTMLInputElement>('t-range');
  const play = $('t-play');

  const render = () => {
    const h = time.offsetH();
    range.value = String(h);
    range.style.setProperty('--fill', `${(h / HORIZON_H) * 100}%`);
    $('t-off').textContent = offsetLabel(h);
    $('t-off').className = 'seg ' + (h > 0 ? '' : 'green');
    const band = bandFor(h);
    document.body.dataset.band = band.id;
    $('t-band').textContent = t(`band.${band.id}` as Key);
    $('t-band').className = 'seg ' + (band.id === 'forecast' ? 'green' : '');
    const tag = document.querySelector<HTMLElement>('.side .ph .tag');
    if (tag) tag.textContent = band.id === 'outlook' ? t('time.climateAvg') : band.id === 'lowconf' ? t('band.lowconf') : t('cond.mock');
    $('t-back').textContent = '−' + stepLabel(h - 1);
    $('t-fwd').textContent = '+' + stepLabel(h);
    $('t-valid').textContent = validLabel(time.validMs());
    // Same two values in the phone's bottom strip, so the chosen hour shows with the sheet closed.
    const dOff = root.querySelector<HTMLElement>('#d-off');
    const dValid = root.querySelector<HTMLElement>('#d-valid');
    if (dOff) (dOff.textContent = offsetLabel(h)), (dOff.className = 'seg ' + (h > 0 ? '' : 'green'));
    if (dValid) dValid.textContent = validLabel(time.validMs());
    $('t-back').toggleAttribute('disabled', h <= 0);
    $('t-now').toggleAttribute('disabled', h <= 0);
    $('t-fwd').toggleAttribute('disabled', h >= HORIZON_H);
    document.body.classList.toggle('forecast', time.isForecast());
  };
  time.subscribe(render);
  render();

  // Playback advances in real time; it loops back to NOW at the end of the horizon.
  let raf = 0;
  let last = 0;
  let acc = 0;
  const frame = (t: number) => {
    acc += ((t - last) / 1000) * PLAY_STEPS_PER_S;
    last = t;
    if (acc >= 1) {
      const whole = Math.floor(acc);
      acc -= whole;
      const before = time.offsetH();
      time.step(whole);
      if (time.offsetH() === before) time.reset(); // hit the end: loop back to NOW
    }
    raf = requestAnimationFrame(frame);
  };
  const setPlaying = (on: boolean) => {
    cancelAnimationFrame(raf);
    play.setAttribute('aria-pressed', String(on));
    play.classList.toggle('on', on);
    play.textContent = on ? t('time.pause') : t('time.play');
    if (on) {
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  range.addEventListener('input', () => time.set(range.valueAsNumber));
  // Touching the slider takes over from playback.
  range.addEventListener('pointerdown', () => setPlaying(false));
  $('t-back').addEventListener('click', () => (setPlaying(false), time.step(-STEP_BUTTON)));
  $('t-fwd').addEventListener('click', () => (setPlaying(false), time.step(STEP_BUTTON)));
  $('t-now').addEventListener('click', () => (setPlaying(false), time.reset()));
  play.addEventListener('click', () => setPlaying(play.getAttribute('aria-pressed') !== 'true'));
}
