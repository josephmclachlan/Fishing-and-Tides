/** LAYERS drawer (PLAN 1.8): activity presets plus per-layer toggles, as HUD buttons sized for a thumb. */
import { t, type Key } from './i18n';
import { closeButton, type Sheets } from './sheets';
import { ACTIVITIES, LAYERS, type LayerGroup, type LayerStore } from './layers/registry';

export function mountLayersPanel(root: HTMLElement, store: LayerStore, sheets: Sheets) {
  const groups = [...new Set(LAYERS.map((l) => l.group))] as LayerGroup[];
  const el = document.createElement('section');
  el.className = 'panel layers';
  el.id = 'layers-drawer';
  el.innerHTML = `
    <div class="ph"><span>${t('layers.title')} <span class="tag" id="lay-mode">${t('activity.all')}</span></span></div>
    <div class="lay-acts" role="group" aria-label="${t('layers.activity')}">${ACTIVITIES.map((a) => `<button type="button" class="tab" data-act="${a.id}">${t(`activity.${a.id}` as Key)}</button>`).join('')}</div>
    ${groups
      .map(
        (g) => `<div class="lay-group"><div class="lbl">${t(`group.${g}` as Key)}</div><div class="lay-grid">${LAYERS.filter((l) => l.group === g)
          .map((l) => `<button type="button" class="tab lay" data-id="${l.id}" aria-pressed="true">${t(`layer.${l.id}` as Key)}<i class="soon">${t('layers.soon')}</i></button>`)
          .join('')}</div></div>`,
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

  const render = () => {
    const a = store.activity();
    const name = a ? t(`activity.${a}` as Key) : t('layers.custom');
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
  for (const b of acts) b.addEventListener('click', () => store.setActivity(b.classList.contains('on') && b.dataset.act !== 'all' ? 'all' : (b.dataset.act as 'all')));
  for (const b of toggles) b.addEventListener('click', () => store.toggle(b.dataset.id as never));

  store.subscribe(render);
  render();
}
