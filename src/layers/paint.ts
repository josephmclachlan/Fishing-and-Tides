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
