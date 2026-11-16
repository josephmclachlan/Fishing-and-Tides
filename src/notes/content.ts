/**
 * FIELD NOTES page text, English and Spanish: one file per tab in sections/. Plain data, no DOM. Every source is named
 * only through a `{key}` marker that the page turns into a superscript number (view.ts), never a name in brackets.
 * Local edible fish only: no sport-fish advice.
 */
import type { Block, L, Source } from '../ciguatera/content';
import { tabsFor, type NtAct, type NtTab } from './route';
import type { VBlock } from './vis';
import { rules } from './sections/rules';
import { surf } from './sections/surf';
import { aid } from './sections/aid';
import { water } from './sections/water';
import { dive } from './sections/dive';
import { rigs } from './sections/rigs';
import { release } from './sections/release';
import { cook } from './sections/cook';
import { seasons } from './sections/seasons';
import { words } from './sections/words';

const L = (en: string, es: string): L => ({ en, es });

export type NBlock = Block | VBlock;

export interface Section {
  id: NtTab;
  title: L;
  /** One line under the title. */
  lede: L;
  /** Text blocks (shared with the ciguatera page) and the visual blocks of vis.ts. */
  blocks: NBlock[];
  /** The sources this tab's `{key}` markers name. */
  sources: Record<string, Source>;
}

export const TITLE = L('Field notes', 'Notas de campo');
export const SUB = L('RULES · SURF · WATER SAFETY · DIVE SAFETY · FIRST AID · RIGS · RELEASE · COOKING · SEASONS · WORDS', 'REGLAS · SURF · SEGURIDAD EN EL AGUA · SEGURIDAD EN EL BUCEO · PRIMEROS AUXILIOS · APAREJOS · LIBERAR · COCINAR · TEMPORADAS · PALABRAS');
export const NOTE = L(
  'Information from published sources, not legal or medical advice. Rules change, so check with INCOPESCA and SINAC. Superscript numbers point to the sources listed at the end of each section.',
  'Información de fuentes publicadas, no asesoría legal ni médica. Las reglas cambian: confirme con INCOPESCA y SINAC. Los números en superíndice remiten a las fuentes al final de cada sección.',
);
export const CHROME = {
  back: { map: L('Map', 'Mapa'), forecast: L('Forecast', 'Pronóstico'), guide: L('Guide', 'Guía'), coral: L('Coral', 'Coral'), ciguatera: L('Ciguatera', 'Ciguatera') },
  backTitle: L('Leave the field notes', 'Salir de las notas de campo'),
  tabs: L('Sections', 'Secciones'),
  linkLabel: L('Field notes: rules, water safety, first aid, rigs, cooking, seasons', 'Notas de campo: reglas, seguridad en el agua, primeros auxilios, aparejos, cocina, temporadas'),
};

export const SECTIONS: Section[] = [rules, surf, water, dive, aid, rigs, release, cook, seasons, words];

/** The activity names shown in the title of an activity's own field notes. */
export const ACT_NAME: Record<NtAct, L> = {
  fish: L('Fishing', 'Pesca'),
  spear: L('Spearfishing', 'Pesca submarina'),
  surf: L('Surf', 'Surf'),
  snorkel: L('Snorkel', 'Snorkel'),
  dive: L('Diving', 'Buceo'),
  swim: L('Swimming', 'Natación'),
  sail: L('Sailing', 'Vela'),
};
export const ALL_NOTES = L('All field notes', 'Todas las notas de campo');

/** The line under the title: the tabs shown, in order. */
export const subFor = (act: NtAct | undefined, lang: 'en' | 'es'): string =>
  act ? tabsFor(act).map((t) => SECTIONS.find((s) => s.id === t)!.title[lang].toUpperCase()).join(' · ') : SUB[lang];
