/**
 * On-map key for the moving layers (clarity review CL5). Wave crests, wind streaks and current streaks can be on at
 * once, two of them in amber, and a newcomer cannot tell which is which without opening LAYERS. While two or more are
 * on, a one-line key sits in the map's top-left corner: a swatch and a word for each. Tapping it opens LAYERS.
 */
import { t, type Key } from '../i18n';
import type { LayerId, LayerStore } from './registry';

export const MOVING: readonly { id: LayerId; tone: 'amber' | 'green'; key: Key }[] = [
  { id: 'waves', tone: 'amber', key: 'mkey.waves' },
  { id: 'wind', tone: 'amber', key: 'mkey.wind' },
  { id: 'currents', tone: 'green', key: 'mkey.currents' },
];

/** The moving layers that are on, or none when fewer than two are (one alone needs no telling apart). */
export const movingShown = (isOn: (id: LayerId) => boolean) => {
  const on = MOVING.filter((m) => isOn(m.id));
  return on.length >= 2 ? on : [];
};

export function mountMotionKey(container: HTMLElement, store: LayerStore, openLayers: () => void) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'mkey';
  el.setAttribute('aria-label', t('mkey.aria'));
  el.addEventListener('click', openLayers);
  container.appendChild(el);
  const render = () => {
    const on = movingShown(store.isOn);
    el.hidden = !on.length;
    // Wave crests are short lines across the swell; wind and current are streaks along the flow.
    el.innerHTML = on.map((m) => `<span class="mk-item"><i class="mk-sw mk-${m.id} sw-${m.tone}"></i>${t(m.key)}</span>`).join('');
  };
  store.subscribe(render);
  render();
}
