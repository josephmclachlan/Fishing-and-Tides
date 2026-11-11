/**
 * Moving swell crests (PLAN 7.86, the motion pass; mockup G's swell lines, from real data). The crests of the
 * day's swell (period, direction and size from the wave forecast) bent over the real seafloor
 * (physics/crest-field.ts) and rolling toward the beach, bolder in shallow water where they steepen, red from
 * HIGH_SEA_M. Part of the WAVES layer, in place of the static crest ticks.
 *
 * Drawn with WebGL2 on its own canvas over the map, like the wind and current particles (layers/flow.ts) and for
 * the same reason: a MapLibre custom layer would redraw the whole style every frame. Each frame is one full-screen
 * pass: every pixel finds its place in the crest field (four texels, blended), how far it is from the nearest
 * crest in screen pixels (from the field's own gradient), and is lit when that is under the line's half-width.
 * The coastline (the 33 m land mask, smoothed by the GPU) cuts the crests at the beach. The crests drawn thin out
 * as the map zooms out (crestStride), so they stay about 52 px apart. Reduced motion: they hold still.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Grid } from '../physics/bathy';
import { crestStride, type CrestField } from '../physics/crest-field';
import { deepWavelength } from '../physics/waves';
import { mercX, mercY, worldPx } from '../physics/flow';
import { sizeOf } from '../layout-size';
import { HIGH_SEA_M } from './waves';

/** Seconds for a drawn crest to roll on to where the next one was. */
const ROLL_S = 2.6;
/** Crests are drawn from this zoom (the coast view). */
const MIN_ZOOM = 8;

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_center;   // view centre, mercator 0..1
uniform float u_world;   // world size, css px
uniform vec2 u_half;     // where the view centre sits on the canvas, css px (the map's padding moves it off the middle)
uniform float u_dpr;
uniform float u_h;       // canvas height, device px
uniform vec3 u_grid;     // lon0 (west), lat0 (north), step
uniform ivec2 u_size;    // cols, rows
uniform sampler2D u_field;  // U, depth, ks, valid
uniform sampler2D u_land;   // 1 land, 0 sea
uniform vec4 u_landGrid; // lon0, lat0, dlon, dlat (cell centres)
uniform vec2 u_landSize;
uniform float u_phase;
uniform float u_stride;
uniform float u_hs;
uniform float u_fade;
uniform vec3 u_col;
uniform vec3 u_red;
out vec4 o;
const float PI = 3.14159265358979;
vec4 at(ivec2 i) { return texelFetch(u_field, clamp(i, ivec2(0), u_size - 1), 0); }
void main() {
  vec2 px = vec2(gl_FragCoord.x, u_h - gl_FragCoord.y) / u_dpr;
  vec2 m = u_center + (px - u_half) / u_world;
  float lng = m.x * 360.0 - 180.0;
  float lat = degrees(atan(sinh(PI * (1.0 - 2.0 * m.y))));
  vec2 g = vec2((lng - u_grid.x) / u_grid.z, (u_grid.y - lat) / u_grid.z);
  if (g.x < 0.0 || g.y < 0.0 || g.x > float(u_size.x - 1) || g.y > float(u_size.y - 1)) discard;
  ivec2 i0 = ivec2(floor(g));
  vec2 f = fract(g);
  vec4 a = at(i0), b = at(i0 + ivec2(1, 0)), c = at(i0 + ivec2(0, 1)), d = at(i0 + ivec2(1, 1));
  if (a.a * b.a * c.a * d.a < 0.5) discard;
  vec4 v = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  float land = texture(u_land, vec2((lng - u_landGrid.x) / u_landGrid.z + 0.5, (u_landGrid.y - lat) / u_landGrid.w + 0.5) / u_landSize).r;
  float sea = 1.0 - smoothstep(0.25, 0.6, land);
  if (sea <= 0.0) discard;
  float s = v.r / u_stride;
  float w = fwidth(s);
  float x = s - u_phase;
  float dist = abs(x - floor(x + 0.5)) / max(w, 1e-6); // device px to the nearest drawn crest
  float shallow = 1.0 - smoothstep(5.0, 9.0, v.g);
  float mid = 1.0 - smoothstep(25.0, 35.0, v.g);
  float lw = (1.3 + 0.6 * mid + 0.8 * shallow) * u_dpr;
  float line = 1.0 - smoothstep(lw * 0.5 - 0.6, lw * 0.5 + 0.6, dist);
  float hgt = u_hs * v.b;
  float k = clamp(hgt / 1.4, 0.55, 1.15);
  float wet = smoothstep(0.1, 0.45, v.g);
  float alpha = line * min(1.0, (0.6 + 0.25 * mid + 0.15 * shallow) * k + 0.1) * sea * wet * u_fade;
  vec3 col = hgt >= ${HIGH_SEA_M.toFixed(2)} ? u_red : u_col;
  o = vec4(col * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext): WebGLProgram {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('swell shader: ' + gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('swell program: ' + gl.getProgramInfoLog(prog));
  return prog;
}

function cssRgb(name: string, fallback: [number, number, number]): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : fallback;
}

/**
 * The field as texels (U, depth, ks, valid), with land cells next to the sea filled from their sea neighbours
 * (two rings, depth 0), so the blend reaches the beach and the crest fades out over the last half cell.
 * Pure (exported for tests).
 */
export function fieldTexels(f: CrestField): Float32Array {
  const { cols, rows } = f;
  const out = new Float32Array(cols * rows * 4);
  for (let k = 0; k < cols * rows; k++) {
    const ok = Number.isFinite(f.u[k]);
    out.set(ok ? [f.u[k], f.depth[k], f.ks[k], 1] : [0, 0, 0, 0], k * 4);
  }
  for (let ring = 0; ring < 2; ring++) {
    const prev = out.slice();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        if (prev[k * 4 + 3]) continue;
        let n = 0, u = 0, ks = 0;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const cc = c + dc, rr = r + dr;
          if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
          const j = rr * cols + cc;
          if (!prev[j * 4 + 3]) continue;
          n++;
          u += prev[j * 4];
          ks += prev[j * 4 + 2];
        }
        // Depth 0 marks a filled cell: the crest fades out across it, so none runs up a river mouth or lagoon.
        if (n) out.set([u / n, 0, ks / n, 1], k * 4);
      }
  }
  return out;
}

