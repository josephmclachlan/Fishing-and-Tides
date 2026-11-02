/**
 * Every adapter's verify checks in one list (PLAN 2.8, 2.9). The SYSTEM CHECK panel and the daily
 * Action both run `allChecks()`. A new adapter adds its `xxxChecks(...)` here: an adapter without
 * checks is incomplete (DESIGN.md §10).
 */
import { fetchWind, windChecks } from '../adapters/wind';
import { occurrenceChecks } from '../fishing/checks';
import type { Check } from './types';

export function allChecks(base: string = import.meta.env.BASE_URL): Check[] {
  return [
    ...windChecks(() => fetchWind({ base })),
    ...occurrenceChecks(base),
  ];
}
