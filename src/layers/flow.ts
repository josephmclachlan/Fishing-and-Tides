/**
 * Wind and current particles (PLAN 1.4), drawn with WebGL2 on their own canvas over the map.
 *
 * Why a separate canvas instead of a MapLibre custom layer: the particles animate every frame,
 * and a custom layer would make MapLibre redraw the whole style 60 times a second. On a phone
 * on the water that is the battery. Here the map only redraws when it moves. The canvas sits
 * inside the map container, under the lock-on effect and the HUD, so the enhance pixelation
 * covers it like the rest of the map.
 *
 * Trails are geographic, not screen smears: every particle keeps its last HISTORY positions in
 * a ring of texture layers (one layer per time slot). Each frame the CPU writes one layer (the
 * newest positions) and the vertex shader builds each trail as a strip of quads by reading
 * neighbouring slots. So a pan or zoom carries the trails with the map, with nothing to clear.
 *
 * Phones: particle count scales with screen area, the canvas is capped at 2× pixel density,
 * and if frames run slow the count steps down.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { FlowSim, type FlowSource, type FlowView } from './flow-sim';
import { KT_PER_MS, mercX, mercY, worldPx } from '../physics/flow';
import { REGION } from '../region';

export type FlowKind = 'wind' | 'current';

/**
 * Look of each layer. Paces are picked so typical flow moves ~40 px/s on screen: 12 kt of wind
 * and a 0.7 kt current look alike. Red marks small-craft wind (25 kt) and a current too strong
 * to paddle or swim against (1.5 kt).
 */
export const FLOW_STYLE: Record<FlowKind, { pxPerMs: number; fullMs: number; strongMs: number }> = {
  wind: { pxPerMs: 7, fullMs: 10, strongMs: 25 / KT_PER_MS },
  current: { pxPerMs: 100, fullMs: 0.5, strongMs: 1.5 / KT_PER_MS },
};

/** Positions kept per particle; the trail is HISTORY − 1 segments long. */
const HISTORY = 16;
/** Seconds between history slots: trail length ≈ HISTORY × this. */
const SLOT_S = 0.05;
/** CSS px² of screen per particle. */
const AREA_PER_PARTICLE = 300;
const MIN_PARTICLES = 600;
const MAX_PARTICLES = 5000;
/** Trail quad width, CSS px; the soft edge leaves a ~1.3 px core with a glow either side. */
const LINE_PX = 2.8;
/** Particles live in a texture array this wide (rows of particles × HISTORY layers). */
const TEX_COLS = 256;
/** Mean frame interval (ms) over a window that counts as struggling. */
const SLOW_FRAME_MS = 26;

const VERT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
uniform sampler2DArray u_pos;
uniform int u_head;
uniform vec2 u_center;   // view centre, world units relative to the texture origin
uniform float u_world;   // world size, CSS px
uniform vec2 u_half;     // half the viewport, CSS px
uniform float u_width;
in vec3 a_seg;           // this end's age, the other end's age, side (−1 or +1)
out float v_alpha;
out float v_edge;
out float v_strong;

vec4 slot(int i, int age) {
  int s = (u_head - age + ${HISTORY}) % ${HISTORY};
  return texelFetch(u_pos, ivec3(i % ${TEX_COLS}, i / ${TEX_COLS}, s), 0);
}

