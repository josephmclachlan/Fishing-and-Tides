import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { moonPhase } from '../physics/astro';
import { BODY_M, drawPerson, drawRadar, heroParams, HeroEngine, numVar, VMAX } from './art';
import { daysAt, FC_ACTIVITIES, readAt, timeline } from './model';
import { headline, moonAgeDays } from './view';
import { DAY0, empty, full, H, recCtx, spot, tokens } from './testkit';

const at = DAY0 + 10 * H; // 10:00 local
const ctxFor = (deps: ReturnType<typeof full>, a: (typeof FC_ACTIVITIES)[number], name: string) => {
  const sp = spot(name);
  const plan = daysAt(deps, a, sp, at, 7);
  return { sp, plan, tl: timeline(deps, a, sp, plan.startMs) };
};

const ST = (reduced: boolean) => ({ ink: '#fff', soft: '#ccc', faint: '#888', on: [255, 255, 255], fd: [0, 200, 0], T: tokens(), reduced }) as never;
describe('hero pictures take their numbers from the reading (PLAN 7.69)', () => {
  it('SURF: the face range is the reading\'s, on a 1.7 m adult\'s knee, waist, chest and head', () => {
    const deps = full();
    const { sp, plan, tl } = ctxFor(deps, 'surf', 'SALSA BRAVA');
    const r = readAt(deps, 'surf', sp, at);
    const p = heroParams(r, { deps, ms: at, plan, tl });
    expect([p.surf!.lo, p.surf!.hi]).toEqual(r.surf!.range);
    expect(p.surf!.hb).toBe(r.surf!.hb);
    expect(p.surf!.period).toBe(r.surf!.tp);
    expect(p.surf!.guides.map((g) => g[0])).toEqual([BODY_M.knee, BODY_M.waist, BODY_M.chest, BODY_M.head]);
    expect(p.surf!.caption).toContain(headline(r).value);
  });
  it('FISH: the moon\'s lit share and age, and today\'s tide from the timeline', () => {
    const deps = full();
    const { sp, plan, tl } = ctxFor(deps, 'fish', 'PUNTA UVA');
    const r = readAt(deps, 'fish', sp, at);
    const p = heroParams(r, { deps, ms: at, plan, tl });
    expect(p.fish!.illum).toBe(r.fish!.moonIllum);
    expect(p.fish!.age).toBeCloseTo(moonAgeDays(moonPhase(at).elongation), 9);
    expect(p.fish!.tide).toEqual(tl.slice(0, 24).map((h) => h.tideM));
    expect(p.fish!.nowH).toBeCloseTo(10, 9);
    expect(p.fish!.moon).toContain(`${Math.round(r.fish!.moonIllum * 100)}%`);
  });
  it('SAIL: the wind, gusts and direction are the reading\'s', () => {
    const deps = full();
    const { sp, plan, tl } = ctxFor(deps, 'sail', 'PLAYA COCLES');
    const r = readAt(deps, 'sail', sp, at);
    const p = heroParams(r, { deps, ms: at, plan, tl });
    expect(p.sail!.windKt).toBe(r.sail!.windKt);
    expect(p.sail!.gustKt).toBe(r.sail!.gustKt);
    expect(p.sail!.fromDeg).toBe(r.sail!.fromDeg);
    expect(p.sail!.kt).toBe(`${Math.round(r.sail!.windKt!)} kt`);
  });
  it('SNORKEL, DIVE and SWIM: visibility, depth, water over the reef, rip and shore break are the reading\'s', () => {
    const deps = full();
    for (const a of ['snorkel', 'dive'] as const) {
      const { sp, plan, tl } = ctxFor(deps, a, 'PUNTA CAHUITA');
      const r = readAt(deps, a, sp, at);
      const p = heroParams(r, { deps, ms: at, plan, tl });
      expect(p.water!.visM).toBe(r.water!.visM);
      expect(p.water!.depthM).toBe(r.water!.depthM);
      expect(p.water!.waterM).toBe(r.water!.waterM);
      expect(p.water!.surgeMs).toBe(r.water!.surgeMs);
    }
    const { sp, plan, tl } = ctxFor(deps, 'swim', 'PLAYA COCLES');
    const r = readAt(deps, 'swim', sp, DAY0 + 11 * H);
    const p = heroParams(r, { deps, ms: DAY0 + 11 * H, plan, tl });
    expect(p.swim!.rip).toBe(r.swim!.rip);
    expect(p.swim!.shore).toContain(r.swim!.breakerM.toFixed(1));
    expect(p.swim!.uv).toBe(r.swim!.uv);
  });
  it('has no picture without data, rather than an invented one (FISH reads the tide and moon, always there)', () => {
    const deps = empty();
    for (const a of FC_ACTIVITIES.filter((x) => x !== 'fish')) {
      const { sp, plan, tl } = ctxFor(deps, a, 'PUNTA CAHUITA');
      const p = heroParams(readAt(deps, a, sp, at), { deps, ms: at, plan, tl });
      expect(p.ok).toBe(false);
      expect(p.surf ?? p.fish ?? p.sail ?? p.swim ?? p.water).toBeUndefined();
    }
  });
  it('breathes the number inside its widest setting, and holds it still under reduced motion', () => {
    const deps = full();
    for (const a of FC_ACTIVITIES) {
      const { sp, plan, tl } = ctxFor(deps, a, 'PLAYA COCLES');
      const p = heroParams(readAt(deps, a, sp, at), { deps, ms: at, plan, tl });
      for (let tt = 0; tt < 30; tt += 0.7) {
        const [wd, wg] = numVar(p, tt, false);
        expect(wd).toBeLessThanOrEqual(VMAX[a][0] + 1e-9);
        expect(wg).toBeLessThanOrEqual(900);
      }
      expect(numVar(p, 5, true)).toEqual([86, 800]);
    }
  });
});

