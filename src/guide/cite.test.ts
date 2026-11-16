import { describe, expect, it } from 'vitest';
import { citeTab, citeText, isCitation, stripCites, type Src } from './cite';

const list = (): Src[] => [
  { t: 'FishBase: Lutjanus griseus', u: 'https://fishbase.se/x' },
  { t: 'Ley 8436, Ley de Pesca y Acuicultura', u: 'https://incopesca.go.cr/ley.pdf' },
  { t: 'Cortés 2019, Marine biodiversity of Costa Rica' },
];

describe('citations', () => {
  it('knows a source from other brackets', () => {
    expect(isCitation('FishBase')).toBe(true);
    expect(isCitation('Cortés 2019')).toBe(true);
    expect(isCitation('2019')).toBe(true);
    expect(isCitation('INBio specimen, 2001')).toBe(true);
    expect(isCitation('Center for Biological Diversity, 27 nov 2025')).toBe(true);
    expect(isCitation('Ley 8436 art. 9')).toBe(true);
    expect(isCitation('+506 2755-0302')).toBe(false);
    expect(isCitation('about 80 cm')).toBe(false);
    expect(isCitation('Salsa Brava, Puerto Viejo, Manzanillo, Punta Mona, 2000 to 2002')).toBe(false);
  });
  it('swaps source brackets for markers and adds new sources', () => {
    const l = list();
    expect(citeText('Morays and barracuda (FishBase).', l)).toBe('Morays and barracuda[^1].');
    expect(citeText('Found by Cortés (2019).', l)).toBe('Found by Cortés[^3].');
    expect(citeText('Banned in parks (Ley 8436 art. 9). Ask (+506 2755-0302).', l)).toBe('Banned in parks[^4]. Ask (+506 2755-0302).');
    expect(l[3]).toEqual({ t: 'Ley 8436 art. 9: Ley 8436, Ley de Pesca y Acuicultura', u: 'https://incopesca.go.cr/ley.pdf', x: true });
    expect(citeText('Two (FishBase; Cortés 2019).', l)).toBe('Two[^1][^3].');
    expect(stripCites('Two[^1][^3].')).toBe('Two.');
  });
  it('numbers a tab 1, 2, 3 in order of appearance and lists its sources in that order', () => {
    const html = citeTab('<p>A[^3] b[^1][^3] c[^1]</p>', list(), 'Sources');
    expect(html).toContain('A<sup class="gd-cite">1</sup> b<sup class="gd-cite">1,2</sup> c<sup class="gd-cite">2</sup>');
    expect(html.indexOf('Cortés')).toBeLessThan(html.indexOf('FishBase'));
    expect(citeTab('<p>none</p>', list(), 'Sources')).toBe('<p>none</p>');
  });
});
