/**
 * Writes the SurCast app icons and favicon from the mark in src/brand.ts (run: `node scripts/brand-icons.ts`).
 *
 * public/icon.svg            any-purpose app icon: navy rounded square, full mark
 * public/icon-maskable.svg   Android maskable: full-bleed navy, mark shrunk into the 80% safe circle
 * public/favicon.svg         browser tab: the three-run small mark, which still reads at 16 px
 * public/*.png               PNG copies for iOS (apple-touch-icon, which ignores SVG) and older Android; drawn with
 *                            Playwright's Chromium when it is installed, otherwise skipped with a note.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { BRAND_NAVY, markInner, RUN_HEX } from '../src/brand.ts';

const pal = RUN_HEX.dark;
const colour = (run: keyof typeof pal) => pal[run];
const INK = '#EDF3FA';
const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${inner}</svg>\n`;

const full = markInner({ colour, ink: INK });
const small = markInner({ colour, ink: INK, small: true });
// The mark's drawn box is about x 6..60, y 6..56; centre it, then scale about the icon's centre.
const centred = (inner: string, k: number) => `<g transform="translate(32 32) scale(${k}) translate(-33 -31)">${inner}</g>`;

const files: Record<string, string> = {
  'public/icon.svg': wrap(`<rect width="64" height="64" rx="14" fill="${BRAND_NAVY}"/>${centred(full, 0.92)}`),
  'public/icon-maskable.svg': wrap(`<rect width="64" height="64" fill="${BRAND_NAVY}"/>${centred(full, 0.68)}`),
  'public/favicon.svg': wrap(`<rect width="64" height="64" rx="14" fill="${BRAND_NAVY}"/>${centred(small, 0.98)}`),
};
for (const [path, svg] of Object.entries(files)) writeFileSync(path, svg);

const pngs: [string, string, number][] = [
  ['public/apple-touch-icon.png', `<rect width="64" height="64" fill="${BRAND_NAVY}"/>${centred(full, 0.8)}`, 180],
  ['public/icon-192.png', files['public/icon.svg'], 192],
  ['public/icon-512.png', files['public/icon.svg'], 512],
  ['public/icon-maskable-512.png', files['public/icon-maskable.svg'], 512],
];
let chromium: { launch(): Promise<any> } | undefined;
try {
  chromium = createRequire(import.meta.url)('playwright').chromium;
} catch {
  console.log('Playwright not installed: SVG icons written, PNG icons left as they were.');
}
if (chromium) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [path, svg, size] of pngs) {
    const body = svg.startsWith('<svg') ? svg : wrap(svg);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${body}`);
    await page.screenshot({ path, omitBackground: true });
  }
  await browser.close();
}
console.log('Wrote', [...Object.keys(files), ...(chromium ? pngs.map((p) => p[0]) : [])].join(', '));
