/**
 * Activity icons (SurCast, 2026-11-16): one line icon per activity on a 24 grid, 1.8 stroke, round ends, drawn in
 * the same line language as the logo. Shape says which activity; colour is that activity's token. The launch and map
 * loaders turn their dots into these, left to right (src/boot-view.ts).
 */
export const ACTIVITY_ORDER = ['fish', 'spear', 'snorkel', 'dive', 'surf', 'sail', 'swim', 'paddle'] as const;
export type ActivityIcon = (typeof ACTIVITY_ORDER)[number];

/** The colour token each icon takes (spearfishing shares fishing's). */
export const ACTIVITY_TOKEN: Record<ActivityIcon, 'fish' | 'snorkel' | 'dive' | 'surf' | 'sail' | 'swim' | 'paddle'> = {
  fish: 'fish', spear: 'fish', snorkel: 'snorkel', dive: 'dive', surf: 'surf', sail: 'sail', swim: 'swim', paddle: 'paddle',
};

/** Inner SVG of each icon (strokes in currentColor-free form: the caller sets stroke). */
export const ACTIVITY_GLYPH: Record<ActivityIcon, string> = {
  // a fish side on: body, forked tail, eye
  fish: '<path d="M3.5 12c2.6-4 6.4-5.6 10-5.6 2.6 0 4.6 1.2 6 2.6l2.5-2.5v11l-2.5-2.5c-1.4 1.4-3.4 2.6-6 2.6-3.6 0-7.4-1.6-10-5.6Z"/><path d="M8.6 11h.01"/>',
  // a spear shaft with its head and the band at the back
  spear: '<path d="M3 21 18.5 5.5"/><path d="m15 4 6-1-1 6"/><path d="M6.5 17.5 4 15M9 15l-2.5-2.5"/>',
  // a mask with the snorkel tube beside it
  snorkel: '<path d="M3 9.5h12.5a1.5 1.5 0 0 1 1.5 1.5v2.5a3 3 0 0 1-3 3h-1.4l-1.6-2.2-1.6 2.2H6a3 3 0 0 1-3-3Z"/><path d="M20.5 3v13.5a4.5 4.5 0 0 1-4.5 4.5h-3"/>',
  // the diver-down flag: a square with a diagonal band
  dive: '<rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="M3 7.2 18.8 19M5.2 5 21 16.8"/>',
  // a curling wave over the water line
  surf: '<path d="M2.5 18.5c3-.2 5-2 6.2-5.6C10.4 7.6 13.4 5 17 5c2.6 0 4.5 1.6 4.5 3.9 0 1.9-1.4 3.2-3.1 3.2-1.4 0-2.4-1-2.4-2.3"/><path d="M2.5 21.5h19"/>',
  // mainsail and jib on a hull
  sail: '<path d="M12 2.8V16"/><path d="M12 3.6 19.5 15.5H12"/><path d="M12 6 6 15.5h6"/><path d="M3.5 18.5h17l-2.2 2.8H5.7Z"/>',
  // a swimmer's head and arm over the waves
  swim: '<circle cx="17.5" cy="7" r="2.1"/><path d="M3.5 12.5 9 9.5l3.6 3.6M13.5 7.5 9 9.5"/><path d="M2.5 17c1.6 0 2.4-1.2 4-1.2s2.4 1.2 4 1.2 2.4-1.2 4-1.2 2.4 1.2 4 1.2 2.4-1.2 3-1.2"/>',
  // a double-bladed kayak paddle
  paddle: '<path d="m5 19 14-14"/><path d="M3.2 20.8c-1-1-.4-3.6 1.4-5.4l1.9 1.9c-1.8 1.8-2.3 4.5-3.3 3.5ZM20.8 3.2c1 1 .4 3.6-1.4 5.4l-1.9-1.9c1.8-1.8 2.3-4.5 3.3-3.5Z"/>',
};

/** One icon as an inline SVG. */
export function activityIcon(a: ActivityIcon, stroke: string, size = 24, extra = ''): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ACTIVITY_GLYPH[a]}</svg>`;
}
