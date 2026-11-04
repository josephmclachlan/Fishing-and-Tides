/**
 * BREAK rows in the side panel from the coast tier in (PLAN 6.4): the nearest catalog break within
 * 1.5 km of the reticle, its type and the way it faces, its hazards, and a CHECK tag when the guides
 * disagree or only one covers it. INFO opens a card with the guides it came from. The SURF row is
 * the surf model's rating (PLAN 6.3): band, score out of 10 and the wind relative to the shore.
 */
import { condSlot } from './cond-groups';
import type { Map } from 'maplibre-gl';
import { t, type Key } from './i18n';
import { breaksNear, compass8 } from './surf-breaks';
import type { SurfBreak } from './data/surf-breaks';
import type { SurfQuality } from './surf-quality';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function mountSurfHud(root: HTMLElement, map: Map, quality: (name: string) => SurfQuality | undefined = () => undefined) {
  const side = condSlot(root, 'waves', 30);
  if (!side) return { refresh() {} };
  side.insertAdjacentHTML(
    'beforeend',
    `<div class="from-coast">
      <div class="ro"><span class="lbl">${t('surf.title')}</span><span class="seg sm green" id="sb-name">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.q')}</span><span class="seg sm" id="sb-q">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.surface')}</span><span class="seg sm" id="sb-surf">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.trend')}</span><span class="seg sm" id="sb-trend">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.tide')}</span><span class="seg sm" id="sb-tide">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.warn')}</span><span class="seg sm" id="sb-warn">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.type')}</span><span class="seg sm" id="sb-type">--</span></div>
      <div class="ro"><span class="lbl">${t('surf.hazard')}</span><span class="seg sm" id="sb-haz">--</span></div>
      <div class="ro"><button type="button" class="tab" id="sb-info" hidden>${t('rules.source')}</button></div>
    </div>`,
  );
  const $ = (id: string) => side.querySelector<HTMLElement>('#' + id)!;

  const card = document.createElement('section');
  card.className = 'panel rules-card';
  card.hidden = true;
  root.appendChild(card);
  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.rules-close')) card.hidden = true;
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && (card.hidden = true));

  let here: SurfBreak | null = null;
  $('sb-info').addEventListener('click', () => {
    if (!here) return;
    card.innerHTML = `<div class="ph">${esc(here.name)}<button type="button" class="tab rules-close">${t('rules.close')}</button></div>
      <ul class="rules-list">${here.sources.map((s) => `<li><a class="rule-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`).join('')}</ul>
      <p class="rules-advice">${t('surf.advice')}</p>`;
    card.hidden = false;
  });

  let queued = false;
  const update = () => {
    queued = false;
    const c = map.getCenter();
    const hit = breaksNear(c.lng, c.lat)[0]?.brk ?? null;
    here = hit;
    $('sb-name').textContent = hit ? `${hit.name}${hit.confidence === 'check' ? ` · ${t('surf.check')}` : ''}` : t('surf.none');
    $('sb-type').textContent = hit ? `${t(`surf.type.${hit.type}` as Key)} ${t(`surf.shape.${hit.shape}` as Key)}, ${t('surf.faces', { dir: compass8(hit.facing) })}` : '--';
    $('sb-haz').textContent = hit ? (hit.hazards.map((h) => t(`surf.hazard.${h}` as Key)).join(', ') || t('surf.hazard.none')) : '--';
    $('sb-info').hidden = !hit;
    const q = hit ? quality(hit.name) : undefined;
    const qEl = $('sb-q');
    qEl.textContent = q ? `${t(`surf.band.${q.band}` as Key)} ${q.score.toFixed(1)} · ${t(`surf.wind.${q.windKind}` as Key)}` : '--';
    const cl = q?.factors.clean;
    const sEl = $('sb-surf');
    sEl.textContent = cl === undefined ? '--' : t(cl >= 0.9 ? 'surf.clean.ok' : cl >= 0.7 ? 'surf.clean.mixed' : 'surf.clean.messy');
    const tr = q?.windTrend;
    $('sb-trend').textContent = !tr || tr === 'steady' ? '--' : t(`surf.trend.${tr}` as Key);
    $('sb-trend').className = 'seg sm ' + (tr === 'turnsOnshore' ? 'red' : tr === 'cleaning' ? 'green' : '');
    const tk = q?.tideKind;
    const rise = q && tk && tk !== 'none';
    $('sb-tide').textContent = rise ? `${t(`surf.tide.${tk}` as Key)}${hit?.tidePref === 'high' ? ` · ${t('surf.tide.wantsHigh')}` : ` · ${t('surf.tide.wantsMid')}`}` : '--';
    $('sb-tide').className = 'seg sm ' + (!q || tk === 'none' ? '' : q.factors.tide >= 0.97 ? 'green' : q.factors.tide < 0.92 ? 'red' : '');
    const sf = q?.factors;
    const warn = !q ? '' : sf!.safety < 1 ? t('surf.warn.storm') : sf!.water < 0.9 ? t('surf.warn.water') : q.ripLevel === 'HIGH' ? t('surf.warn.rip') : '';
    $('sb-warn').textContent = warn || '--';
    $('sb-warn').className = 'seg sm ' + (warn ? 'red' : '');
    sEl.className = 'seg sm ' + (cl === undefined ? '' : cl >= 0.9 ? 'green' : cl < 0.7 ? 'red' : '');
    qEl.className = 'seg sm ' + (!q ? '' : q.band === 'GOOD' || q.band === 'EPIC' ? 'green' : q.band === 'POOR' ? 'red' : '');
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
  return { refresh: update };
}
