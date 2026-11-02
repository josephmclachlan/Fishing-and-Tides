/**
 * Derives the Limón tide harmonic constants from the UHSLC tide gauge (PLAN 3.1).
 *
 *   npm run data:tides
 *
 * TPXO and FES constituents need a registered download, so instead we run a least-squares
 * harmonic analysis on the gauge itself (UHSLC station 268, Limón; research-quality hourly).
 * At the gauge this beats a global model anyway; along the 50 km to Gandoca the tide is
 * the same wave to within minutes (see docs/TIDES.md).
 *
 * Fit: 2010–2020 (11 full years, each year's mean removed so datum steps and sea-level rise
 * don't leak into the harmonics). Validation: 2023–2024 research-quality and 2025–2026
 * fast-delivery data, never seen by the fit. Writes src/data/tides-limon.ts and a held-out
 * month as a test fixture. Needs Node 22.18+ (runs TypeScript directly). No dependencies.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CONSTITUENT_NAMES, extrema, fitHarmonics, predict, type Harmonics } from '../src/physics/tide.ts';
import { TIDE_STATION } from '../src/region.ts';

const CACHE = 'node_modules/.cache/tides';
const RQ = `https://uhslc.soest.hawaii.edu/data/csv/rqds/atlantic/hourly/h${TIDE_STATION.uhslc}b.csv`;
const FAST = `https://uhslc.soest.hawaii.edu/data/csv/fast/hourly/h${TIDE_STATION.uhslc}.csv`;
const HOUR = 3_600_000;

interface Series { t: number[]; h: number[] }

async function load(url: string): Promise<Series> {
  mkdirSync(CACHE, { recursive: true });
  const file = `${CACHE}/${url.split('/').slice(-3).join('-')}`;
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    writeFileSync(file, await res.text());
  }
  const t: number[] = [];
  const h: number[] = [];
  // Rows: year, month, day, hour (UTC), height in mm above gauge zero (-32767 = missing).
  for (const line of readFileSync(file, 'utf8').trim().split('\n')) {
    const [y, mo, d, hr, v] = line.split(',').map(Number);
    t.push(Date.UTC(y, mo - 1, d, hr));
    h.push(v === -32767 ? NaN : v / 1000);
  }
  return { t, h };
}

function yearsOf(s: Series, y0: number, y1: number): Series {
  const a = Date.UTC(y0, 0, 1);
  const b = Date.UTC(y1, 0, 1);
  const out: Series = { t: [], h: [] };
  s.t.forEach((t, i) => {
    if (t >= a && t < b) { out.t.push(t); out.h.push(s.h[i]); }
  });
  return out;
}

/** Subtract each calendar year's mean (years under 90 % complete are dropped). */
function demeanByYear(s: Series): Series {
  const by = new Map<number, number[]>();
  s.t.forEach((t, i) => {
    const y = new Date(t).getUTCFullYear();
    if (!by.has(y)) by.set(y, []);
    by.get(y)!.push(i);
  });
  const out: Series = { t: [], h: [] };
  for (const idx of by.values()) {
    const ok = idx.filter((i) => Number.isFinite(s.h[i]));
    if (ok.length < 0.9 * 8760) continue;
    const mean = ok.reduce((a, i) => a + s.h[i], 0) / ok.length;
    for (const i of idx) { out.t.push(s.t[i]); out.h.push(s.h[i] - mean); }
  }
  return out;
}

const finite = (xs: number[]) => xs.filter(Number.isFinite);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Observed highs and lows from hourly data: local turning points refined by a parabola through 3 points. */
function observedExtrema(s: Series): { t: number; h: number; type: 'high' | 'low' }[] {
  const out: { t: number; h: number; type: 'high' | 'low' }[] = [];
  // Light 3-hour smoothing first so the non-tidal chop doesn't make false turns.
  const sm = s.h.map((_, i) => (i > 0 && i < s.h.length - 1 ? (s.h[i - 1] + 2 * s.h[i] + s.h[i + 1]) / 4 : NaN));
  for (let i = 2; i < sm.length - 2; i++) {
    const [a, b, c] = [sm[i - 1], sm[i], sm[i + 1]];
    if (![a, b, c, sm[i - 2], sm[i + 2]].every(Number.isFinite)) continue;
    const high = b > a && b >= c && b > sm[i - 2] && b >= sm[i + 2];
    const low = b < a && b <= c && b < sm[i - 2] && b <= sm[i + 2];
    if (!high && !low) continue;
    const den = a - 2 * b + c;
    const dx = den !== 0 ? (0.5 * (a - c)) / den : 0;
    out.push({ t: s.t[i] + dx * HOUR, h: b, type: high ? 'high' : 'low' });
  }
  return out;
}

