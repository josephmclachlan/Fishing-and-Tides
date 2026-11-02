/**
 * Cached element size (PLAN 5.4). Reading clientWidth / clientHeight inside an animation frame
 * after the HUD has changed text forces a synchronous layout every frame; the particle layer and
 * the altitude readout did that on every frame and every map move. A ResizeObserver keeps the
 * size current instead, so per-frame code reads a plain object.
 */
const sizes = new WeakMap<Element, { w: number; h: number }>();
let ro: ResizeObserver | null = null;

/** The element's client size, kept current by a ResizeObserver (read live where there is none). */
export function sizeOf(el: HTMLElement): { readonly w: number; readonly h: number } {
  let s = sizes.get(el);
  if (s) return s;
  if (typeof ResizeObserver === 'undefined') return { w: el.clientWidth, h: el.clientHeight };
  s = { w: el.clientWidth, h: el.clientHeight };
  sizes.set(el, s);
  ro ??= new ResizeObserver((entries) => {
    for (const e of entries) {
      const t = sizes.get(e.target);
      if (t) (t.w = (e.target as HTMLElement).clientWidth), (t.h = (e.target as HTMLElement).clientHeight);
    }
  });
  ro.observe(el);
  return s;
}