void main() {
  int i = gl_InstanceID;
  int ageThis = int(a_seg.x);
  int ageOther = int(a_seg.y);
  vec4 me = slot(i, ageThis);
  vec4 other = slot(i, ageOther);
  vec2 p = (me.xy - u_center) * u_world;
  vec2 q = (other.xy - u_center) * u_world;
  // Direction from the newer end to the older, the same for both ends so the quad doesn't twist.
  vec2 d = ageThis < ageOther ? q - p : p - q;
  float len = length(d);
  bool ok = me.w >= 0.0 && other.w >= 0.0 && floor(me.w) == floor(other.w) && len > 1e-3 && len < 0.25 * u_half.x + 0.25 * u_half.y;
  if (!ok) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // outside the clip volume: dropped
    return;
  }
  vec2 n = vec2(-d.y, d.x) / len;
  vec2 at = p + n * a_seg.z * u_width * 0.5;
  gl_Position = vec4(at.x / u_half.x, -at.y / u_half.y, 0.0, 1.0);
  float fade = 1.0 - float(ageThis) / float(${HISTORY - 1});
  float bright = me.z >= 1.5 ? me.z - 2.0 : me.z;
  v_alpha = fract(me.w) / 0.99 * fade * fade * (0.25 + 0.6 * bright);
  v_edge = a_seg.z;
  v_strong = me.z >= 1.5 ? 1.0 : 0.0;
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform vec3 u_colour;
uniform vec3 u_red;
in float v_alpha;
in float v_edge;
in float v_strong;
out vec4 frag;
void main() {
  float a = v_alpha * (1.0 - smoothstep(0.3, 1.0, abs(v_edge)));
  vec3 c = mix(u_colour, u_red, v_strong);
  frag = vec4(c * a, a);
}`;

function cssRgb(name: string, fallback: [number, number, number]): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : fallback;
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('flow shader: ' + gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('flow program: ' + gl.getProgramInfoLog(prog));
  return prog;
}

/** Quad strip template shared by every particle: (age, other age, side) per vertex. */
function trailTemplate() {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let a = 0; a < HISTORY - 1; a++) {
    const k = a * 4;
    verts.push(a, a + 1, -1, a, a + 1, 1, a + 1, a, -1, a + 1, a, 1);
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
}

export interface FlowLayer {
  /** Show or hide one kind of particle; wind and currents can run together. */
  setVisible(kind: FlowKind, on: boolean): void;
  isVisible(kind: FlowKind): boolean;
  /** Swap a layer's field or settings (new forecast hour, coastline mask arriving). */
  setSource(kind: FlowKind, src: FlowSource): void;
  /** Particles running now per kind (after any slow-frame step-down). */
  count(kind: FlowKind): number;
}

/** One running kind of particle: its simulation and its ring of history slots on the GPU. */
interface Run {
  sim: FlowSim;
  tex: WebGLTexture;
  rows: number;
  slot: Float32Array;
  head: number;
  slotT: number;
}

/** Wind is drawn first so currents sit on top; it thins out when both show, so the sea stays readable. */
const ORDER: FlowKind[] = ['wind', 'current'];
const WIND_SHARE_WITH_CURRENTS = 0.6;

/** Mount the particle canvas over `map`. Null when WebGL2 isn't available (the map still works). */
export function mountFlow(map: MapLibreMap, sources: Record<FlowKind, FlowSource>): FlowLayer | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'flow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) {
    console.warn('flow particles: WebGL2 unavailable');
    return null;
  }
  const container = map.getContainer();
  container.insertBefore(canvas, container.querySelector('.maplibregl-control-container'));

  const prog = compile(gl, VERT, FRAG);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const loc = {
    pos: u('u_pos'), head: u('u_head'), center: u('u_center'), world: u('u_world'), half: u('u_half'),
    width: u('u_width'), colour: u('u_colour'), red: u('u_red'),
  };
  const colours: Record<FlowKind, [number, number, number]> = {
    wind: cssRgb('--amber', [1, 0.69, 0]),
    current: cssRgb('--green', [0.22, 1, 0.48]),
  };
  const red = cssRgb('--red', [1, 0.23, 0.18]);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const tpl = trailTemplate();
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, tpl.verts, gl.STATIC_DRAW);
  const aSeg = gl.getAttribLocation(prog, 'a_seg');
  gl.enableVertexAttribArray(aSeg);
  gl.vertexAttribPointer(aSeg, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tpl.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  // Positions are stored relative to the region centre so float32 stays sub-pixel at high zoom.
  const ox = mercX(REGION.center[0]);
  const oy = mercY(REGION.center[1]);

  const runs = new Map<FlowKind, Run>();
  let raf = 0;
  let last = 0;
  let budget = 1; // fraction of the full count, lowered when frames run slow
  let frames = 0;
  let frameMs = 0;
  let slowWindows = 0;

  const view = (): FlowView => {
    const c = map.getCenter();
    return { x: mercX(c.lng), y: mercY(c.lat), world: worldPx(map.getZoom()), w: container.clientWidth, h: container.clientHeight };
  };
  const wanted = (kind: FlowKind) => {
    const share = kind === 'wind' && runs.has('current') ? WIND_SHARE_WITH_CURRENTS : 1;
    const n = ((container.clientWidth * container.clientHeight) / AREA_PER_PARTICLE) * share * budget;
    return Math.round(Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, n)));
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(container.clientWidth * dpr);
    const h = Math.round(container.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  /** (Re)build a kind's simulation and texture for its wanted count; empties its trails. */
  const alloc = (kind: FlowKind) => {
    const n = wanted(kind);
    const sim = new FlowSim(n);
    sim.seed(view(), sources[kind]);
    const rows = Math.ceil(n / TEX_COLS);
    const old = runs.get(kind);
    if (old) gl.deleteTexture(old.tex);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA32F, TEX_COLS, rows, HISTORY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Every slot starts dead (alpha −1) so no trail joins to empty history.
    const dead = new Float32Array(TEX_COLS * rows * 4 * HISTORY);
    for (let k = 3; k < dead.length; k += 4) dead[k] = -1;
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, TEX_COLS, rows, HISTORY, gl.RGBA, gl.FLOAT, dead);
    runs.set(kind, { sim, tex, rows, slot: new Float32Array(TEX_COLS * rows * 4), head: 0, slotT: 0 });
  };
  /** Re-size every run whose wanted count moved by more than 20%. */
  const realloc = () => {
    for (const [kind, run] of runs) if (Math.abs(wanted(kind) - run.sim.n) / run.sim.n > 0.2) alloc(kind);
  };

  const draw = () => {
    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!runs.size) return;
    const v = view();
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(loc.pos, 0);
    gl.uniform2f(loc.center, v.x - ox, v.y - oy);
    gl.uniform1f(loc.world, v.world);
    gl.uniform2f(loc.half, v.w / 2, v.h / 2);
    gl.uniform1f(loc.width, LINE_PX);
    gl.uniform3fv(loc.red, red);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const kind of ORDER) {
      const run = runs.get(kind);
      if (!run) continue;
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, run.tex);
      gl.uniform1i(loc.head, run.head);
      gl.uniform3fv(loc.colour, colours[kind]);
      gl.drawElementsInstanced(gl.TRIANGLES, tpl.idx.length, gl.UNSIGNED_SHORT, 0, run.sim.n);
    }
    gl.bindVertexArray(null);
  };

  /** Step the count down when frames run slow for two windows in a row (never back up: no flapping). */
  const govern = (ms: number) => {
    frameMs += ms;
    if (++frames < 90) return;
    const mean = frameMs / frames;
    frames = 0;
    frameMs = 0;
    slowWindows = mean > SLOW_FRAME_MS ? slowWindows + 1 : 0;
    if (slowWindows >= 2 && budget > 0.2) {
      slowWindows = 0;
      budget *= 0.7;
      for (const kind of runs.keys()) alloc(kind);
    }
  };

  const frame = (now: number) => {
    if (!runs.size) return;
    raf = requestAnimationFrame(frame);
    const ms = last ? now - last : 16;
    last = now;
    // Long gaps (tab hidden, debugger) restart the step rather than jumping particles.
    const dt = Math.min(ms, 50) / 1000;
    if (ms < 250) govern(ms);
    const v = view();
    for (const [kind, run] of runs) {
      run.sim.step(dt, v, sources[kind]);
      run.slotT += dt;
      if (run.slotT >= SLOT_S) {
        run.slotT %= SLOT_S;
        run.head = (run.head + 1) % HISTORY; // the newest positions start a new slot; the oldest drops off
      }
      // The head slot always holds the current positions, so trails stay attached to their heads.
      run.sim.write(run.slot, ox, oy, sources[kind]);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, run.tex);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, run.head, TEX_COLS, run.rows, 1, gl.RGBA, gl.FLOAT, run.slot);
    }
    draw();
  };

  // MapLibre may move the camera after our frame ran; redraw with its camera so the particles never lag the map.
  map.on('render', () => {
    if (runs.size) draw();
  });
  map.on('resize', realloc);

  return {
    setVisible(kind, on) {
      if (on === runs.has(kind)) return;
      if (on) alloc(kind);
      else {
        gl.deleteTexture(runs.get(kind)!.tex);
        runs.delete(kind);
      }
      realloc(); // wind thins or fills back in as currents come and go
      cancelAnimationFrame(raf);
      last = 0;
      if (runs.size) raf = requestAnimationFrame(frame);
      else draw(); // clear
    },
    isVisible: (kind) => runs.has(kind),
    setSource(kind, src) {
      sources[kind] = src;
      runs.get(kind)?.sim.seed(view(), src); // positions may now be on land, or the flow changed
    },
    count: (kind) => runs.get(kind)?.sim.n ?? 0,
  };
}
