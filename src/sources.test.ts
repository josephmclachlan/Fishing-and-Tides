import { describe, expect, it } from 'vitest';
import { citeHelp, citer, SOURCES } from './sources';
import { KM_LAYERS } from './kmap/model';
import { helpEn } from './i18n/help-en';
import { helpEs } from './i18n/help-es';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

describe('sources', () => {
  it('numbers citations in reading order, once each, with the list in the same order', () => {
    const c = citer('en');
    const html = c.finish(`<p>A${c.mark('ww3')} B${c.mark('gebco')} C${c.mark('ww3')}</p>`, 'SOURCES');
    expect(html).toContain('<sup class="gd-cite">1</sup>');
    expect(html).toContain('<sup class="gd-cite">2</sup>');
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html.indexOf('WAVEWATCH')).toBeLessThan(html.indexOf('GEBCO'));
  });
  it('turns [^id] in a help text into superscripts with a list, and never names the source in the text', () => {
    const h = citeHelp('Sea warmth[^sst] and clarity[^kd490].\n\nSecond[^sst].', esc, 'SOURCES', 'en');
    expect(h.match(/<p class="help-text">/g)).toHaveLength(2);
    expect(h).toContain('<sup class="gd-cite">1</sup>');
    expect(h).toContain('<sup class="gd-cite">2</sup>');
    expect(h.match(/<li>/g)).toHaveLength(2);
  });
  it('every marker in the help texts names a known source, in both languages', () => {
    for (const d of [helpEn, helpEs] as Record<string, string>[]) {
      for (const [k, v] of Object.entries(d)) {
        for (const m of v.matchAll(/\[\^([a-z0-9]+)\]/g)) expect(SOURCES, `${k}: ${m[1]}`).toHaveProperty(m[1]);
      }
    }
  });
  it('help texts do not name data sets by their code names', () => {
    for (const d of [helpEn, helpEs] as Record<string, string>[]) {
      for (const [k, v] of Object.entries(d)) expect(v, k).not.toMatch(/\b(KD490|Kd490|SMOC|WW3|GOES-19|CAMS|NOAA|ECMWF|VIIRS|GEBCO)\b/);
    }
  });
  it('every layer has plain words in both languages and cites only known sources', () => {
    for (const l of KM_LAYERS) {
      expect(l.src.en && l.src.es, l.id).toBeTruthy();
      for (const s of l.cite) expect(SOURCES, l.id).toHaveProperty(s);
    }
  });
});
