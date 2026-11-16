/**
 * Extra pictograms for the Rigs and Releasing fish tabs, on the same 24 px grid and rules as icons.ts. Every id starts
 * with `rg`, so none can clash with another group's pictograms when they are merged into PICTS.
 */
import type { Pict } from '../icons';

const SMALLFISH = 'M3 12c3-3 9-4 13-1l5-3v8l-5-3c-4 3-10 2-13-1z';

export const RIGS_PICTS = {
  // the five local fish, each with its own outline
  rgsnapper: { d: 'M2 12c3-5 9-7 14-4l5-4v16l-5-4c-5 3-11 1-14-4zM9 7c1-2 4-3 6-1', dots: [[6, 11, 1.2]] },
  rggrouper: { d: 'M2 13c1-5 7-8 13-6l2 1c2-1 4-2 5-1v10c-1 1-3 0-5-1l-2 1c-6 2-12-1-13-4zM2 13h4', dots: [[6.5, 10.5, 1.2]] },
  rgsnook: { d: 'M1 12.5c4-3.5 12-4.5 17-1.5l4-3v8l-4-3c-5 3-13 2.5-17-.5zM6 12.5h12M1 12.5l2 1', dots: [[4.5, 11, 1]] },
  rgmackerel: { d: 'M1 12c5-3 12-3 16 0l5-4v8l-5-4c-4 3-11 3-16 0zM13 9.6l1-1.4M15.5 10.4l1-1.4M13 14.4l1 1.4M15.5 13.6l1 1.4', dots: [[4.5, 11.3, 1]] },
  rgjack: { d: 'M3 14c0-6 4-9 9-8 3 1 5 3 7 5l3-5v15l-3-5c-2 2-5 4-9 4-4 0-7-2-7-6zM8 7l3-3', dots: [[6.5, 11.5, 1.2]] },
  // bait
  rgshrimp: { d: 'M18 6c-6-1-12 2-12 8 0 3 2 5 5 5l1-3c-2 0-3-1-3-2 0-4 4-6 9-5zM18 6l4-3M18 6l4 1M8 19l-2 3M11.5 19l.5 3' },
  rgsardine: { d: SMALLFISH, dots: [[6.5, 11.5, 1]] },
  rgcut: { d: 'M3 9l13-3 2 4-13 3zM6 16l13-3 2 4-13 3z' },
  rgcrab: { d: 'M6 13a6 4 0 0 0 12 0 6 4 0 0 0-12 0zM6.5 11L3 8l2-3M17.5 11l3.5-3-2-3M7 15.5l-3 3M17 15.5l3 3M9.5 16.5l-1.5 4M14.5 16.5l1.5 4' },
  rgnet: { d: 'M12 3v4M12 7L4 19M12 7l8 12M12 7l-3 13M12 7l3 13M4 19c2.5 1.5 13.5 1.5 16 0', dots: [[4, 19, 1.3], [8, 20, 1.3], [12, 20.5, 1.3], [16, 20, 1.3], [20, 19, 1.3]] },
  // knots
  rgdrop: { d: 'M12 3c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z' },
  rgscissors: { d: 'M8.5 8.5L20 18M8.5 15.5L20 6M9 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z' },
  rgpull: { d: 'M2 12h7M15 12h7M5 9l-3 3 3 3M19 9l3 3-3 3', dots: [[12, 12, 2.6]] },
  // the BITE score
  rgdawn: { d: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 10l2 2M19 10l-2 2M8 21h8' },
  rgwind: { d: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8' },
  rgmud: { d: 'M2 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0', dots: [[6, 12, 1.2], [11, 14, 1.2], [16, 12, 1.2], [8, 18, 1.2], [14, 19, 1.2], [19, 16, 1.2], [4, 16, 1.2]] },
  rgclear: { d: 'M2 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M5 16c2-3 7-4 11-1l4-2.5v7l-4-2.5c-4 3-9 2-11-1z' },
  rgsquall: { d: 'M7 13a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6 1A3.5 3.5 0 0 1 17 13zM12 13l-2 4h4l-2 5' },
  // lionfish, lobster, octopus, spearfishing
  rglion: { d: 'M3 15c3-3 9-4 13-1l5-3v8l-5-3c-4 3-10 2-13-1zM6 13l-1-8M9 12V3M12 12l1-9M15 13l2-7', dots: [[6, 14.5, 1]] },
  rglobster: { d: 'M12 5v12M9 7h6M8.5 10h7M9 13h6M10 16h4M12 17l-3 4h6zM10 5L6 2M14 5l4-3M9 8L5 7l-1 3M15 8l4-1 1 3' },
  rgoctopus: { d: 'M6 11a6 6 0 0 1 12 0v2H6zM7 13c0 4-3 5-3 7M10 13c0 4-1 6-2 8M14 13c0 4 1 6 2 8M17 13c0 4 3 5 3 7', dots: [[9.5, 10, 1], [14.5, 10, 1]] },
  rgnotank: { d: 'M9 7h6v14H9zM10.5 7V4h3v3M12 4V2M9 11h6', x: true },
  rgnospear: { d: 'M4 20L19 5M19 5l-5.5 1M19 5l-1 5.5', x: true },
  // releasing fish
  rgruler: { d: 'M2 8h20v8H2zM6 8v4M10 8v3M14 8v4M18 8v3' },
  rgturtle: { d: 'M7 13a5 5.5 0 1 0 10 0 5 5.5 0 1 0-10 0zM12 7.5c-1.5-1-1.5-4 0-5 1.5 1 1.5 4 0 5zM8 9L4.5 6.5M16 9l3.5-2.5M8 17l-3 3M16 17l3 3M9 13h6M12 10v6' },
  rgray: { d: 'M3 11c3-5 15-5 18 0-3 4-6 5-9 5s-6-1-9-5zM12 16v6M12 19l2.5-1' },
  rgnoeat: { d: SMALLFISH, dots: [[6.5, 11.5, 1]], x: true },
  rgenough: { d: 'M5 9h14l-2 11H7zM4 9h16M9 9c0-3 6-3 6 0M10 13v4M14 13v4' },
  rgvent: { d: 'M3 21l4-4M7 17L17 7M17 7l3-3M15 5l4 4M9 15l-2-2' },
  rgknife: { d: 'M3 21l6-6M9 15l11-11c1 3 0 7-4 10l-3 1z', x: true },
  rglimp: { d: 'M3 14c3-2 9-2 13 0l5-3v7l-5-3c-4 2-10 2-13-1zM6 9l2 2M8 9l-2 2', dots: [] },
} as const satisfies Record<string, Pict>;
