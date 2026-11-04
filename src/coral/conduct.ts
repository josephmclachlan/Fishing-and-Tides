/**
 * Coral rules and reef conduct (PLAN 7.35). Pure data: text is in i18n (`crule.*`, `cet.*`,
 * `ccon.*`). Rules reuse the fishing rules' shape (src/rules.ts): `official` means stated in an
 * official document we read, `unconfirmed` means we found nothing firm and the card says who to
 * ask. Fishing and spearfishing rules stay on the RULES card; this covers the reef itself.
 * Last checked 2026-11-04.
 */
import type { Rule } from '../rules';

/** Decreto Ejecutivo 41774-MINAE (La Gaceta 142, Alcance 170, 30 July 2019), national. */
const DECREE = { name: 'Decreto 41774-MINAE (2019)', url: 'https://faolex.fao.org/docs/pdf/cos191288.pdf' };
const CAHUITA = { name: 'Cahuita park brochure (ICT/SINAC 2023)', url: 'https://visitcostarica.com/sites/default/files/legacy/pdf/3_PN%20Cahuita.pdf' };
const SINAC = { name: 'SINAC', url: 'https://www.sinac.go.cr/' };

/** Reef rules: national first, then the parks. */
export const CORAL_RULES: readonly Rule[] = [
  { id: 'take', confidence: 'official', source: DECREE },
  { id: 'anchor', confidence: 'official', source: DECREE },
  { id: 'waste', confidence: 'official', source: DECREE },
  { id: 'restore', confidence: 'official', source: DECREE },
  { id: 'park.take', confidence: 'official', source: CAHUITA },
  { id: 'park.swim', confidence: 'official', source: CAHUITA },
  { id: 'park.hours', confidence: 'official', source: CAHUITA },
  { id: 'park.guide', confidence: 'unconfirmed', source: CAHUITA },
  { id: 'gandoca', confidence: 'unconfirmed', source: SINAC },
];

/** Good practice on the reef: advice, not law. */
export const CORAL_ETIQUETTE = ['touch', 'fins', 'nursery', 'sunscreen', 'feed', 'report'] as const;

export interface CoralContact {
  id: string;
  tel?: string[];
  email?: string;
  url?: string;
}

export const CORAL_CONTACTS: readonly CoralContact[] = [
  { id: 'cahuita', tel: ['+50627550302', '+50627550461'], email: 'aclac.pncahuita@sinac.go.cr' },
  { id: 'sinac', tel: ['1192'], url: 'https://www.sinac.go.cr/' },
];
