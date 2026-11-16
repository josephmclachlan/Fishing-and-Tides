/**
 * DISPATCH page markup, as strings (pure, so it is tested without a DOM). The freshness chart is plain HTML and CSS:
 * one bar per way of handling a fish, split into grades by the model (model.ts), with a line that page.ts moves.
 */
import { t } from '../i18n';
import {
  CHART_H as CHART_TITLE, CHART_NOTE, CHART_P, DIAGRAM, GRADE_HELP, GRADE_KEY, GRADES, ICE_LIMIT_KEY, HIST_CLOCK, HIST_FACTS, HIST_H, HIST_P,
  HIST_SPECIES, ICE_LIMIT, METHODS, METHODS_H, METHODS_P, MISTAKES, MISTAKES_H, MISTAKES_P, ROUTINE, ROUTINE_H, ROWS, SCIENCE_H, SCIENCE_P,
  SECTION_LABELS, SOURCES, SOURCES_H, SOURCES_P, STATS, STEPS, tr, type Fact, type Lang,
} from './content';
import { gradeOf, kAt, posOf, segments, type Grade, type Method } from './model';
import { DP_SECTIONS } from './route';

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
export function factHtml(f: Fact, lang: Lang): string {
  const marks = f.src?.length
    ? f.src.map((n) => `<sup class="dp-src" title="${esc(SOURCES[n - 1]?.n ?? '')}">${n}</sup>`).join('')
    : `<sup class="dp-est" title="${esc(t('dp.estTitle'))}">${t('dp.est')}</sup>`;
  return `${esc(tr(f.t, lang))}${marks}`;
}

const sectionHead = (_id: string, kicker: string, title: string, p?: string) =>
  `<header class="dp-h"><p class="fc-mono dp-k">${esc(kicker)}</p><h2>${esc(title)}</h2>${p ? `<p class="dp-lede">${esc(p)}</p>` : ''}</header>`;

export function navHtml(lang: Lang): string {
  return DP_SECTIONS.map((s) => `<button type="button" class="dp-navb" data-s="${s}">${esc(tr(SECTION_LABELS[s], lang))}</button>`).join('');
}

export function statsHtml(lang: Lang): string {
  return `<ul class="dp-stats">${STATS.map((s) => `<li><b class="dp-big">${esc(s.n)}</b><span class="fc-mono">${esc(tr(s.unit, lang))}</span><p>${factHtml({ t: s.what, src: s.src }, lang)}</p></li>`).join('')}</ul>`;
}

