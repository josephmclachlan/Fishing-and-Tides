/** A FIELD NOTES drawing: an SVG viewBox and the markup inside it, in the reader's language. */
export interface Fig {
  vb: string;
  art: (lang: 'en' | 'es') => string;
}

/** A numbered badge, matched to the figure's list of marks. */
export const badge = (n: number, x: number, y: number) =>
  `<g class="nt-bd"><circle cx="${x}" cy="${y}" r="8.5"/><text x="${x}" y="${y + 3.7}" text-anchor="middle">${n}</text></g>`;