export interface SwellMotion {
  /** The crest field for the slider's swell (null: none to draw). */
  setField(f: CrestField | null): void;
  /** The swell's height offshore, m (crests bolder and, from HIGH_SEA_M, red as it builds). */
  setHeight(hs: number): void;
  setLand(land: Grid): void;
  setVisible(on: boolean): void;
}

export function mountSwellMotion(map: MapLibreMap): SwellMotion | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'flow-canvas motion-swell';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const container = map.getContainer();
  container.querySelector('.maplibregl-canvas-container')?.after(canvas);
  let prog: WebGLProgram;
  try {
    prog = compile(gl);
  } catch (err) {
    console.warn(err);
    canvas.remove();
    return null;
  }
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const loc = {
    center: u('u_center'), world: u('u_world'), half: u('u_half'), dpr: u('u_dpr'), h: u('u_h'), grid: u('u_grid'), size: u('u_size'),
    field: u('u_field'), land: u('u_land'), landGrid: u('u_landGrid'), landSize: u('u_landSize'), phase: u('u_phase'), stride: u('u_stride'),
    hs: u('u_hs'), fade: u('u_fade'), col: u('u_col'), red: u('u_red'),
  };
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const fieldTex = gl.createTexture()!;
  const landTex = gl.createTexture()!;
  // No land mask yet: one sea texel, so the crests still draw (cut by the field's own coast).
  gl.bindTexture(gl.TEXTURE_2D, landTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));
  let landGrid: [number, number, number, number] = [0, 0, 1, 1];
  let landSize: [number, number] = [1, 1];

  let field: CrestField | null = null;
  let hs = 1;
  let visible = false;
  const colours = { col: [0.04, 0.4, 0.88] as [number, number, number], red: [1, 0.23, 0.18] as [number, number, number] };
  const readColours = () => {
    colours.col = cssRgb('--t-surf', cssRgb('--amber', [0.04, 0.4, 0.88]));
    colours.red = cssRgb('--paint-red', cssRgb('--red', [1, 0.23, 0.18]));
  };
  readColours();
  new MutationObserver(() => (readColours(), draw())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-theme'] });
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const covered = () => document.body.classList.contains('fc-open');

  let raf = 0;
  let t0 = performance.now();
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = sizeOf(container);
    const w = Math.round(s.w * dpr), h = Math.round(s.h * dpr);
    if (canvas.width !== w || canvas.height !== h) (canvas.width = w), (canvas.height = h);
    return { dpr, s };
  };
  const draw = (now = performance.now()) => {
    const { dpr } = resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const z = map.getZoom();
    if (!visible || !field || z < MIN_ZOOM - 0.5) return;
    const c = map.getCenter();
    const world = worldPx(z);
    const mPerPx = (40075016.686 * Math.cos((c.lat * Math.PI) / 180)) / world;
    const stride = crestStride(deepWavelength(field.periodS), mPerPx);
    const phase = reduced?.matches ? 0.3 : (((now - t0) / 1000 / ROLL_S) % 1 + 1) % 1;
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform2f(loc.center, mercX(c.lng), mercY(c.lat));
    gl.uniform1f(loc.world, world);
    const pc = map.project(c);
    gl.uniform2f(loc.half, pc.x, pc.y);
    gl.uniform1f(loc.dpr, dpr);
    gl.uniform1f(loc.h, canvas.height);
    gl.uniform3f(loc.grid, field.lon0, field.lat0, field.step);
    gl.uniform2i(loc.size, field.cols, field.rows);
    gl.uniform4f(loc.landGrid, ...landGrid);
    gl.uniform2f(loc.landSize, ...landSize);
    gl.uniform1f(loc.phase, phase);
    gl.uniform1f(loc.stride, stride);
    gl.uniform1f(loc.hs, hs);
    gl.uniform1f(loc.fade, Math.min(1, Math.max(0, z - (MIN_ZOOM - 0.5)) * 2));
    gl.uniform3fv(loc.col, colours.col);
    gl.uniform3fv(loc.red, colours.red);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.uniform1i(loc.field, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.uniform1i(loc.land, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };
  const running = () => visible && !!field && !covered() && !reduced?.matches && map.getZoom() >= MIN_ZOOM - 0.5;
  const frame = (now: number) => {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(frame);
    draw(now);
  };
  const kick = () => {
    if (running() && !raf) raf = requestAnimationFrame(frame);
    else if (!running()) draw();
  };
  new MutationObserver(kick).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reduced?.addEventListener?.('change', kick);
  // Redraw with MapLibre's camera so the crests never lag a pan.
  map.on('render', () => visible && draw());
  map.on('zoomend', kick);

  return {
    setField(f) {
      field = f;
      if (f) {
        gl.bindTexture(gl.TEXTURE_2D, fieldTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, f.cols, f.rows, 0, gl.RGBA, gl.FLOAT, fieldTexels(f));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
      t0 = performance.now();
      kick();
    },
    setHeight(h) {
      hs = Number.isFinite(h) ? h : 1;
      if (!raf) draw();
    },
    setLand(land) {
      const bytes = new Uint8Array(land.cols * land.rows);
      for (let k = 0; k < bytes.length; k++) bytes[k] = land.z[k] === 1 ? 255 : 0;
      gl.bindTexture(gl.TEXTURE_2D, landTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, land.cols, land.rows, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      landGrid = [land.lon0, land.lat0, land.dlon, land.dlat];
      landSize = [land.cols, land.rows];
      if (!raf) draw();
    },
    setVisible(on) {
      visible = on;
      kick();
    },
  };
}
