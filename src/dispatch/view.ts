/**
 * DISPATCH page markup, as strings (pure, so it is tested without a DOM). The freshness chart is plain HTML and CSS:
 * one bar per way of handling a fish, split into grades by the model (model.ts), with a line that page.ts moves.
 */
import { t } from '../i18n';
import {
  CHART_H as CHART_TITLE, CHART_NOTE, CHART_P, GRADE_HELP, GRADE_KEY, GRADES, ICE_LIMIT_KEY, HIST_CLOCK, HIST_GROUPS, HIST_H, HIST_P, HIST_VS, HIST_VS_H, HIST_VS_HEAD, HIST_VS_LINK,
  HIST_SPECIES, ICE_LIMIT, METHODS, METHODS_H, METHODS_P, MISTAKES, MISTAKES_H, MISTAKES_P, ROUTINE, ROUTINE_H, ROWS, SCIENCE_H, SCIENCE_P,
  SECTION_LABELS, EST_MARK, SOURCES, SOURCES_H, SOURCES_P, STATS, STEPS, tr, type Fact, type Lang, type MethodId, type Txt,
} from './content';
import { gradeOf, hoursTo, K_BANDS, kAt, posOf, segments, type Grade, type Method } from './model';
import { DP_SECTIONS } from './route';
import { methodArt } from './art';

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

/** The level class of each grade (the page's own colours: dark teal, mint, amber, red). */
export const GRADE_LEVEL: Record<Grade, string> = { raw: 'l4', good: 'l3', ok: 'l2', off: 'l0' };
export const GRADE_ORDER: Grade[] = ['raw', 'good', 'ok', 'off'];