function validate(hc: Harmonics, s: Series, label: string) {
  const ok = s.t.map((t, i) => [t, s.h[i]] as const).filter(([, h]) => Number.isFinite(h));
  const obsMean = mean(ok.map(([, h]) => h));
  const prdMean = mean(ok.map(([t]) => predict(hc, t)));
  const off = obsMean - prdMean;
  const sd = Math.sqrt(mean(ok.map(([, h]) => (h - obsMean) ** 2)));
  const rms = Math.sqrt(mean(ok.map(([t, h]) => (h - off - predict(hc, t)) ** 2)));
  // Timing: match each predicted high/low with the nearest observed one of the same type within 3 h.
  const obs = observedExtrema(s);
  const prd = extrema(hc, s.t[0], s.t[s.t.length - 1]);
  const dt: number[] = [];
  const dh: number[] = [];
  let j = 0;
  for (const p of prd) {
    while (j < obs.length && obs[j].t < p.t - 3 * HOUR) j++;
    let best: (typeof obs)[number] | undefined;
    for (let k = j; k < obs.length && obs[k].t <= p.t + 3 * HOUR; k++)
      if (obs[k].type === p.type && (!best || Math.abs(obs[k].t - p.t) < Math.abs(best.t - p.t))) best = obs[k];
    if (best) { dt.push((p.t - best.t) / 60_000); dh.push(p.h + off - best.h); }
  }
  const absMed = (xs: number[]) => { const a = xs.map(Math.abs).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const r = {
    label,
    hours: ok.length,
    sdCm: +(sd * 100).toFixed(1),
    rmsCm: +(rms * 100).toFixed(1),
    explained: +(1 - (rms / sd) ** 2).toFixed(3),
    matched: `${dt.length}/${prd.length}`,
    timingBiasMin: +mean(dt).toFixed(0),
    timingMedianAbsMin: +absMed(dt).toFixed(0),
    heightMedianAbsCm: +(absMed(dh) * 100).toFixed(1),
    datumOffsetCm: +(off * 100).toFixed(1),
  };
  console.log(r);
  return r;
}

const rq = await load(RQ);
const fast = await load(FAST);
const fitData = demeanByYear(yearsOf(rq, 2010, 2021));
const fit = fitHarmonics(fitData.t, fitData.h, CONSTITUENT_NAMES);
console.log(`fit: ${finite(fitData.h).length} h, residual RMS ${(fit.rms * 100).toFixed(1)} cm`);

// Keep constituents of at least 2 mm; the rest are noise at this station.
const constituents: Harmonics['constituents'] = {};
for (const n of CONSTITUENT_NAMES) {
  const k = fit.constituents[n]!;
  if (k.H >= 0.002) constituents[n] = { H: +k.H.toFixed(4), g: +k.g.toFixed(1) };
}
const hc: Harmonics = { z0: 0, constituents };

// Datums from an 18.61-year (one nodal cycle) hourly prediction relative to MSL.
let lat = Infinity;
let hat = -Infinity;
for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2038, 7, 12); t += HOUR) {
  const h = predict(hc, t);
  if (h < lat) lat = h;
  if (h > hat) hat = h;
}

const results = [
  validate(hc, yearsOf(rq, 2023, 2024), '2023 (research quality, held out)'),
  validate(hc, yearsOf(rq, 2024, 2025), '2024 (research quality, held out)'),
  validate(hc, yearsOf(fast, 2025, 2027), '2025–2026 (fast delivery, held out)'),
];

const sorted = Object.entries(constituents).sort((a, b) => b[1]!.H - a[1]!.H);
writeFileSync(
  'src/data/tides-limon.ts',
  `/**
 * Tide harmonic constants for the UHSLC Limón gauge (station ${TIDE_STATION.uhslc}), generated by
 * \`npm run data:tides\` (scripts/fit-tides.ts) on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
 * Least-squares fit to 2010–2020 hourly research-quality data. Heights in metres relative to
 * mean sea level; phases are Greenwich lags in degrees (UTC). See docs/TIDES.md.
 */
import type { Harmonics } from '../physics/tide';

export const LIMON_HARMONICS: Harmonics = {
  z0: 0,
  constituents: {
${sorted.map(([n, k]) => `    ${/^\d/.test(n) ? `'${n}'` : n}: { H: ${k!.H}, g: ${k!.g} },`).join('\n')}
  },
};

/** Tidal datums relative to MSL over one 18.61-year nodal cycle, metres. */
export const LIMON_DATUMS = { lat: ${lat.toFixed(3)}, hat: ${hat.toFixed(3)} } as const;

/** Held-out validation against the gauge (see docs/TIDES.md). */
export const LIMON_VALIDATION = ${JSON.stringify(results, null, 2).replace(/"(\w+)":/g, '$1:')} as const;
`,
);

// Test fixture: March 2024, hourly, mm, held out from the fit.
const m = yearsOf(rq, 2024, 2025);
const a = Date.UTC(2024, 2, 1);
const b = Date.UTC(2024, 3, 1);
const fx = { start: a, stepMs: HOUR, mm: m.t.flatMap((t, i) => (t >= a && t < b ? [Number.isFinite(m.h[i]) ? Math.round(m.h[i] * 1000) : null] : [])) };
writeFileSync('src/physics/fixtures/limon-2024-03.json', JSON.stringify(fx) + '\n');
console.log(`LAT ${lat.toFixed(3)} m, HAT ${hat.toFixed(3)} m; wrote src/data/tides-limon.ts and the test fixture`);
