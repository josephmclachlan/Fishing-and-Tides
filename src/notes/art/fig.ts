/** A FIELD NOTES drawing: an SVG viewBox and the markup inside it, in the reader's language. */
export interface Fig {
  vb: string;
  art: (lang: 'en' | 'es') => string;
}

/** A numbered badge, matched to the figure's list of marks: a hard square block (the square look, PLAN 13.7). */
export const badge = (n: number, x: number, y: number) =>
  `<g class="nt-bd"><rect x="${x - 8.5}" y="${y - 8.5}" width="17" height="17"/><text x="${x}" y="${y + 3.7}" text-anchor="middle">${n}</text></g>`;

/**
 * A wave seen side-on as it breaks: the back rises to the crest, the lip throws forward and down, and the face curls
 * under it. The crest sits at (cx, base - h), the wave stands on `base`, `dir` 1 breaks to the right. `k` squeezes it
 * sideways. The face lands 0.55 h k in front of the crest; the back starts 1 h k behind it.
 */
export const breakingWave = (cx: number, base: number, h: number, cls: string, dir = 1, k = 0.6) => {
  const p = (u: number, v: number) => `${+(cx + dir * u * h * k).toFixed(1)} ${+(base - v * h).toFixed(1)}`;
  return (
    `<path class="${cls}" d="M${p(-1, 0)} C${p(-0.5, 0)} ${p(-0.3, 1)} ${p(0, 1)} C${p(0.35, 1)} ${p(0.62, 0.78)} ${p(0.6, 0.5)} ` +
    `C${p(0.58, 0.62)} ${p(0.42, 0.72)} ${p(0.32, 0.6)} C${p(0.22, 0.45)} ${p(0.3, 0.12)} ${p(0.55, 0)} Z"/>`
  );
};
