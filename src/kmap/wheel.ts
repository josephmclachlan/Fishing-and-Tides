/**
 * The activity wheel (Joseph 2026-11-17, layout B, PLAN 7.165; square and crisp: straight-edged slices, no rounding): press and hold the activity pill on a phone and a half
 * wheel of every activity fans out under the top bar. Slide to one and let go to switch; let go anywhere else and the
 * wheel stays open for a tap. A tap outside it, or Escape, closes it. A short tap on the pill still drops the plain row.
 */
import { ICON, esc } from './dom';
import type { Mode } from './model';

export interface WheelGeom {
  cx: number;
  cy: number;
  r0: number;
  r1: number;
  /** Start and end angle in radians, clockwise from east (screen y points down, so 0..π is the lower half). */
  a0: number;
  a1: number;
  n: number;
}

/** The slice under a point, or null outside the ring (a little slack past the outer edge so a thumb overshoot still counts). */
export function sliceAt(x: number, y: number, g: WheelGeom, slack = 28): number | null {
  const d = Math.hypot(x - g.cx, y - g.cy);
  if (d < g.r0 - 4 || d > g.r1 + slack) return null;
  let a = Math.atan2(y - g.cy, x - g.cx);
  if (a < g.a0 - Math.PI / 2) a += 2 * Math.PI;
  if (a < g.a0 || a > g.a1) return null;
  return Math.min(g.n - 1, Math.floor(((a - g.a0) / (g.a1 - g.a0)) * g.n));
}

/** The wheel's geometry for a screen: centred across it, hanging from just under the top bar. */
export function wheelGeom(vw: number, top: number, n: number): WheelGeom {
  const r1 = Math.max(120, Math.min(170, vw / 2 - 8));
  return { cx: vw / 2, cy: top, r0: Math.round(r1 * 0.28), r1, a0: 0.12, a1: Math.PI - 0.12, n };
}

export interface WheelItem {
  id: Mode;
  label: string;
}

export function mountActWheel(opts: { onPick: (m: Mode) => void; current: () => Mode; hint: () => [string, string] }) {
  const W = document.createElement('div');
  W.className = 'k-wheel';
  W.setAttribute('aria-hidden', 'true');
  W.innerHTML = '<div class="k-wh-dim"></div><svg class="k-wh-svg"></svg><div class="k-wh-hub"></div>';
  document.body.appendChild(W);
  const svgEl = W.querySelector('svg')!, hub = W.querySelector<HTMLElement>('.k-wh-hub')!;
  let g: WheelGeom | null = null, items: WheelItem[] = [], hov: number | null = null;
  const P = (r: number, a: number) => [g!.cx + r * Math.cos(a), g!.cy + r * Math.sin(a)];
  const draw = (anim: boolean) => {
    if (!g) return;
    const { r0, r1, a0, a1, n } = g, step = (a1 - a0) / n, rm = (r0 + r1) / 2, cur = opts.current();
    svgEl.innerHTML = items
      .map((it, i) => {
        const s0 = a0 + i * step + 0.012, s1 = s0 + step - 0.024, m = (s0 + s1) / 2;
        const [x0, y0] = P(r1, s0), [x1, y1] = P(r1, s1), [x2, y2] = P(r0, s1), [x3, y3] = P(r0, s0);
        const [ex0, ey0] = P(r1 - 2, s0 + 0.02), [ex1, ey1] = P(r1 - 2, s1 - 0.02);
        // The icon sits inward and the name out by the rim, where the slice is widest (SNORKEL did not fit mid-slice).
        const [gx, gy] = P(rm - 14, m), [tx, ty] = P(r1 - 17, m);
        const cls = `k-wh-sl${it.id === cur ? ' k-sel' : ''}${hov === i ? ' k-hov' : ''}`;
        return `<g class="${cls}" data-id="${it.id}" style="transform-origin:${g!.cx}px ${g!.cy}px;${anim ? `transition-delay:${i * 22}ms` : ''}">
          <path class="k-wh-f" d="M${x0} ${y0}L${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z"/>
          <path class="k-wh-e" d="M${ex0} ${ey0}L${ex1} ${ey1}"/>
          <svg class="k-wh-g" x="${gx - 10}" y="${gy - 10}" width="20" height="20" viewBox="0 0 24 24">${ICON[it.id]}</svg>
          <text x="${tx}" y="${ty + 3}">${esc(it.label)}</text></g>`;
      })
      .join('');
    const hi = hov === null ? null : items[hov];
    const [h1, h2] = opts.hint();
    hub.style.top = `${g.cy + g.r1 + 26}px`;
    hub.innerHTML = hi ? `<b data-id="${hi.id}">${esc(hi.label)}</b><span>${esc(h1)}</span>` : `<b data-id="${cur}">${esc(items.find((x) => x.id === cur)?.label ?? '')}</b><span>${esc(h2)}</span>`;
    if (anim) {
      W.classList.remove('k-in');
      requestAnimationFrame(() => requestAnimationFrame(() => W.classList.add('k-in')));
    }
  };
  const close = () => {
    if (!g) return;
    g = null;
    hov = null;
    W.classList.remove('k-on', 'k-in');
  };
  const at = (e: PointerEvent) => (g ? sliceAt(e.clientX, e.clientY, g) : null);
  const api = {
    get isOpen() {
      return !!g;
    },
    open(top: number, list: WheelItem[]) {
      items = list;
      g = wheelGeom(window.innerWidth, top, list.length);
      hov = null;
      svgEl.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
      W.classList.add('k-on');
      draw(true);
      navigator.vibrate?.(8);
    },
    move(e: PointerEvent) {
      if (!g) return;
      const h = at(e);
      if (h !== hov) {
        hov = h;
        draw(false);
        if (h !== null) navigator.vibrate?.(4);
      }
    },
    /** Let go: on a slice, pick it and close; elsewhere, stay open for a tap (fromPill) or close. */
    up(e: PointerEvent, fromPill = false) {
      if (!g) return;
      const h = at(e);
      if (h === null) return fromPill ? (hov = null, draw(false)) : close();
      const m = items[h].id;
      close();
      if (m !== opts.current()) opts.onPick(m);
    },
    close,
  };
  W.addEventListener('pointerdown', (e) => W.setPointerCapture(e.pointerId));
  W.addEventListener('pointermove', (e) => api.move(e));
  W.addEventListener('pointerup', (e) => api.up(e));
  W.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  return api;
}