/** "20 min", "6 h", "2 d". */
export function hoursLabel(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`.replace('.0 ', ' ');
  return `${Math.round((h / 24) * 10) / 10} d`.replace('.0 ', ' ');
}

/** A fact with its source marks: [n] for each source, EST for the page's own estimate. */
/** Source numbers shown on the page follow first appearance (1 before 2); reset at the start of each render. */
let cited: number[] = [];
export const resetCitations = (): void => { cited = []; };
const shown = (n: number): number => {
  let i = cited.indexOf(n);
  if (i < 0) i = cited.push(n) - 1;
  return i + 1;
};

export function factHtml(f: Fact, lang: Lang): string {
  const nums = f.src?.length ? f.src.map((n) => ({ n, d: shown(n) })).sort((a, b) => a.d - b.d) : [];
  const src = nums.length
    ? `<sup class="dp-src">${nums.map(({ n, d }) => `<span title="${esc(SOURCES[n - 1]?.n ?? '')}">${d}</span>`).join(' ')}</sup>`
    : '';
  const est = f.est ? ` <span class="dp-est" title="${esc(t('dp.estTitle'))}">${esc(tr(EST_MARK, lang))}</span>` : '';
  return `${esc(tr(f.t, lang))}${src}${est}`;
}

const sectionHead = (_id: string, kicker: string, title: string, p?: string) =>
  `<header class="dp-h"><p class="fc-mono dp-k">${esc(kicker)}</p><h2>${esc(title)}</h2>${p ? `<p class="dp-lede">${esc(p)}</p>` : ''}</header>`;

export function navHtml(lang: Lang): string {
  return DP_SECTIONS.map((s) => `<button type="button" class="dp-navb" data-s="${s}">${esc(tr(SECTION_LABELS[s], lang))}</button>`).join('');
}

export function statsHtml(lang: Lang): string {
  return `<ul class="dp-stats">${STATS.map((s) => `<li><b class="dp-big">${esc(s.n)}</b><span class="fc-mono">${esc(tr(s.unit, lang))}</span><p>${factHtml({ t: s.what, src: s.src }, lang)}</p></li>`).join('')}</ul>`;
}

const TICKS = [1, 6, 12, 24, 48, 72];

export function chartHtml(lang: Lang, startHours: number): string {
  const legend = GRADE_ORDER.map((g) => `<li class="${GRADE_LEVEL[g]}"><i></i><div><b>${esc(tr(GRADES[g], lang))}</b><span>${esc(tr(GRADE_KEY[g], lang))}</span></div></li>`).join('') + `<li class="dp-lg-ice-li"><i class="dp-lg-ice"></i><div><b>${esc(tr(ICE_LIMIT, lang))}</b><span>${esc(tr(ICE_LIMIT_KEY, lang))}</span></div></li>`;
  const rows = ROWS.map((r) => {
    const segs = segments(r.id as Method)
      .map((s) => {
        const a = posOf(s.from), b = posOf(s.to);
        return `<i class="dp-seg ${GRADE_LEVEL[s.grade]}" data-g="${s.grade}" style="left:${pct(a)};width:${pct(b - a)}">${b - a > 0.2 ? `<span>${esc(tr(GRADES[s.grade], lang))}</span>` : ''}</i>`;
      })
      .join('');
    return `<div class="dp-row${r.good ? ' dp-good' : ''}" data-m="${r.id}">
      <div class="dp-rh"><div><b>${esc(tr(r.name, lang))}</b><span>${esc(tr(r.sub, lang))}</span></div><em class="dp-pill"></em></div>
      <div class="dp-bar">${segs}<i class="dp-ice" style="left:${pct(posOf(6))}"></i><i class="dp-cur"></i></div>
    </div>`;
  }).join('');
  const ticks = TICKS.map((h) => `<span style="left:${pct(posOf(h))}">${h >= 24 ? `${h / 24} d` : `${h} h`}</span>`).join('');
  const presets = [1, 6, 12, 24, 72].map((h) => `<button type="button" class="dp-chip" data-h="${h}">${hoursLabel(h)}</button>`).join('');
  return `<section class="dp-sec dp-chart-sec" id="dp-chart" data-s="chart">
    ${sectionHead('chart', tr(SECTION_LABELS.chart, lang), tr(CHART_TITLE, lang), tr(CHART_P, lang))}
    <ul class="dp-legend">${legend}</ul>
    <p class="dp-read" id="dp-read" aria-live="polite"></p>
    <div class="dp-scrub">
      <label for="dp-t" class="fc-mono">${esc(t('dp.time'))}: <b id="dp-t-v">${hoursLabel(startHours)}</b></label>
      <input id="dp-t" type="range" min="0" max="1000" step="1" value="${Math.round(posOf(startHours) * 1000)}">
      <div class="dp-chips" role="group" aria-label="${esc(t('dp.preset'))}">${presets}</div>
    </div>
    <div class="dp-chart" id="dp-chartbox" style="--x:${posOf(startHours)}">
      <div class="dp-axis" aria-hidden="true">${ticks}</div>
      ${rows}
    </div>
    <p class="dp-help">${esc(tr(GRADE_HELP, lang))}</p>
    <p class="dp-help dp-ike">${esc(ikejimeLine(lang))}</p>
    <p class="dp-fine">${esc(tr(CHART_NOTE, lang))}</p>
  </section>`;
}

/** What the 72 h chart cannot show: when an ikejime fish on ice leaves each grade, in whole days from the model. */
export function ikejimeLine(lang: Lang): string {
  const d = (k: number) => Math.round(hoursTo('ikejime', k) / 24);
  const [a, b, c] = [d(K_BANDS.raw), d(K_BANDS.good), d(K_BANDS.ok)];
  return lang === 'es'
    ? `Ikejime en hielo (0 °C, 32 °F), estimado: ceviche fresco hasta el día ${a}, cocinar antes del día ${b}, dañado hacia el día ${c}.`
    : `Ikejime on ice (0 °C, 32 °F), estimated: ceviche-fresh to day ${a}, cook by day ${b}, spoiled by day ${c}.`;
}

/** The grade a method is in at `h` hours, for the readout and the pills. */
export const gradeAt = (m: Method, h: number): Grade => gradeOf(kAt(m, h));

/** The sentence under the legend: the best and worst methods at the hour chosen. */
export function readoutText(h: number, lang: Lang): string {
  const best = tr(GRADES[gradeAt('ikejime', h)], lang).toLowerCase();
  const worst = tr(GRADES[gradeAt('suffocate', h)], lang).toLowerCase();
  return t('dp.checked', { h: hoursLabel(h), best, worst });
}

/** One method's drawing with its numbered marks. */
export function figureHtml(m: { id: MethodId; name: Txt; marks: Txt[] }, lang: Lang): string {
  const label = tr(m.name, lang);
  const marks = m.marks.map((x, i) => `<li><b>${i + 1}</b>${esc(tr(x, lang))}</li>`).join('');
  return `<figure class="dp-diagram"><svg class="dp-art" viewBox="0 0 220 96" role="img" aria-label="${esc(label)}">${methodArt(m.id)}</svg><figcaption><ol class="dp-marks">${marks}</ol></figcaption></figure>`;
}

export function methodsHtml(lang: Lang): string {
  const cards = METHODS.map(
    (m, i) => `<article class="dp-card" id="dp-m-${m.id}">
      <p class="fc-mono dp-k">${i + 1} · ${esc(tr(m.tag, lang))}</p>
      <h3>${esc(tr(m.name, lang))}</h3>
      ${figureHtml(m, lang)}
      <ol class="dp-steps">${m.steps.map((s) => `<li>${esc(tr(s, lang))}</li>`).join('')}</ol>
      ${m.note ? `<p class="dp-note">${factHtml(m.note, lang)}</p>` : ''}
      ${m.alt ? `<p class="dp-alt">${factHtml(m.alt, lang)}</p>` : ''}
    </article>`,
  ).join('');
  return `<section class="dp-sec" id="dp-methods" data-s="methods">${sectionHead('methods', tr(SECTION_LABELS.methods, lang), tr(METHODS_H, lang), tr(METHODS_P, lang))}<div class="dp-cards">${cards}</div></section>`;
}

export function mistakesHtml(lang: Lang): string {
  const cards = MISTAKES.map(
    (m, i) => `<article class="dp-card dp-bad">
      <p class="fc-mono dp-k">${String(i + 1).padStart(2, '0')}</p>
      <h3>${esc(tr(m.name, lang))}</h3>
      <ul class="dp-facts">${m.what.map((f) => `<li>${factHtml(f, lang)}</li>`).join('')}</ul>
      <p class="dp-fix"><b class="fc-mono">${lang === 'es' ? 'En vez' : 'Instead'}</b> ${esc(tr(m.fix, lang))}</p>
    </article>`,
  ).join('');
  return `<section class="dp-sec" id="dp-mistakes" data-s="mistakes">${sectionHead('mistakes', tr(SECTION_LABELS.mistakes, lang), tr(MISTAKES_H, lang), tr(MISTAKES_P, lang))}<div class="dp-cards">${cards}</div></section>`;
}

export function scienceHtml(lang: Lang): string {
  const steps = STEPS.map(
    (s) => `<li class="dp-step"><h3>${esc(tr(s.name, lang))}</h3>${s.body.map((f) => `<p>${factHtml(f, lang)}</p>`).join('')}</li>`,
  ).join('');
  return `<section class="dp-sec" id="dp-science" data-s="science">${sectionHead('science', tr(SECTION_LABELS.science, lang), tr(SCIENCE_H, lang), tr(SCIENCE_P, lang))}<ol class="dp-steplist">${steps}</ol></section>`;
}

export function histamineHtml(lang: Lang): string {
  const max = Math.max(...HIST_CLOCK.map((c) => c.h));
  const clock = HIST_CLOCK.map(
    (c, i) => `<li class="dp-ck l${i === 0 ? 0 : i === 1 ? 1 : 2}"><span class="dp-ckbar" style="width:${pct(c.h / max)}"><b>${c.h} h</b></span><p>${factHtml({ t: c.label, src: c.src }, lang)}</p></li>`,
  ).join('');
  const group = (g: (typeof HIST_GROUPS)[number]) =>
    `<div class="dp-hg" id="dp-hg-${g.id}"><h3>${esc(tr(g.h, lang))}</h3><ul class="dp-facts">${g.facts.map((f) => `<li>${factHtml(f, lang)}</li>`).join('')}</ul></div>`;
  const vsRows = HIST_VS.map((r) => `<tr><th scope="row">${esc(tr(r[0], lang))}</th><td>${esc(tr(r[1], lang))}</td><td>${esc(tr(r[2], lang))}</td></tr>`).join('');
  const vs = `<div class="dp-hg" id="dp-hg-vs"><h3>${esc(tr(HIST_VS_H, lang))}</h3>
    <div class="dp-vs-w"><table class="dp-vs"><thead><tr><th></th><th scope="col">${esc(tr(HIST_VS_HEAD[1], lang))}</th><th scope="col">${esc(tr(HIST_VS_HEAD[2], lang))}</th></tr></thead><tbody>${vsRows}</tbody></table></div>
    <p><a class="dp-link" href="#ciguatera">${esc(tr(HIST_VS_LINK, lang))} →</a></p></div>`;
  const [first, ...rest] = HIST_GROUPS;
  return `<section class="dp-sec" id="dp-histamine" data-s="histamine">${sectionHead('histamine', tr(SECTION_LABELS.histamine, lang), tr(HIST_H, lang), tr(HIST_P, lang))}
    <p class="dp-species">${esc(tr(HIST_SPECIES, lang))}</p>
    ${group(first)}
    <div class="dp-hg"><h3>${esc(lang === 'es' ? 'El reloj: cuándo debe estar en hielo' : 'The clock: when it must be on ice')}</h3><ul class="dp-clock">${clock}</ul></div>
    ${rest.map(group).join('')}
    ${vs}</section>`;
}

export function routineHtml(lang: Lang): string {
  return `<section class="dp-sec" id="dp-routine" data-s="routine">${sectionHead('routine', tr(SECTION_LABELS.routine, lang), tr(ROUTINE_H, lang))}
    <ol class="dp-routine">${ROUTINE.map((r) => `<li><b class="dp-big">${r.n}</b><h3>${esc(tr(r.head, lang))}</h3><p>${esc(tr(r.body, lang))}</p></li>`).join('')}</ol></section>`;
}

export function sourcesHtml(lang: Lang): string {
  return `<section class="dp-sec" id="dp-sources" data-s="sources">${sectionHead('sources', tr(SECTION_LABELS.sources, lang), tr(SOURCES_H, lang), tr(SOURCES_P, lang))}
    <ol class="dp-srcs">${[...cited, ...SOURCES.map((_, i) => i + 1).filter((n) => !cited.includes(n))].map((n) => SOURCES[n - 1]).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.n)}</a></li>`).join('')}</ol></section>`;
}