describe('hero engine draws every activity without a NaN', () => {
  beforeAll(() => vi.stubGlobal('window', { devicePixelRatio: 2 }));
  afterAll(() => vi.unstubAllGlobals());
  const box = (w: number, h: number) => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }) }) as unknown as HTMLElement;
  it('runs the field and the diagram, moving and still, at phone and desktop sizes', () => {
    for (const deps of [full(), empty()])
      for (const a of FC_ACTIVITIES)
        for (const [w, h] of [[390, 760], [1440, 680]]) {
          const fx = recCtx(), ov = recCtx();
          const cv = (c: ReturnType<typeof recCtx>) => ({ getContext: () => c, width: 0, height: 0 }) as unknown as HTMLCanvasElement;
          const e = new HeroEngine(cv(fx), cv(ov), box(w, h), box(w * 0.9, h * 0.4));
          e.setTokens(tokens(), true);
          const { sp, plan, tl } = ctxFor(deps, a, 'PUNTA CAHUITA');
          e.set(heroParams(readAt(deps, a, sp, at), { deps, ms: at, plan, tl }), 0);
          e.resize();
          for (let i = 0; i < 6; i++) (e.step(1 / 30, i / 30 + 2), e.overlay(i / 30 + 2));
          e.reduced = true;
          e.still();
        }
  }, 60_000);
  it('draws the radar with and without the map\'s scale; kilometre labels only with it', () => {
    const c1 = recCtx(), c2 = recCtx();
    drawRadar(c1, 390, 460, 3, { cx: 195, cy: 230, kmPx: 40, name: 'Playa Cocles', level: 2, T: tokens(), reduced: false });
    drawRadar(c2, 390, 460, 3, { cx: 195, cy: 230, kmPx: null, name: 'Playa Cocles', level: null, T: tokens(), reduced: true });
    expect(c1.texts).toContain('1 KM');
    expect(c2.texts.some((s) => s.endsWith('KM'))).toBe(false);
  });
  it('draws a 1.7 m person to the same scale as the wave guides', () => {
    const c = recCtx(), mpx = 80, base = 400;
    drawPerson(c, 100, base, mpx, 1, ST(false));
    expect(c.texts).toEqual(['ADULT 1.7 M']);
    expect(c.calls).toContain('arc');
    const n = recCtx();
    drawPerson(n, 100, base, 2, 1, ST(true));
    expect(n.calls.length).toBe(0);
  });
});
