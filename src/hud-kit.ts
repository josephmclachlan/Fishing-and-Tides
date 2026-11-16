/** HUD component kit (PLAN 1.2). Pure string builders; styles live in style.css. */
import { glyphInline } from './icons/glyphs';

export type Tone = '' | 'green' | 'red';

export function panel(cls: string, body: string, tag = 'div'): string {
  return `<${tag} class="panel ${cls}">${body}</${tag}>`;
}

export function panelHeader(title: string, tag?: string): string {
  return `<div class="ph">${title}${tag ? ` <span class="tag">${tag}</span>` : ''}</div>`;
}

/** Label + segmented value + unit. Update `#id` text/class at runtime. */
export function readout(label: string, id: string, unit = '', tone: Tone = ''): string {
  return `<div class="ro"><span class="lbl">${label}</span><span class="seg ${tone}" id="${id}">--</span><span class="unit">${unit}</span></div>`;
}

/** Bar gauge. Fraction is clamped to 0..1; `tone` picks the fill colour. */
export function gauge(label: string, id: string, fraction = 0, tone: Tone = ''): string {
  return `<div class="gauge ${tone}" id="${id}" role="meter" aria-label="${label}">
    <span class="lbl">${label}</span><span class="gauge-bar"><i style="width:${clamp01(fraction) * 100}%"></i></span></div>`;
}

export function setGauge(el: HTMLElement, fraction: number, tone: Tone = '') {
  el.className = `gauge ${tone}`;
  el.querySelector<HTMLElement>('i')!.style.width = `${clamp01(fraction) * 100}%`;
}

/** Hazard-striped alert strip; hidden until it has a message. */
export function alertStrip(id: string): string {
  return `<div class="alert" id="${id}" role="alert" hidden></div>`;
}

export function setAlert(el: HTMLElement, message: string | null) {
  el.hidden = !message;
  // The warning triangle from the symbol set (PLAN 7.106) instead of the "⚠" character, which every font draws differently.
  el.innerHTML = message ? `${glyphInline('danger', 'al-g')}<span></span>` : '';
  if (message) el.querySelector('span')!.textContent = message;
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
