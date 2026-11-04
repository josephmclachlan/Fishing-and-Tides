/**
 * HUD sheets: on a phone every panel except the top bar and the bottom strip is a drawer that
 * stays closed until its tab is tapped, and only one is open at a time so the map stays visible.
 * A sheet closes from its tab, its X, a tap on the map, or Esc. The store is pure; `mountSheets`
 * wires it to the DOM and the map. On wider screens the panels stay laid out as before (CSS keys
 * the drawers off `body[data-sheet]` only inside the phone media query).
 */
import type { Map } from 'maplibre-gl';
import { t } from './i18n';

export type SheetId = 'watch' | 'find' | 'cond' | 'time' | 'layers' | 'boat' | 'coral' | 'settings' | 'check' | 'obs' | 'spot';

export interface Sheets {
  current(): SheetId | null;
  is(id: SheetId): boolean;
  open(id: SheetId): void;
  close(id?: SheetId): void;
  toggle(id: SheetId): void;
  subscribe(fn: () => void): () => void;
}

/** A phone: narrow, or a phone held sideways (short and touch). Keep in step with the media queries in style.css. */
export const PHONE_QUERY = '(max-width: 600px), (max-height: 500px) and (pointer: coarse)';

/** `initial`: the sheet open at start (the LAYERS drawer on wide screens, none on a phone). */
export function createSheets(initial: SheetId | null = null): Sheets {
  let cur = initial;
  const subs = new Set<() => void>();
  const set = (next: SheetId | null) => {
    if (next === cur) return;
    cur = next;
    subs.forEach((fn) => fn());
  };
  return {
    current: () => cur,
    is: (id) => cur === id,
    open: (id) => set(id),
    close: (id) => {
      if (!id || cur === id) set(null);
    },
    toggle: (id) => set(cur === id ? null : id),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** A HUD-style close button for a sheet header. */
export function closeButton(onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sheet-x';
  b.textContent = '✕';
  b.setAttribute('aria-label', t('ui.close'));
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Keep body[data-sheet] in step, add the FIND and COND tabs, close on Esc and on a tap on the
 * map (a drag or pinch leaves it open), and publish the HUD edges as --top-h / --dock-h so
 * drawers sit between the top bar and the bottom strip.
 */
export function mountSheets(root: HTMLElement, map: Map, sheets: Sheets) {
  const phone = window.matchMedia(PHONE_QUERY);
  const tabs = root.querySelector<HTMLElement>('.top-tabs')!;
  const addTab = (id: SheetId, label: string, controls: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab mob-only';
    b.textContent = label;
    b.setAttribute('aria-controls', controls);
    b.addEventListener('click', () => sheets.toggle(id));
    tabs.appendChild(b);
    return b;
  };
  const tabEls: [SheetId, HTMLElement][] = [
    ['find', addTab('find', t('sheet.find'), 'seek-panel')],
    ['cond', addTab('cond', t('sheet.cond'), 'cond-panel')],
  ];
  const bar = root.querySelector<HTMLElement>('#dock-bar');
  bar?.addEventListener('click', () => sheets.toggle('time'));

  // The conditions sheet gets an X in its header; the time sheet's bar is its own handle.
  const side = root.querySelector<HTMLElement>('#cond-panel .ph');
  side?.appendChild(closeButton(() => sheets.close('cond')));

  const render = () => {
    document.body.dataset.sheet = sheets.current() ?? '';
    for (const [id, el] of tabEls) {
      el.classList.toggle('on', sheets.is(id));
      el.setAttribute('aria-expanded', String(sheets.is(id)));
    }
    bar?.setAttribute('aria-expanded', String(sheets.is('time')));
  };
  sheets.subscribe(render);
  render();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sheets.close();
  });
  map.on('click', () => {
    if (phone.matches) sheets.close();
  });

  // Edges of the fixed HUD bars, for CSS to place the drawers.
  const edges = () => {
    const top = root.querySelector<HTMLElement>('.top')?.getBoundingClientRect();
    const dock = root.querySelector<HTMLElement>('.bottom')?.getBoundingClientRect();
    const s = document.documentElement.style;
    if (top) s.setProperty('--top-h', `${Math.round(top.bottom)}px`);
    if (dock) s.setProperty('--dock-h', `${Math.round(window.innerHeight - dock.top)}px`);
  };
  const ro = new ResizeObserver(edges);
  for (const el of root.querySelectorAll('.top, .bottom')) ro.observe(el);
  window.addEventListener('resize', edges);
  edges();
}