const TICKS = [1, 3, 6, 12, 24, 48, 72];

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
    <div class="dp-chart" id="dp-chartbox" style="--x:${posOf(startHours)}">
      ${rows}
      <div class="dp-axis" aria-hidden="true">${ticks}</div>
    </div>
    <div class="dp-scrub">
      <label for="dp-t" class="fc-mono">${esc(t('dp.time'))}: <b id="dp-t-v">${hoursLabel(startHours)}</b></label>
      <input id="dp-t" type="range" min="0" max="1000" step="1" value="${Math.round(posOf(startHours) * 1000)}">
      <div class="dp-chips" role="group" aria-label="${esc(t('dp.preset'))}">${presets}</div>
    </div>
    <p class="dp-help">${esc(tr(GRADE_HELP, lang))}</p>
    <p class="dp-fine"><sup class="dp-est">${t('dp.est')}</sup> ${esc(tr(CHART_NOTE, lang))}</p>
  </section>`;
}

/** The grade a method is in at `h` hours, for the readout and the pills. */
export const gradeAt = (m: Method, h: number): Grade => gradeOf(kAt(m, h));

/** The sentence under the legend: the best and worst methods at the hour chosen. */
export function readoutText(h: number, lang: Lang): string {
  const best = tr(GRADES[gradeAt('ikejime', h)], lang).toLowerCase();
  const worst = tr(GRADES[gradeAt('suffocate', h)], lang).toLowerCase();
  return t('dp.checked', { h: hoursLabel(h), best, worst });
}

/** The fish with its spike, cuts and wire, numbered to match the ikejime steps. */
export function diagramHtml(lang: Lang): string {
  const badge = (n: number, x: number, y: number) =>
    `<g class="dp-bd"><circle cx="${x}" cy="${y}" r="8"/><text x="${x}" y="${y + 3.6}" text-anchor="middle">${n}</text></g>`;
  const svg = `<svg class="dp-fish" viewBox="0 0 220 96" role="img" aria-label="${esc(tr(DIAGRAM.title, lang))}">
    <path class="dp-body" d="M16 50 C34 28 84 22 126 30 C156 36 176 44 204 30 L204 70 C176 56 156 62 126 68 C84 76 34 72 16 50 Z"/>
    <path class="dp-body" d="M16 50 C20 50 28 52 38 54"/>
    <circle class="dp-eye" cx="40" cy="45" r="4"/>
    <path class="dp-body" d="M64 33 C56 45 56 58 64 68"/>
    <path class="dp-cut" d="M64 31 C55 44 55 59 64 70"/>
    <path class="dp-cut" d="M150 44 L150 60"/>
    <path class="dp-wire" d="M150 52 L48 40"/>
    <path class="dp-arrow" d="M18 12 L45 34"/><path class="dp-arrow" d="M45 34 L38 33 M45 34 L44 27"/>
    ${badge(1, 14, 10)}${badge(2, 76, 83)}${badge(3, 150, 80)}${badge(4, 100, 26)}
  </svg>`;
  const legend = DIAGRAM.marks.map((m, i) => `<li><b>${i + 1}</b>${esc(tr(m, lang))}</li>`).join('');
  return `<figure class="dp-diagram">${svg}<figcaption><h4>${esc(tr(DIAGRAM.title, lang))}</h4><ol class="dp-marks">${legend}</ol></figcaption></figure>`;
}

export function methodsHtml(lang: Lang): string {
  const cards = METHODS.map(
    (m, i) => `<article class="dp-card" id="dp-m-${m.id}">
      <p class="fc-mono dp-k">${i + 1} · ${esc(tr(m.tag, lang))}</p>
      <h3>${esc(tr(m.name, lang))}</h3>
      <ol class="dp-steps">${m.steps.map((s) => `<li>${esc(tr(s, lang))}</li>`).join('')}</ol>
      ${m.note ? `<p class="dp-note">${factHtml(m.note, lang)}</p>` : ''}
    </article>`,
  ).join('');
  return `<section class="dp-sec" id="dp-methods" data-s="methods">${sectionHead('methods', tr(SECTION_LABELS.methods, lang), tr(METHODS_H, lang), tr(METHODS_P, lang))}${diagramHtml(lang)}<div class="dp-cards">${cards}</div></section>`;
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
  return `<section class="dp-sec" id="dp-histamine" data-s="histamine">${sectionHead('histamine', tr(SECTION_LABELS.histamine, lang), tr(HIST_H, lang), tr(HIST_P, lang))}
    <p class="dp-species">${esc(tr(HIST_SPECIES, lang))}</p>
    <ul class="dp-clock">${clock}</ul>
    <ul class="dp-facts">${HIST_FACTS.map((f) => `<li>${factHtml(f, lang)}</li>`).join('')}</ul></section>`;
}

export function routineHtml(lang: Lang): string {
  return `<section class="dp-sec" id="dp-routine" data-s="routine">${sectionHead('routine', tr(SECTION_LABELS.routine, lang), tr(ROUTINE_H, lang))}
    <ol class="dp-routine">${ROUTINE.map((r) => `<li><b class="dp-big">${r.n}</b><h3>${esc(tr(r.head, lang))}</h3><p>${esc(tr(r.body, lang))}</p></li>`).join('')}</ol></section>`;
}

export function sourcesHtml(lang: Lang): string {
  return `<section class="dp-sec" id="dp-sources" data-s="sources">${sectionHead('sources', tr(SECTION_LABELS.sources, lang), tr(SOURCES_H, lang), tr(SOURCES_P, lang))}
    <ol class="dp-srcs">${SOURCES.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.n)}</a></li>`).join('')}</ol></section>`;
}
