/**
 * One well-drawn reef fish and two plain hands, shared by every drawing that shows a fish being handled: field notes
 * (releasing, cooking), the ciguatera page and the dispatch page (PLAN 13.7, Joseph 2026-11-17: "bring back the detail
 * of the originals but with better quality art"). Square and crisp: mitred corners, square line ends, flat fills
 * from the page tokens (fishkit.css, prefix `fk-`), so light and dark mode restyle them.
 *
 * The fish is a snapper-shaped reef fish (the fish people here catch and eat most): steep forehead, a spiny dorsal fin
 * running into a soft one, a narrow tail stalk and a forked tail, a gill cover, a pectoral, pelvic and anal fin, a
 * lateral line and an eye with a highlight. It sits in a 100 by 40 box, head to the left.
 */
import './fishkit.css';

const n = (v: number) => +v.toFixed(2);

/** The body outline in the 100 by 40 box: snout at (0, 21), tail stalk at x = 80, tail tips at x = 100. */
export const FISH_BODY =
  'M0 23 L2 20.6 L8 13 C13 7.6 19 4.6 27 3.4 C38 2 50 2.4 60 4.4 C69 6.2 76 10 81.4 15 L86 15.6 L99 2 L95 20 L99 38 L86 24.4 L81.4 25 ' +
  'C76 30 68 33.6 58 35.2 C46 37 32 36.4 22 34.2 C14 32.4 7 29.2 3 26 L5.6 24.4 Z';

export interface FishOpts {
  /** Turn it head right. */
  flip?: boolean;
  /** Extra class on the body, for a colour (`fk-body` is always on). */
  body?: string;
  /** Leave off the lateral line and fin rays (for small fish). */
  plain?: boolean;
  /** Extra SVG drawn inside the fish's own 100 by 40 frame, on top. */
  extra?: string;
  /** Extra class on the group. */
  cls?: string;
}

/** The reef fish at (x, y), `s` times its 100 by 40 box. */
export function reefFish(x: number, y: number, s: number, o: FishOpts = {}): string {
  const t = o.flip ? `translate(${n(x + 100 * s)} ${n(y)}) scale(${n(-s)} ${n(s)})` : `translate(${n(x)} ${n(y)}) scale(${n(s)})`;
  const rays = o.plain
    ? ''
    : // spines on the hard dorsal, soft rays on the second dorsal and the tail, a dashed lateral line
      '<path class="fk-ray" d="M27 4 L29 -3.4 M33 3.2 L35.6 -4.6 M39 2.8 L41.6 -4.8 M45 2.6 L47.4 -4.4 M51 2.8 L53 -3.6"/>' +
      '<path class="fk-ray" d="M88 14 L96 6 M88 26 L96 34 M89 20 H95"/>' +
      '<path class="fk-lat" d="M23 10.6 C42 7.6 64 9.6 82 17"/>';
  return (
    `<g class="fk-fish${o.cls ? ` ${o.cls}` : ''}" transform="${t}">` +
    // fins behind the body: spiny dorsal into the soft dorsal, anal fin, pelvic fin
    '<path class="fk-fin" d="M26 4 L29 -4.6 L35 -5.6 L41 -6 L47 -5.6 L53 -4.6 L58 1.4 L61 -2.4 L71 -0.6 L79 7.4 L81 14 Z"/>' +
    '<path class="fk-fin" d="M58 35 L63 42 L73 40.4 L80 26 Z"/>' +
    '<path class="fk-fin" d="M27 35 L30 43 L37 42 L37 35.6 Z"/>' +
    `<path class="fk-body${o.body ? ` ${o.body}` : ''}" d="${FISH_BODY}"/>` +
    // gill cover, mouth, pectoral fin
    '<path class="fk-line" d="M22 5 C17 12.6 17 26 22.6 34"/>' +
    '<path class="fk-line" d="M1.4 23.4 L9.6 23 L12 21.4"/>' +
    '<path class="fk-pec" d="M24 20 L40 22.4 L24 26 Z"/>' +
    rays +
    '<circle class="fk-eye" cx="12.6" cy="14.4" r="3.2"/><rect class="fk-glint" x="12.8" y="12.2" width="1.6" height="1.6"/>' +
    (o.extra ?? '') +
    '</g>'
  );
}

/**
 * A hand under something it holds, seen from the side: the forearm rises from below, the palm cups under the belly, the
 * thumb comes up on the near side and the fingertips curl up on the far side. About 44 by 42; (x, y) is where the thumb
 * and fingertips reach (the top of the cup), the palm sits 8 lower and the wrist comes in from the lower left. Draw it after the fish so the thumb lies over its side.
 */
export function palmUp(x: number, y: number, s = 1): string {
  return (
    `<g class="fk-hand" transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">` +
    '<path class="fk-skin" d="M-8 40 L0 18 V6 L2 -2 H8 L9 8 H28 L30 0 H35 L36 10 L32 16 H12 L4 40 Z"/>' +
    '<path class="fk-crease" d="M12 12 H29 M30.6 4 H35"/>' +
    '</g>'
  );
}

/** An open hand, fingers up, palm toward you (left hand; `flip` for the right). 30 by 40 from (x, y) at its top left. */
export function openHand(x: number, y: number, s = 1, flip = false): string {
  const t = flip ? `translate(${n(x + 30 * s)} ${n(y)}) scale(${n(-s)} ${n(s)})` : `translate(${n(x)} ${n(y)}) scale(${n(s)})`;
  return (
    `<g class="fk-hand" transform="${t}">` +
    '<path class="fk-skin" d="M7 40 V22 L1 15 L4 12 L9 16 V5 H13 V16 H14 V1 H18 V16 H19 V3 H23 V17 H24 V7 H28 V26 L24 34 V40 Z"/>' +
    '<path class="fk-crease" d="M10 26 H22"/>' +
    '</g>'
  );
}
