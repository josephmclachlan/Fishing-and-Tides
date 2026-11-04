/**
 * GLANCE strip (phone): the few numbers that matter for what you are doing, always visible above the
 * time bar while you pan the map. Four activities, each with four values: tap the mode button to
 * cycle. Values are read from the full conditions panel's own readouts, so the two never disagree
 * and every panel that feeds the full view feeds this one. Tapping a value explains it. The mode button
 * also carries that activity's GO / MARGINAL / NO-GO (verdict-hud.ts, PLAN 7.8).
 */
import { t, type Key } from './i18n';

export type Mode = 'surf' | 'fish' | 'dive' | 'boat';
export const MODES: readonly Mode[] = ['surf', 'fish', 'dive', 'boat'];

interface Cell {
  /** Id of the value element in the full panel. */
  src: string;
  label: Key;
  /** Explainer id (see explain.ts). */
  help: string;
  unit?: Key;
  /** How to turn the panel text into the short glance text. */
  fmt?: (text: string) => string;
}

const first = (s: string) => s.split(/\s+/)[0] ?? s;
/** Cross-hair on land: the current has no value there, so -- (the explainer says why), not the word LAND. */
const sea0 = (s: string) => (s === t('flow.land') ? '--' : s);
const SEA = ['comfortable', 'lively', 'rough', 'uncomfortable'] as const;
const sea = (s: string) => {
  const hit = SEA.find((k) => t(`sea.${k}` as Key) === s);
  return hit ? t(`glance.sea.${hit}` as Key) : s;
};

export const CELLS: Record<Mode, Cell[]> = {
  surf: [
    { src: 'swell', label: 'glance.swell', help: 'swell', unit: 'unit.m' },
    { src: 'period', label: 'glance.period', help: 'period', unit: 'unit.s' },
    { src: 'wind', label: 'glance.wind', help: 'wind', unit: 'unit.kt' },
    { src: 'rip', label: 'glance.rip', help: 'rip' },
  ],
  fish: [
    { src: 'wind', label: 'glance.wind', help: 'wind', unit: 'unit.kt' },
    { src: 'sst', label: 'glance.sst', help: 'sst', unit: 'unit.degC' },
    { src: 'curr', label: 'glance.curr', help: 'current', unit: 'unit.kt', fmt: sea0 },
    { src: 'cset', label: 'glance.set', help: 'set', unit: 'unit.degT' },
  ],
  dive: [
    { src: 'swell', label: 'glance.swell', help: 'swell', unit: 'unit.m' },
    { src: 'curr', label: 'glance.curr', help: 'current', unit: 'unit.kt', fmt: sea0 },
    { src: 'dv-6', label: 'glance.surge', help: 'surge', fmt: first },
    { src: 'sst', label: 'glance.sst', help: 'sst', unit: 'unit.degC' },
  ],
  boat: [
    { src: 'wind', label: 'glance.wind', help: 'wind', unit: 'unit.kt' },
    { src: 'swell', label: 'glance.swell', help: 'swell', unit: 'unit.m' },
    { src: 'ss-comfort', label: 'glance.sea', help: 'seaState', fmt: sea },
    { src: 'bv-verdict', label: 'glance.verdict', help: 'verdict' },
  ],
};

export const nextMode = (m: Mode): Mode => MODES[(MODES.indexOf(m) + 1) % MODES.length]!;
export const isMode = (v: unknown): v is Mode => MODES.includes(v as Mode);

const KEY = 'fishing-tides.glance';

export function mountGlance(
  root: HTMLElement,
  store: { getItem(k: string): string | null; setItem(k: string, v: string): void } | undefined,
  /** Called when the user cycles the mode here (the CONDITIONS panel follows it). */
  onMode?: (m: Mode) => void,
) {
  const bottom = root.querySelector<HTMLElement>('.bottom');
  if (!bottom) return;
  let mode: Mode = 'surf';
  try {
    const s = store?.getItem(KEY);
    if (isMode(s)) mode = s;
  } catch {
    /* private window: start on SURF */
  }

  const el = document.createElement('div');
  el.className = 'glance';
  el.id = 'glance';
  bottom.insertBefore(el, bottom.firstChild);

  const build = () => {
    const name = t(`glance.${mode}` as Key);
    el.innerHTML = `<button type="button" class="gl-mode" aria-label="${t('glance.mode', { name })}">
        <span class="gl-name">${name}</span>
        <span class="gl-vd seg" data-vd>--</span>
        <span class="gl-dots" aria-hidden="true">${MODES.map((m) => (m === mode ? '●' : '○')).join('')}</span></button>
      ${CELLS[mode]
        .map(
          (c, i) => `<div class="gl-cell" data-help="${c.help}" data-help-title="${t(c.label)}" data-i="${i}" role="button" tabindex="0">
            <span class="lbl">${t(c.label)}</span><span class="seg">--</span>${c.unit ? `<span class="unit">${t(c.unit)}</span>` : ''}</div>`,
        )
        .join('')}
      <div class="gl-why" data-why hidden></div>`;
    el.querySelector('.gl-mode')!.addEventListener('click', () => {
      setMode(nextMode(mode));
      onMode?.(mode);
    });
  };

  const setMode = (m: Mode) => {
    if (m === mode) return;
    mode = m;
    try {
      store?.setItem(KEY, mode);
    } catch {
      /* not saved */
    }
    build();
    refresh();
  };

  const refresh = () => {
    // The mode's GO / NO-GO (PLAN 7.8), from the CONDITIONS chip that verdict-hud.ts marks for it.
    const vdSrc = root.querySelector<HTMLElement>(`[data-glance-vd="${mode}"]`);
    const vd = el.querySelector<HTMLElement>('[data-vd]');
    if (vd) {
      vd.textContent = vdSrc?.textContent?.trim() || '--';
      vd.className = `gl-vd seg ${vdSrc?.classList.contains('red') ? 'red' : vdSrc?.classList.contains('green') ? 'green' : ''}`;
    }
    // Why it is not GO, in one line under the strip.
    const why = el.querySelector<HTMLElement>('[data-why]');
    if (why) {
      const text = vdSrc?.dataset.why ?? '';
      why.textContent = text;
      why.hidden = !text;
      why.className = `gl-why ${vdSrc?.classList.contains('red') ? 'is-nogo' : ''}`;
    }
    CELLS[mode].forEach((c, i) => {
      const src = root.querySelector<HTMLElement>(`#${c.src}`);
      const cell = el.querySelector<HTMLElement>(`[data-i="${i}"] .seg`);
      if (!cell) return;
      const text = src?.textContent?.trim() || '--';
      cell.textContent = text === '--' || !c.fmt ? text : c.fmt(text);
      const tone = src?.classList.contains('red') ? 'red' : src?.classList.contains('green') ? 'green' : '';
      cell.className = `seg ${tone}`;
    });
  };

  build();
  refresh();
  setInterval(refresh, 1000);
  return { mode: () => mode, setMode, refresh };
}
