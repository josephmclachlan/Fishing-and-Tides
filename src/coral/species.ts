/**
 * Coral species guide for Gandoca to Limón (PLAN 7.34). Pure data; display text (common names, ID tips)
 * is i18n `cg.<id>.name` and `cg.<id>.tip`.
 *
 * Sources: species recorded at Cahuita and Gandoca-Manzanillo (Cortés & Risk 1984, Cortés 1992,
 * Palacios-Martínez 2009 on the Cahuita underwater trails); conservation status (IUCN Red List for the
 * two Acropora, US Endangered Species Act listings for Orbicella, used across the Caribbean); SCTLD
 * susceptibility tiers from the Caribbean case definition (AGRRA / Florida Coral Disease Response).
 * The 2023 UCR survey (Cahuita to Manzanillo) also saw presumed SCTLD lesions on species usually rated
 * low (Acropora palmata, Porites), so `localSctld` flags what was seen here.
 */
export type Sctld = 'high' | 'mid' | 'low';
export type Status = 'CR' | 'ESA-T' | '';

export interface CoralSpecies {
  id: string;
  name: string;
  status: Status;
  sctld: Sctld;
  /** Presumed SCTLD seen on it on this coast (UCR survey, Sept–Oct 2023). */
  localSctld?: boolean;
  /** Bleaches early in a heat wave (branching and fire corals first). */
  heatSensitive?: boolean;
}

export const CORAL_SPECIES: readonly CoralSpecies[] = [
  { id: 'apal', name: 'Acropora palmata', status: 'CR', sctld: 'low', localSctld: true, heatSensitive: true },
  { id: 'acer', name: 'Acropora cervicornis', status: 'CR', sctld: 'low', heatSensitive: true },
  { id: 'ofav', name: 'Orbicella faveolata', status: 'ESA-T', sctld: 'mid' },
  { id: 'oann', name: 'Orbicella annularis', status: 'ESA-T', sctld: 'mid' },
  { id: 'mcav', name: 'Montastraea cavernosa', status: '', sctld: 'mid' },
  { id: 'ssid', name: 'Siderastrea siderea', status: '', sctld: 'mid', localSctld: true },
  { id: 'srad', name: 'Siderastrea radians', status: '', sctld: 'low' },
  { id: 'aaga', name: 'Agaricia agaricites', status: '', sctld: 'low', heatSensitive: true },
  { id: 'past', name: 'Porites astreoides', status: '', sctld: 'low' },
  { id: 'ppor', name: 'Porites porites / furcata', status: '', sctld: 'low', localSctld: true, heatSensitive: true },
  { id: 'pstr', name: 'Pseudodiploria strigosa', status: '', sctld: 'high', localSctld: true },
  { id: 'pcli', name: 'Pseudodiploria clivosa', status: '', sctld: 'high' },
  { id: 'dlab', name: 'Diploria labyrinthiformis', status: '', sctld: 'high' },
  { id: 'cnat', name: 'Colpophyllia natans', status: '', sctld: 'high' },
  { id: 'mmea', name: 'Meandrina meandrites', status: '', sctld: 'high' },
  { id: 'dsto', name: 'Dichocoenia stokesii', status: '', sctld: 'high' },
  { id: 'sint', name: 'Stephanocoenia intersepta', status: '', sctld: 'mid' },
  { id: 'mill', name: 'Millepora complanata / alcicornis', status: '', sctld: 'low', heatSensitive: true },
];

/** Disease and damage cards, in the order shown. Text: i18n `cd.<id>.name`, `cd.<id>.signs`, `cd.<id>.do`. */
export const CORAL_THREATS = ['sctld', 'plague', 'bleach', 'diadema'] as const;
