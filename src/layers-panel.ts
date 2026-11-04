/** LAYERS drawer (PLAN 1.8): activity presets plus per-layer toggles, as HUD buttons sized for a thumb. */
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import { ACTIVITIES, LAYERS, type LayerGroup, type LayerId, type LayerStore } from './layers/registry';
import { legendHtml } from './layers/legend';
import type { CoralMode } from './coral-mode';

export function mountLayersPanel(root: HTMLElement, store: LayerStore, sheets: Sheets, coral?: CoralMode) {
  const groups = [...new Set(LAYERS.map((l) => l.group))] as LayerGroup[];
  const el = document.createElement('section');
  el.className = 'panel layers';
  el.id = 'layers-drawer';
  el.innerHTML = `
    <div class="ph"><span>${t('layers.title')} <span class="tag" id="lay-mode">${t('activity.all')}</span></span></div>
    ${coral ? `<div class="lay-group lay-coral"><div class="lbl">${t('coral.tab')}</div><div class="lay-cell"><button type="button" class="tab lay coral-sw" aria-pressed="false">${t('coral.switch')}</button><button type="button" class="tab lay-info" data-coral-info aria-expanded="false" aria-label="${t('legend.info')}: ${t('coral.switch')}">?</button></div><div class="lay-legend" hidden></div></div>` : ''}
    <div class="lay-acts" role="group" aria-label="${t('layers.activity')}">${ACTIVITIES.map((a) => `<button type="button" class="tab" data-act="${a.id}">${t(`activity.${a.id}` as Key)}</button>`).join('')}</div>
    ${groups
      .map(
        (g) => `<div class="lay-group"><div class="lbl">${t(`group.${g}` as Key)}</div><div class="lay-grid">${LAYERS.filter((l) => l.group === g)
          .map((l) => `<div class="lay-cell"><button type="button" class="tab lay" data-id="${l.id}" aria-pressed="true">${t(`layer.${l.id}` as Key)}<i class="soon">${t('layers.soon')}</i></button><button type="button" class="tab lay-info" data-info="${l.id}" aria-expanded="false" aria-label="${t('legend.info')}: ${t(`layer.${l.id}` as Key)}">?</button></div>`)
          .join('')}</div><div class="lay-legend" hidden></div></div>`,
      )
      .join('')}`;
  el.querySelector('.ph')!.appendChild(closeButton(() => sheets.close('layers')));
  root.appendChild(el);

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'tab lay-open';
  open.setAttribute('aria-controls', el.id);
  root.querySelector('.top-tabs')?.appendChild(open);

  const mode = el.querySelector<HTMLElement>('#lay-mode')!;
  const acts = [...el.querySelectorAll<HTMLButtonElement>('[data-act]')];
  const toggles = [...el.querySelectorAll<HTMLButtonElement>('[data-id]')];

  // The ? beside each layer opens its legend (what it is, what the colours and marks mean) under that group; one at a time.
  const infos = [...el.querySelectorAll<HTMLButtonElement>('[data-info]')];
  let shown: LayerId | null = null;
  const renderLegend = () => {
    el.querySelectorAll<HTMLElement>('.lay-group:not(.lay-coral) .lay-legend').forEach((box) => (box.hidden = true));
    for (const b of infos) {
      const on = b.dataset.info === shown;
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
      if (!on) continue;
      const box = b.closest('.lay-group')!.querySelector<HTMLElement>('.lay-legend')!;
      box.innerHTML = `<div class="lg-title">${t(`layer.${shown}` as Key)}</div>${legendHtml(shown!, (k) => t(k as Key))}`;
      box.hidden = false;
    }
  };
  for (const b of infos) b.addEventListener('click', () => ((shown = shown === b.dataset.info ? null : (b.dataset.info as LayerId)), renderLegend()));

  // CORAL overlay switch (PLAN 7.31): its own row above the activities, with its own legend.
  const coralBtn = el.querySelector<HTMLButtonElement>('.coral-sw');
  const coralInfo = el.querySelector<HTMLButtonElement>('[data-coral-info]');
  if (coral && coralBtn && coralInfo) {
    const box = coralInfo.closest('.lay-group')!.querySelector<HTMLElement>('.lay-legend')!;
    const sw = (tone: string) => `<i class="sw sw-ring sw-${tone}"></i>`;
    box.innerHTML = `<div class="lg-title">${t('coral.switch')}</div><p class="lg-what">${t('coral.legend.what')}</p><ul class="lg-list">${[sw('green'), sw('amber'), sw('red'), '<i class="sw sw-fill sw-amber"></i>', '<i class="sw sw-none"></i>'].map((s, i) => `<li>${s}<span>${t(`coral.legend.${i + 1}` as Key)}</span></li>`).join('')}</ul><p class="lg-what">${t('coral.hint')}</p>`;
    coralInfo.addEventListener('click', () => {
      box.hidden = !box.hidden;
      coralInfo.classList.toggle('on', !box.hidden);
      coralInfo.setAttribute('aria-expanded', String(!box.hidden));
    });
    coralBtn.addEventListener('click', () => coral.toggle());
    coral.subscribe(() => render());
  }

  const render = () => {
    const a = store.activity();
    const name = coral?.isOn() ? t('coral.tab') : a ? t(`activity.${a}` as Key) : t('layers.custom');
    if (coralBtn && coral) {
      coralBtn.classList.toggle('on', coral.isOn());
      coralBtn.setAttribute('aria-pressed', String(coral.isOn()));
    }
    mode.textContent = name;
    open.innerHTML = `${t('layers.title')}<span class="lay-mode">: ${name}</span>`;
    for (const b of acts) b.classList.toggle('on', b.dataset.act === a);
    for (const b of toggles) {
      const id = b.dataset.id as (typeof LAYERS)[number]['id'];
      const on = store.isOn(id);
      b.classList.toggle('on', on);
      b.classList.toggle('pending', !store.isLive(id));
      b.setAttribute('aria-pressed', String(on));
    }
  };

  // One drawer at a time (see sheets.ts); the button toggles it, so it can always be closed again.
  const syncOpen = () => {
    const v = sheets.is('layers');
    el.classList.toggle('open', v);
    open.classList.toggle('on', v);
    open.setAttribute('aria-expanded', String(v));
  };
  sheets.subscribe(syncOpen);
  syncOpen();

  open.addEventListener('click', () => sheets.toggle('layers'));
  // Tapping the active preset again goes back to everything.
  for (const b of acts) b.addEventListener('click', () => (coral?.set(false), store.setActivity(b.classList.contains('on') && b.dataset.act !== 'all' ? 'all' : (b.dataset.act as 'all'))));
  for (const b of toggles) b.addEventListener('click', () => store.toggle(b.dataset.id as never));

  store.subscribe(render);
  render();
}
