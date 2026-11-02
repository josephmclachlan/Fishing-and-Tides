/**
 * Linear (Airy) wave theory: dispersion and shoaling (PLAN 3.2). Pure, no DOM, SI units:
 * metres, seconds, radians. Depth h is positive down; h = Infinity means deep water.
 *
 *   Dispersion       ω² = g k tanh(k h),  ω = 2π / T
 *   Phase speed      c  = ω / k
 *   Group speed      Cg = n c,  n = ½ (1 + 2kh / sinh 2kh)      (n → ½ deep, → 1 shallow)
 *   Shoaling         Ks = √(Cg0 / Cg),  Cg0 = g T / 4π           (energy flux E·Cg conserved)
 *   Bottom orbital   ub = π H / (T sinh k h)                      (DESIGN.md §6, dive surge)
 *
 * References: Dean & Dalrymple (1991), Water Wave Mechanics for Engineers and Scientists,
 * ch. 3–4; US Army Corps of Engineers Coastal Engineering Manual (2002), II-1.
 */

/** Standard gravity, m/s². */
export const G = 9.80665;
/** Seawater density for the Caribbean (~28 °C, 36 PSU), kg/m³. */
export const RHO_SEA = 1023;

const TWO_PI = 2 * Math.PI;

/** Deep-water wavelength L0 = g T² / 2π (m). */
export const deepWavelength = (T: number) => (G * T * T) / TWO_PI;

/**
 * Wavenumber k (rad/m) for period T (s) at depth h (m): solves ω² = g k tanh(kh).
 * Starts from Fenton & McKee's (1990) explicit approximation (error < 1.5 %) and polishes
 * with Newton's method to machine precision (2–3 iterations).
 */
export function wavenumber(T: number, h: number): number {
  const w = TWO_PI / T;
  const k0 = (w * w) / G;
  if (!(h > 0)) return NaN;
  if (!Number.isFinite(h) || k0 * h > 20) return k0;
  // Fenton & McKee: k ≈ k0 / tanh((k0 h)^(3/4))^(2/3)
  let k = k0 / Math.tanh((k0 * h) ** 0.75) ** (2 / 3);
  for (let i = 0; i < 20; i++) {
    const th = Math.tanh(k * h);
    const f = G * k * th - w * w;
    const df = G * th + G * k * h * (1 - th * th);
    const dk = f / df;
    k -= dk;
    if (Math.abs(dk) < 1e-14 * k) break;
  }
  return k;
}

export interface WaveKinematics {
  /** Wavenumber, rad/m. */
  k: number;
  /** Wavelength, m. */
  L: number;
  /** Phase speed, m/s. */
  c: number;
  /** Group speed (energy travels at this), m/s. */
  cg: number;
  /** Cg / c. */
  n: number;
  /** k·h, the relative depth: > π deep, < π/10 shallow. */
  kh: number;
}

/** Wavenumber, wavelength, phase and group speed for period T at depth h. */
export function kinematics(T: number, h: number): WaveKinematics {
  const k = wavenumber(T, h);
  const w = TWO_PI / T;
  const c = w / k;
  const kh = k * h;
  // 2kh / sinh(2kh) → 0 in deep water; guard the overflow.
  const n = kh > 20 || !Number.isFinite(kh) ? 0.5 : 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh));
  return { k, L: TWO_PI / k, c, cg: n * c, n, kh };
}

/** Shoaling coefficient Ks = √(Cg0 / Cg): 1 in deep water, dips to ~0.91 at kh ≈ 1.2, then rises. */
export function shoalingCoefficient(T: number, h: number): number {
  const cg0 = (G * T) / (2 * TWO_PI);
  return Math.sqrt(cg0 / kinematics(T, h).cg);
}

/**
 * Height at depth h of a wave with deep-water height H0 and period T, by linear shoaling
 * alone (no refraction or breaking: those are 3.3 and 3.4). Linear theory overpredicts
 * close to breaking; 3.4 caps it.
 */
export function shoal(H0: number, T: number, h: number): number {
  return H0 * shoalingCoefficient(T, h);
}

/** Peak horizontal orbital velocity at the bed, ub = πH / (T sinh kh), m/s. */
export function bottomOrbitalVelocity(H: number, T: number, h: number): number {
  const kh = wavenumber(T, h) * h;
  if (kh > 20) return 0;
  return (Math.PI * H) / (T * Math.sinh(kh));
}

/**
 * Bed orbital velocity for a sea state (Hs, Tp): uses Hs/√2 ≈ Hrms, the usual choice for a
 * representative near-bed velocity (Soulsby 1997, §3.3, monochromatic approximation).
 */
export function bottomOrbitalVelocitySea(Hs: number, Tp: number, h: number): number {
  return bottomOrbitalVelocity(Hs / Math.SQRT2, Tp, h);
}
