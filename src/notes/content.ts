/**
 * FIELD NOTES page text, English and Spanish: one file per tab in sections/. Plain data, no DOM. Every source is named
 * only through a `{key}` marker that the page turns into a superscript number (view.ts), never a name in brackets.
 * Local edible fish only: no sport-fish advice.
 */
import type { Block, L, Source } from '../ciguatera/content';
import type { NtTab } from './route';
import { rules } from './sections/rules';
import { surf } from './sections/surf';
import { water } from './sections/water';
import { aid } from './sections/aid';
import { rigs } from './sections/rigs';
import { release } from './sections/release';
import { cook } from './sections/cook';
import { seasons } from './sections/seasons';
import { words } from './sections/words';

const L = (en: string, es: string): L => ({ en, es });

export interface Section {
  id: NtTab;
  title: L;
  /** One line under the title. */
  lede: L;
  blocks: Block[];
  /** The sources this tab's `{key}` markers name. */
  sources: Record<string, Source>;
}

export const TITLE = L('Field notes', 'Notas de campo');
export const SUB = L('RULES · SURF · DIVE AND SNORKEL · FIRST AID · RIGS · RELEASE · COOKING · SEASONS · WORDS', 'REGLAS · SURF · BUCEO Y SNORKEL · PRIMEROS AUXILIOS · APAREJOS · LIBERAR · COCINAR · TEMPORADAS · PALABRAS');
export const NOTE = L(
  'Information from published sources, not legal or medical advice. Rules change, so check with INCOPESCA and SINAC. Superscript numbers point to the sources listed at the end of each section.',
  'Información de fuentes publicadas, no asesoría legal ni médica. Las reglas cambian: confirme con INCOPESCA y SINAC. Los números en superíndice remiten a las fuentes al final de cada sección.',
);
export const CHROME = {
  back: { map: L('Map', 'Mapa'), forecast: L('Forecast', 'Pronóstico'), guide: L('Guide', 'Guía'), coral: L('Coral', 'Coral'), ciguatera: L('Ciguatera', 'Ciguatera') },
  backTitle: L('Leave the field notes', 'Salir de las notas de campo'),
  tabs: L('Sections', 'Secciones'),
  linkLabel: L('Field notes: rules, first aid, rigs, cooking, seasons', 'Notas de campo: reglas, primeros auxilios, aparejos, cocina, temporadas'),
};

export const SECTIONS: Section[] = [rules, surf, water, aid, rigs, release, cook, seasons, words];
