/**
 * Slider scale (J2): maps the time slider's thumb position to hours ahead, piecewise, so the rest of
 * today gets a wide, fine-grained stretch, each of the next six days gets an equal, labelled
 * section, and the far 8 to 30 day outlook is squeezed into the end. Pure: no DOM.
 *
 * Positions run 0..POS_MAX; inside a segment the mapping is linear, so the thumb moves evenly
 * through each day. Days are Costa Rica calendar days (REGION.tzOffsetH).
 */
import { HORIZON_H } from './time';

export const POS_MAX = 1000;
const HOUR_MS = 3.6e6;
/** Share of the track, in positions, for the rest of today when a full day remains. */
const TODAY_FULL = 320;
/** Hours of today that earn the full TODAY_FULL width; fewer hours left get a narrower stretch. */
const TODAY_REF_H = 16;
/** Where the far outlook (after the seventh day) starts. */
const LATER_FROM = 800;
export const WEEK_DAYS = 6;

export type SegKind = 'today' | 'day' | 'later';
export interface Segment {
  kind: SegKind;
  fromH: number;
  toH: number;
  fromP: number;
  toP: number;
  /** Local weekday (0 = Sunday) for 'today' and 'day' segments. */
  weekday?: number;
}

/**
 * The segments for a slider anchored at `baseMs` (the whole hour the app loaded at).
 * `tzOffsetH` turns that into local calendar days.
 */
export function sliderScale(baseMs: number, tzOffsetH: number): Segment[] {
  const local = new Date(baseMs + tzOffsetH * HOUR_MS);
  const toMidnight = 24 - local.getUTCHours(); // 1..24 hours left today, counting this one
  const todayP = Math.round(TODAY_FULL * Math.max(0.35, Math.min(1, toMidnight / TODAY_REF_H)));
  const dayP = (LATER_FROM - todayP) / WEEK_DAYS;
  const weekday = local.getUTCDay();
  const segs: Segment[] = [{ kind: 'today', fromH: 0, toH: toMidnight, fromP: 0, toP: todayP, weekday }];
  for (let i = 0; i < WEEK_DAYS; i++) {
    const fromH = toMidnight + 24 * i;
    segs.push({
      kind: 'day',
      fromH,
      toH: fromH + 24,
      fromP: todayP + dayP * i,
      toP: i === WEEK_DAYS - 1 ? LATER_FROM : todayP + dayP * (i + 1),
      weekday: (weekday + 1 + i) % 7,
    });
  }
  segs.push({ kind: 'later', fromH: toMidnight + 24 * WEEK_DAYS, toH: HORIZON_H, fromP: LATER_FROM, toP: POS_MAX });
  return segs;
}

const segAtP = (segs: Segment[], p: number) => segs.find((s) => p <= s.toP) ?? segs[segs.length - 1];
const segAtH = (segs: Segment[], h: number) => segs.find((s) => h < s.toH) ?? segs[segs.length - 1];

/** Hours ahead (fractional; the store snaps it) for a thumb position. */
export function posToHours(segs: Segment[], pos: number): number {
  const p = Math.min(POS_MAX, Math.max(0, pos));
  const s = segAtP(segs, p);
  return s.fromH + ((p - s.fromP) / (s.toP - s.fromP)) * (s.toH - s.fromH);
}

/** Thumb position for hours ahead. */
export function hoursToPos(segs: Segment[], h: number): number {
  const x = Math.min(HORIZON_H, Math.max(0, h));
  const s = segAtH(segs, x);
  return s.fromP + ((x - s.fromH) / (s.toH - s.fromH)) * (s.toP - s.fromP);
}

/** Which segment an hour falls in. */
export function segmentFor(segs: Segment[], h: number): Segment {
  return segAtH(segs, Math.min(HORIZON_H, Math.max(0, h)));
}

/** Step for the − / + buttons: an hour through today, 3 hours through the week, a day after. */
export function buttonStepH(segs: Segment[], h: number, dir: 1 | -1): number {
  const s = segmentFor(segs, dir < 0 ? h - 1 : h);
  return s.kind === 'today' ? 1 : s.kind === 'day' ? 3 : 24;
}

/**
 * Hours ahead for a tap on a day's label: that day at the same local clock hour as `currentH`,
 * or the first hour still ahead of now for today.
 */
export function jumpToDay(segs: Segment[], seg: Segment, currentH: number): number {
  const today = segs[0];
  const clock = (((currentH - today.toH) % 24) + 24) % 24; // hours after local midnight of the viewed hour
  if (seg.kind === 'today') return Math.max(0, Math.min(today.toH - 1, currentH < today.toH ? currentH : today.toH - 24 + clock));
  return Math.min(seg.toH - 1, seg.fromH + clock);
}
