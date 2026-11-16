/**
 * The four DISPATCH method drawings, one per way of doing it right: flat line art in the page's ink with the cuts
 * and the water in its accent colours, in a 220 by 96 box, numbered to match each method's list of marks
 * (content.ts `METHODS[].marks`). Pure strings; the styles are in dispatch.css (`.dp-art`).
 */
import type { MethodId } from './content';

const badge = (n: number, x: number, y: number) =>
  `<g class="dp-bd"><circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y + 3.6}" text-anchor="middle">${n}</text></g>`;

/** The fish lying left-facing (head left), 16 to 204 across and 22 to 76 down. */
const FISH =
  '<path class="dp-body" d="M16 50 C34 28 84 22 126 30 C156 36 176 44 204 30 L204 70 C176 56 156 62 126 68 C84 76 34 72 16 50 Z"/>' +
  '<path class="dp-body" d="M16 50 C20 50 28 52 38 54"/>' +
  '<circle class="dp-eye" cx="40" cy="45" r="4"/>' +
  '<path class="dp-body" d="M64 33 C56 45 56 58 64 68"/>';

const GILL_CUT = '<path class="dp-cut" d="M64 31 C55 44 55 59 64 70"/>';

function ikejime(): string {
  return (
    FISH +
    GILL_CUT +
    '<path class="dp-cut" d="M150 44 L150 60"/>' +
    '<path class="dp-wire" d="M150 52 L48 40"/>' +
    '<path class="dp-arrow" d="M18 12 L45 34"/><path class="dp-arrow" d="M45 34 L38 33 M45 34 L44 27"/>' +
    badge(1, 14, 10) + badge(2, 76, 83) + badge(3, 150, 80) + badge(4, 100, 26)
  );
}

/** A club coming down on the top of the head, with the strike marked, then the gill cut. */
function club(): string {
  return (
    FISH +
    GILL_CUT +
    // the club: a thick handle ending in a heavier head, swinging in from the top left
    '<path class="dp-club" d="M10 6 L40 26"/>' +
    '<path class="dp-clubhead" d="M30 20 L44 30"/>' +
    // the strike: short lines out from the point of impact on top of the head
    '<path class="dp-hit" d="M52 24 L58 16 M60 28 L68 24 M46 22 L47 13"/>' +
    badge(1, 78, 14) + badge(2, 76, 83)
  );
}

/** A bucket of seawater with the fish head down, the gill cut open, blood drifting out. */
function bleed(): string {
  return (
    // the bucket, with the water line a wave across it
    '<path class="dp-body" d="M62 22 L70 88 L150 88 L158 22"/>' +
    '<path class="dp-body" d="M56 22 L164 22"/>' +
    '<circle class="dp-ear" cx="60" cy="30" r="3"/><circle class="dp-ear" cx="160" cy="30" r="3"/>' +
    '<path class="dp-water" d="M64 38 C74 33 82 43 92 38 C102 33 110 43 120 38 C130 33 138 43 148 38 L156 38"/>' +
    // the fish, head down: its own outline turned so the tail is above the water, the gill cut open
    '<g transform="translate(89 90.7) rotate(-90) scale(0.42)">' + FISH + GILL_CUT + '</g>' +
    // blood drifting out of the gills into the water
    '<path class="dp-blood" d="M118 64 C126 60 130 68 138 64 M120 72 C128 70 132 78 142 74 M104 66 C98 62 94 70 86 66"/>' +
    // the clock: three minutes or more
    '<text class="dp-clock" x="176" y="44">3 min</text>' +
    '<path class="dp-body" d="M188 56 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M188 56 L188 50 M188 56 L193 58"/>' +
    badge(1, 130, 56) + badge(2, 96, 84)
  );
}

/** A cooler cut open: seawater, ice and the fish lying in it, the water line near the top. */
function slurry(): string {
  const cube = (x: number, y: number, r = 0) =>
    `<rect class="dp-cube" x="${x}" y="${y}" width="12" height="12" rx="1.5" transform="rotate(${r} ${x + 6} ${y + 6})"/>`;
  return (
    '<path class="dp-body" d="M26 28 L26 86 L194 86 L194 28"/>' +
    '<path class="dp-body" d="M18 28 L202 28"/>' +
    '<path class="dp-water" d="M28 44 C46 39 56 49 76 44 C96 39 106 49 126 44 C146 39 156 49 176 44 L192 44"/>' +
    // the fish, small, in the middle of the slurry
    '<g transform="translate(56 40) scale(0.5)">' + FISH + '</g>' +
    cube(34, 50, -10) + cube(42, 68, 8) + cube(62, 70, -6) + cube(84, 72, 12) + cube(104, 64, -8) +
    cube(124, 52, 10) + cube(140, 68, -4) + cube(158, 54, 8) + cube(172, 70, -12) + cube(148, 36, 4) + cube(70, 32, -8) +
    '<text class="dp-clock" x="100" y="16">≈ 0 °C / 32 °F</text>' +
    badge(1, 180, 60) + badge(2, 110, 46)
  );
}

export function methodArt(id: MethodId): string {
  switch (id) {
    case 'ikejime': return ikejime();
    case 'club': return club();
    case 'bleed': return bleed();
    case 'slurry': return slurry();
  }
}

/** How many numbered marks each drawing carries, for the tests that keep them in step with the lists. */
export const ART_MARKS: Record<MethodId, number> = { ikejime: 4, club: 2, bleed: 2, slurry: 2 };
