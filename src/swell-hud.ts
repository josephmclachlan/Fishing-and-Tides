/**
 * SWELLS rows (WAVES group): every wave train in the forecast, biggest first, the way surf apps
 * list "swell 1, swell 2, wind waves". Two swells of the same total height surf very differently
 * when one is a long groundswell and the other is short local chop, so each gets its own height,
 * period and direction. Past day 16 (OUTLOOK) the climatology has no split: only the total shows.
 */
import { condSlot } from './cond-groups';
import { t, type Key } from './i18n';
import { waveParts, type SeaState, type WaveTrain } from './adapters/waves';
import { compass8 } from './surf-breaks';

const pad3 = (n: number) => String(Math.round(n) % 360).padStart(3, '0');
const LABEL: Record<WaveTrain, Key> = { swell1: 'sw.swell1', swell2: 'sw.swell2', windSea: 'sw.windSea' };
/** A swell this long has come a long way (a groundswell): more power per metre of height. */
const GROUND_S = 12;

export function mountSwellHud(root: HTMLElement, seaAt: () => SeaState | null) {
  const slot = condSlot(root, 'waves', 10);
  if (!slot) return;
  const row = (i: number) => `<div class="ro sw-row" id="swr-${i}" hidden><span class="lbl" id="swl-${i}">--</span><span class="seg sm" id="sw-${i}">--</span></div>`;
  slot.insertAdjacentHTML(
    'beforeend',
    `<div class="ro sw-row"><span class="lbl">${t('sw.total')}</span><span class="seg sm" id="sw-hs">--</span></div>
    ${row(0)}${row(1)}${row(2)}
    <div class="ro sw-row" id="sw-note-row" hidden><span class="lbl note" id="sw-note"></span></div>`,
  );
  const $ = (id: string) => slot.querySelector<HTMLElement>('#' + id)!;
  let last = '';
  const tick = () => {
    const s = seaAt();
    const parts = s ? waveParts(s) : [];
    const key = JSON.stringify([s?.hs, s?.tm, s?.dir, parts]);
    if (key === last) return;
    last = key;
    $('sw-hs').textContent = s ? `${s.hs.toFixed(1)}${t('unit.m')}${Number.isFinite(s.tm) ? ` · ${s.tm.toFixed(0)}${t('unit.s')}` : ''} · ${compass8(s.dir)}` : '--';
    for (let i = 0; i < 3; i++) {
      const p = parts[i];
      $(`swr-${i}`).hidden = !p;
      if (!p) continue;
      $(`swl-${i}`).textContent = t(LABEL[p.kind]);
      const per = Number.isFinite(p.t) ? ` · ${p.t.toFixed(0)}${t('unit.s')}` : '';
      const dir = Number.isFinite(p.dir) ? ` · ${compass8(p.dir)}` : '';
      const el = $(`sw-${i}`);
      el.textContent = `${p.hs.toFixed(1)}${t('unit.m')}${per}${dir}`;
      el.title = Number.isFinite(p.dir) ? `${pad3(p.dir)}${t('unit.deg')}` : '';
      el.className = `seg sm ${p.kind !== 'windSea' && p.t >= GROUND_S ? 'green' : ''}`;
    }
    const note = !s ? 'sw.none' : s.kind === 'climatology' ? 'sw.noSplitClim' : parts.length === 0 ? 'sw.noSplit' : null;
    $('sw-note-row').hidden = !note;
    $('sw-note').textContent = note ? t(note as Key) : '';
  };
  tick();
  setInterval(tick, 1000);
}
