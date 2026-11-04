/**
 * Forecast time slider (PLAN 1.5): a HUD row in the bottom panel that scrubs the shared time
 * store (src/time.ts) from NOW out to 30 days in three confidence bands (see time.ts). Step buttons and PLAY give thumb-sized controls
 * on a phone; the range input keeps keyboard and screen-reader support for free.
 */
import { t, type Key } from './i18n';
import { offsetLabel, validLabel, type TimeStore } from './time';
import { POS_MAX, buttonStepH, hoursToPos, jumpToDay, posToHours, segmentFor, sliderScale } from './time-scale';
import { REGION } from './region';
import { bandFor } from './time';

/** Playback speed in slider steps per second, so every band moves at a watchable pace. */
const PLAY_STEPS_PER_S = 4;
const stepLabel = (stepH: number) => (stepH >= 24 ? `${stepH / 24}${t('time.dayUnit')}` : `${stepH}${t('time.hourUnit')}`);

export function mountTimeSlider(root: HTMLElement, time: TimeStore) {
  const bottom = root.querySelector<HTMLElement>('.dock-body');
  if (!bottom) return;
  // Today gets a wide hourly stretch, then six named days, then the 8 to 30 day outlook (time-scale.ts).
  const segs = sliderScale(time.baseMs(), REGION.tzOffsetH);
  const segLabel = (sg: (typeof segs)[number]) =>
    sg.kind === 'today' ? t('time.today') : sg.kind === 'day' ? t(`day.${sg.weekday}` as Key) : t('time.later');
  const segTitle = (sg: (typeof segs)[number]) => (sg.kind === 'later' ? t('time.laterTitle') : t('time.dayTitle'));
  const el = document.createElement('div');
  el.className = 'timebar';
  el.innerHTML = `
    <div class="ro"><span class="lbl">${t('time.fcst')}</span><span class="seg" id="t-off">${t('time.now')}</span></div>
    <div class="ro"><span class="lbl">${t('time.validUtc')}</span><span class="seg green" id="t-valid">--</span></div>
    <div class="ro band-ro"><span class="lbl">${t('time.band')}</span><span class="seg" id="t-band">${t('band.forecast')}</span></div>
    <div class="t-track">
      <input id="t-range" class="range" type="range" min="0" max="${POS_MAX}" step="1" value="0" aria-label="${t('time.aria')}" />
      <div class="t-days">${segs.map((sg, i) => `<button type="button" class="t-day t-${sg.kind}" data-seg="${i}" style="flex:${sg.toP - sg.fromP}" title="${segTitle(sg)}">${segLabel(sg)}</button>`).join('')}</div>
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
  // Track marks: a faint tick each hour of today, a bright one at each midnight (time-scale.ts).
  const pct = (p: number) => (p / POS_MAX) * 100;
  const mark = (p: number, c: string) => `transparent calc(${pct(p)}% - 1px), ${c} calc(${pct(p)}% - 1px) ${pct(p)}%, transparent ${pct(p)}%`;
  const marks: string[] = [];
  for (let h = 1; h < segs[0].toH; h++) marks.push(mark(hoursToPos(segs, h), 'var(--amber-dim)'));
  for (const sg of segs.slice(1)) marks.push(mark(sg.fromP, 'var(--green)'));
  range.style.setProperty('--ticks', `linear-gradient(to right, ${marks.join(', ')})`);
  const play = $('t-play');

  const render = () => {
    const h = time.offsetH();
    const pos = hoursToPos(segs, h);
    range.value = String(Math.round(pos));
    range.style.setProperty('--fill', `${(pos / POS_MAX) * 100}%`);
    const cur = segmentFor(segs, h);
    el.querySelectorAll<HTMLElement>('.t-day').forEach((b, i) => b.classList.toggle('on', segs[i] === cur));
    $('t-off').textContent = offsetLabel(h);
    $('t-off').className = 'seg ' + (h > 0 ? '' : 'green');
    const band = bandFor(h);
    document.body.dataset.band = band.id;
    $('t-band').textContent = t(`band.${band.id}` as Key);
    $('t-band').className = 'seg ' + (band.id === 'forecast' ? 'green' : '');
    $('t-back').textContent = '−' + stepLabel(buttonStepH(segs, h, -1));
    $('t-fwd').textContent = '+' + stepLabel(buttonStepH(segs, h, 1));
    $('t-valid').textContent = validLabel(time.validMs());
    // Same two values in the phone's bottom strip, so the chosen hour shows with the sheet closed.
    const dOff = root.querySelector<HTMLElement>('#d-off');
    const dValid = root.querySelector<HTMLElement>('#d-valid');
    if (dOff) (dOff.textContent = offsetLabel(h)), (dOff.className = 'seg ' + (h > 0 ? '' : 'green'));
    if (dValid) dValid.textContent = validLabel(time.validMs());
    $('t-back').toggleAttribute('disabled', h <= 0);
    $('t-now').toggleAttribute('disabled', h <= 0);
    $('t-fwd').toggleAttribute('disabled', h >= segs[segs.length - 1].toH);
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

  range.addEventListener('input', () => time.set(posToHours(segs, range.valueAsNumber)));
  el.querySelector('.t-days')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.t-day');
    if (!b) return;
    setPlaying(false);
    const sg = segs[Number(b.dataset.seg)];
    time.set(sg.kind === 'later' ? sg.fromH : jumpToDay(segs, sg, time.offsetH()));
  });
  // Touching the slider takes over from playback.
  range.addEventListener('pointerdown', () => setPlaying(false));
  $('t-back').addEventListener('click', () => (setPlaying(false), time.set(time.offsetH() - buttonStepH(segs, time.offsetH(), -1))));
  $('t-fwd').addEventListener('click', () => (setPlaying(false), time.set(time.offsetH() + buttonStepH(segs, time.offsetH(), 1))));
  $('t-now').addEventListener('click', () => (setPlaying(false), time.reset()));
  play.addEventListener('click', () => setPlaying(play.getAttribute('aria-pressed') !== 'true'));
}
