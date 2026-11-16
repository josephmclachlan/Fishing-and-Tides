# Ciguatera page (#ciguatera, PLAN 7.101)

Text lives in `src/ciguatera/content.ts` (English and Spanish side by side), HTML in `view.ts`, route in `route.ts`.
Research files are in the project files folder `ciguatera/research/` (cases.md, species-size.md, medical.md).

## Rules for editing the text
- Say only what a source says. Grades (`Supported`, `Weak trial evidence`, `Case reports only`, `Expert opinion`, `No evidence found`, `Contradicted`) are the sources' own.
- A place with no data is "no data", never "safe".
- No "small fish are fine" wording: the CDC and a 2022 Polynesian study say small fish stay risky.
- Citations (Joseph's app-wide rule, 2026-11-16): never name a source in the text or in brackets. Put `{key}` markers (keys in `SOURCES`) after the sentence; the view turns them into superscript numbers, 1, 2, 3 in order of first appearance on each tab, and ends the tab with its sources in that order. Renumbering is automatic when text moves. Never show "read only as a summary" notes on the page (Joseph, 2026-11-16): where a claim rests on a summary or low-confidence source, find the primary text or drop the claim. `p` in `SOURCES` is an internal note of what was read in full (P) or only as an abstract (S); the remaining S items are listed under Open checks.

## Links in
Any element with `href="#ciguatera"` opens it (fishing panel lines, species guide eat-risk block and edible list). Tabs: `#ciguatera/<risk|here|fish|symptoms|treatment|recovery|ifill>`.

## Review passes (2026-11-16, files in project folder ciguatera/research/pass3-*.md)
Deeper pass fixed: Colombia paper is Alvarez 1999 (not 1985-86); Cuba 46 outbreaks is Ciego de Avila province only; the "3 km" hotspot line is from a literature statement in Liefer 2021, not a St. Thomas fish measurement (the "4% of fish" claim was dropped); NOAA size study read (Loeffler 2018, weak size link); FDA gives no size cutoff; California 6 lb rule dropped (unverified); test-kit numbers corrected; Guadeloupe rate 1.5 per 10,000 (2013-16) beside 30 (1984); deaths wording; Costa Rican reporting route added.

## Open checks (for Joseph or a local)
- Poison centre 800-INTOXICA (800-4686-9422) comes from news items only; confirm with the Centro Nacional de Control de Intoxicaciones.
- Whether any local fisher, dive shop, APACS or the Cahuita and Puerto Viejo clinics know of cases (no published source).
- Friedman 2017 was read only in part; the NOAA Caribbean size-versus-toxin study and Lehane and Lewis 2000 were not read.
- Still abstract-only (S in SOURCES): Schnorf 2002 full text, Cuba province paper, Nicaragua Cayos Miskitos article, Pottier and Vernoux 2003, Belize Ministry notice, St. Eustatius, CCSS poison-line page, Navarro-Quiroz 2020 (San Andres, dropped), Dickey and Plakas 2010.
- Punta Galeta (Panama) reports Gambierdiscus but a 2026 Panamanian index says none documented for Colon: unresolved.
