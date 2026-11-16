/** Extra pictograms for the First aid tab, on the same 24 px grid and rules as icons.ts. */
import type { Pict } from '../icons';

const DROP = 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z';
const TAP = 'M4 8h9a3 3 0 0 1 3 3v1M4 8V5M2 5h6M16 12v2M16 17v2';
const BOTTLE = 'M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3zM8 14h8';
const CUT = 'M4 20L16 8l3 3L7 21zM16 8l3-3';
const MOUTH = 'M3 12c3-4 15-4 18 0-3 4-15 4-18 0zM3 12h18';
const BAND = 'M3 9h18v6H3zM8 9v6M16 9v6';
const FLAME = 'M12 21c-4 0-6-3-6-6 0-3 3-5 3-9 3 2 4 4 4 6 1-1 1-2 1-3 2 2 4 4 4 6 0 3-2 6-6 6z';
const SICK = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8.5 16c2-1.5 5-1.5 7 0';
const SYRINGE = 'M15 4l5 5M17 6l-9 9-3 1 1-3 9-9M5 19l-2 2M11 13l-2-2';
const CLOCK = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3.2 2';
const GRAINS = [[5, 15, 1.1], [9, 12, 1.1], [13, 15, 1.1], [17, 12, 1.1], [7, 8, 1.1], [15, 8, 1.1], [11, 18, 1.1], [19, 17, 1.1]] as const;
const EYES = [[9, 10, 1.1], [15, 10, 1.1]] as const;

export const AID_PICTS = {
  breath: { d: 'M12 3v9M12 12c-2.5 0-5 1-5 5.5 0 2 1.2 3 2.6 3 1.6 0 2.4-1 2.4-3M12 12c2.5 0 5 1 5 5.5 0 2-1.2 3-2.6 3-1.6 0-2.4-1-2.4-3' },
  heart: { d: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z' },
  faint: { d: 'M9 14h10l2 3M3 21h18', dots: [[5.5, 13, 2.2]] },
  rash: { d: 'M12 3a2 2 0 1 1 0 .01M8 9h8M12 8v6M12 14l-3 7M12 14l3 7', dots: [[10, 11, 0.9], [14, 11, 0.9], [12, 12.5, 0.9]] },
  seawater: { d: 'M2 9c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0M2 15c2-1.5 3.5-1.5 5 0s3.5 1.5 5 0 3.5-1.5 5 0 3.5 1.5 5 0' },
  tap: { d: TAP },
  notap: { d: TAP, x: true },
  drop: { d: DROP },
  nodrop: { d: DROP, x: true },
  bottle: { d: BOTTLE },
  nobottle: { d: BOTTLE, x: true },
  nosand: { d: 'M2 20h20', dots: GRAINS, x: true },
  tweezers: { d: 'M6 3l6 10M18 3l-6 10M12 13v8' },
  hotwater: { d: 'M5 11h14l-1.5 9h-11zM8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3' },
  thermo: { d: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v8' },
  soap: { d: 'M4 13a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z', dots: [[8, 5, 1.6], [13, 4, 1.2], [17, 6, 1.4]] },
  nocut: { d: CUT, x: true },
  nomouth: { d: MOUTH, x: true },
  notie: { d: BAND, x: true },
  band: { d: BAND },
  bandage: { d: 'M3.5 15.5l12-12 5 5-12 12zM9 9l6 6' },
  syringe: { d: SYRINGE },
  nosyringe: { d: SYRINGE, x: true },
  tape: { d: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17.5 18l3.5 3' },
  cream: { d: 'M8 3h8v3H8zM9 6l-1 14h8l-1-14M10 12h4' },
  pill: { d: 'M5.6 12.4l6.8-6.8a3.5 3.5 0 0 1 5 5l-6.8 6.8a3.5 3.5 0 0 1-5-5zM9 9l5 5' },
  trunks: { d: 'M4 6h16v5l-4 7h-2l-2-5-2 5H8l-4-7z' },
  shower: { d: 'M5 8a7 7 0 0 1 14 0zM8 12v2M12 12v3M16 12v2M10 17v2M14 18v2' },
  urchin: { d: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3 3M15.4 15.4l3 3M18.4 5.6l-3 3M8.6 15.4l-3 3' },
  fish: { d: 'M3 12c3-5 9-6 13-1l5-3v8l-5-3c-4 5-10 4-13-1z', dots: [[8, 11, 1]] },
  stingray: { d: 'M12 4L3 11l9 4 9-4zM12 15v7' },
  cone: { d: 'M12 3l7 18H5zM8.5 9h7M7 14h10M6 18h12' },
  bite: { d: 'M3 8l3 4 3-4 3 4 3-4 3 4 3-4M3 17l3-4 3 4 3-4 3 4 3-4' },
  shark: { d: 'M3 17c4 0 6-1 8-13 3 5 5 10 10 13zM2 21c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0' },
  crab: { d: 'M7 12a5 4 0 0 1 10 0v2H7zM7 12L3 8M17 12l4-4M7 15l-3 3M17 15l3 3M10 15l-1 4M14 15l1 4' },
  oyster: { d: 'M4 14c0-6 4-9 8-9s8 3 8 9c0 3-3 5-8 5s-8-2-8-5zM8 14c0-3 2-5 4-5s4 2 4 5' },
  sponge: { d: 'M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z', dots: [[9, 10, 1.2], [14, 9, 1.2], [11, 14, 1.2], [15.5, 15, 1.2]] },
  tingle: { d: 'M13 3l-4 8 5 1-4 9' },
  sick: { d: SICK, dots: EYES },
  nosick: { d: SICK, dots: EYES, x: true },
  pulse: { d: 'M2 12h5l2-6 4 12 2-6h7' },
  jar: { d: 'M8 4h8v3H8zM7 7h10v13H7zM7 12h10' },
  nowait: { d: CLOCK, x: true },
  noflame: { d: FLAME, x: true },
} as const satisfies Record<string, Pict>;
