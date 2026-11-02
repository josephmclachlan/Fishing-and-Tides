/**
 * Fishing and spearfishing rules per zone (PLAN 6.8). Pure data: text is in i18n (`rule.<id>`),
 * each rule links the document it comes from. We report what a source says; SINAC (protected
 * areas) and INCOPESCA (fishing) are the authorities, and the card tells people to check.
 *
 * `official` = stated in an official document we read; `unconfirmed` = sources disagree or we
 * found nothing, so the card says who to ask. Last checked 2026-11-02.
 */
export type RuleConfidence = 'official' | 'unconfirmed';

export interface Rule {
  /** i18n key suffix: `rule.<id>`. */
  id: string;
  confidence: RuleConfidence;
  /** Where it comes from (shown as the link text) and its URL. */
  source: { name: string; url: string };
}

const INCOPESCA_SPEAR = { name: 'INCOPESCA AJDIP/098-2017', url: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-098-2017_Reglamento_Pesca_Sub_acuatica.pdf' };
const INCOPESCA_LIONFISH = { name: 'INCOPESCA AJDIP/194-2024', url: 'https://incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-194-2024_Modifica_Articulo_4_AJDIP-098-2017_Reglamento_Pesca_Subacuatica.pdf' };
const SINAC = { name: 'SINAC', url: 'https://www.sinac.go.cr/' };

/** Apply everywhere in Costa Rica, protected areas included. */
export const NATIONAL_RULES: readonly Rule[] = [
  { id: 'spear.method', confidence: 'official', source: INCOPESCA_LIONFISH },
  { id: 'spear.permit', confidence: 'official', source: INCOPESCA_SPEAR },
  { id: 'spear.limit', confidence: 'official', source: INCOPESCA_SPEAR },
  { id: 'spear.zones', confidence: 'official', source: INCOPESCA_SPEAR },
  {
    id: 'lobster',
    confidence: 'official',
    source: { name: 'INCOPESCA AJDIP/075-2012', url: 'https://www.incopesca.go.cr/acerca_incopesca/transparencia_institucional/jerarcas_decisiones/acuerdos/AJDIP-075-2012%20aprueba%20veda%20de%20langosta%20caribe.pdf' },
  },
];

export const ZONE_RULES: Readonly<Record<string, readonly Rule[]>> = {
  cahuita: [
    { id: 'cahuita.spear', confidence: 'official', source: { name: 'Cahuita park brochure (ICT)', url: 'https://visitcostarica.com/sites/default/files/legacy/pdf/3_PN%20Cahuita.pdf' } },
    { id: 'cahuita.fishing', confidence: 'unconfirmed', source: { name: 'SINAC Cahuita management plan 2016-2026', url: 'https://www.sinac.go.cr/ES/planmanejo/Plan%20Manejo%20ACLAC/Plan%20General%20de%20Manejo%20del%20Parque%20Nacional%20Cahuita%202016-2026.pdf' } },
  ],
  gandoca: [{ id: 'gandoca.fishing', confidence: 'unconfirmed', source: SINAC }],
  limoncito: [{ id: 'limoncito.fishing', confidence: 'unconfirmed', source: SINAC }],
};

/** Rules for the zone under the reticle (or none), then the national ones. */
export function rulesFor(zoneId: string | null): { here: readonly Rule[]; national: readonly Rule[] } {
  return { here: (zoneId && ZONE_RULES[zoneId]) || [], national: NATIONAL_RULES };
}
