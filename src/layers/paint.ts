/**
 * Colours for what the layers paint on the sea (PLAN 7.72). The old map painted its zones in the HUD's role colours
 * (--amber, --green, --red), vivid on black. The Kinetic Plus map keeps those role names for its drawers' text, where
 * amber is the ink, so it gives the painted zones their own tokens: --paint-amber, --paint-green, --paint-red. A layer
 * asks for a role and gets the paint token when the theme sets one, else the role colour itself.
 *
 * The old fills were faint washes (7 to 42 %) because neon on black reads at any strength; on the light sea the same
 * washes vanish. `--paint-gain` and `--paint-floor` lift them: a = min(cap, a * gain + floor) for any painted pixel.
 */
const cs = () => getComputedStyle(document.documentElement);

/** The paint colour for a role variable such as '--amber', else the role colour, else `fallback`. */
export function paintColour(name: string, fallback: string): string {
  askedPaint.set(name, fallback);
  const s = cs();
  return s.getPropertyValue(name.replace(/^--/, '--paint-')).trim() || s.getPropertyValue(name).trim() || fallback;
}

/** How the theme lifts a wash's opacity (identity where the theme sets nothing). */
export interface Lift { gain: number; floor: number; cap: number }
export const NO_LIFT: Lift = { gain: 1, floor: 0, cap: 1 };

/**
 * The theme's lift. 'strong' is for washes that are the layer's only mark on the sea (fishing water, reef zones): amber
 * at a light lift mixes with the pale sea into the sand of the land and reads as coast, so these go further.
 */
export function paintLift(kind: 'wash' | 'strong' = 'wash'): Lift {
  const s = cs();
  const n = (k: string, d: number) => {
    const v = parseFloat(s.getPropertyValue(k));
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  const w = { gain: n('--paint-gain', 1), floor: n('--paint-floor', 0), cap: n('--paint-cap', 1) };
  return kind === 'wash' ? w : { gain: n('--paint-strong-gain', w.gain), floor: n('--paint-strong-floor', w.floor), cap: n('--paint-strong-cap', w.cap) };
}

/** A wash opacity (0..1) after the theme's lift; nothing stays nothing. Pure. */
export const lifted = (a: number, l: Lift = NO_LIFT) => (a > 0 ? Math.min(Math.max(l.cap, a), a * l.gain + l.floor) : 0);

/**
 * A wash opacity for a style layer, lifted and carrying a tag (1e-7 per distinct wash, far below what an opacity can
 * show) so `schemeSwap` can find exactly the opacities that came from `lifted` and re-lift them for the new scheme;
 * lifted values alone collide where the cap flattens them.
 */
const liftTags = new Map<number, number>();
export function liftedTagged(a: number, l: Lift): number {
  if (!(a > 0)) return 0;
  let t = liftTags.get(a);
  if (t === undefined) liftTags.set(a, (t = (liftTags.size + 1) * 1e-7));
  return lifted(a, l) + t;
}

/* ---------- scheme change in place (no page reload) ---------- */

/** Role variables the layers asked for (name -> fallback), so a scheme change knows which colours to swap. */
const asked = new Map<string, string>();
/** A themed variable read straight from the page, remembered for `schemeSwap`. */
export function themeVar(name: string, fallback: string): string {
  asked.set(name, fallback);
  return cs().getPropertyValue(name).trim() || fallback;
}
const askedPaint = new Map<string, string>();
const lc = (s: string) => s.trim().toLowerCase();
const roleValues = (): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [n, f] of asked) m.set('v' + n, themeVar(n, f));
  for (const [n, f] of askedPaint) m.set('p' + n, paintColour(n, f));
  return m;
};
/** The role colours as they are now; take one before a scheme change and one after, and pass both to `schemeSwap`. */
export interface RoleSnapshot { colours: Map<string, string>; lifts: [Lift, Lift] }
export const roleSnapshot = (): RoleSnapshot => ({ colours: roleValues(), lifts: [paintLift('wash'), paintLift('strong')] });

/** Deep-replace colour strings in a style value. */
function swapDeep(v: unknown, swap: Map<string, string>, nums?: Map<number, number>): unknown {
  if (typeof v === 'string') return swap.get(lc(v)) ?? v;
  if (typeof v === 'number') return nums?.get(v) ?? v;
  if (Array.isArray(v)) return v.map((x) => swapDeep(x, swap, nums));
  // 'format' sections carry their own style object (e.g. a text-color).
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swapDeep(x, swap, nums)]));
  return v;
}

/**
 * Repaint the map's own (non-base) layers from the old scheme's role colours to the new one's, in place:
 * every paint and layout value equal to an old role colour becomes the new one. Sources and data are untouched.
 */
export function schemeSwap(map: { getStyle(): { layers?: unknown[] } | undefined; setPaintProperty(id: string, k: string, v: unknown): void; setLayoutProperty(id: string, k: string, v: unknown): void }, before: RoleSnapshot, after: RoleSnapshot) {
  const swap = new Map<string, string>();
  for (const [k, o] of before.colours) {
    const n = after.colours.get(k);
    if (n && lc(o) !== lc(n) && !swap.has(lc(o))) swap.set(lc(o), n);
  }
  // Lifted washes: an opacity that was lifted by the old scheme becomes the same wash lifted by the new one.
  const nums = new Map<number, number>();
  for (const [a, t] of liftTags) {
    const o = lifted(a, before.lifts[1]) + t, n = lifted(a, after.lifts[1]) + t;
    if (o !== n) nums.set(o, n);
  }
  if (!swap.size && !nums.size) return;
  for (const l of (map.getStyle()?.layers ?? []) as { id: string; type: string; source?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> }[]) {
    if (l.source === 'openmaptiles' || l.type === 'background') continue;
    for (const [k, v] of Object.entries(l.paint ?? {})) {
      const nv = swapDeep(v, swap, /opacity$/.test(k) ? nums : undefined);
      if (JSON.stringify(nv) !== JSON.stringify(v)) try { map.setPaintProperty(l.id, k, nv); } catch { /* ignore */ }
    }
    for (const [k, v] of Object.entries(l.layout ?? {})) {
      const nv = swapDeep(v, swap);
      if (JSON.stringify(nv) !== JSON.stringify(v)) try { map.setLayoutProperty(l.id, k, nv); } catch { /* ignore */ }
    }
  }
}

/** Layers that bake colours into images, uniforms or lifted opacities re-read them here when the scheme changes. */
const schemeListeners = new Set<() => void>();
export const onSchemeChange = (fn: () => void) => (schemeListeners.add(fn), () => void schemeListeners.delete(fn));
export const emitSchemeChange = () => schemeListeners.forEach((f) => { try { f(); } catch (e) { console.warn('scheme repaint', e); } });
