# Ciguatera page (#ciguatera, PLAN 7.101)

Text lives in `src/ciguatera/content.ts` (English and Spanish side by side), HTML in `view.ts`, route in `route.ts`.
Research files are in the project files folder `ciguatera/research/` (cases.md, species-size.md, medical.md).

## Rules for editing the text
- Say only what a source says. Grades (`Supported`, `Weak trial evidence`, `Case reports only`, `Expert opinion`, `No evidence found`, `Contradicted`) are the sources' own.
- A place with no data is "no data", never "safe".
- No "small fish are fine" wording: the CDC and a 2022 Polynesian study say small fish stay risky.
- Citations (Joseph's app-wide rule, 2026-11-16): never name a source in the text or in brackets. Put `{key}` markers (keys in `SOURCES`) after the sentence; the view turns them into superscript numbers, 1, 2, 3 in order of first appearance on each tab, and ends the tab with its sources in that order. Renumbering is automatic when text moves. Sources marked S were read as summaries only; verify before quoting them elsewhere.

## Links in
Any element with `href="#ciguatera"` opens it (fishing panel lines, species guide eat-risk block and edible list). Tabs: `#ciguatera/<risk|here|fish|symptoms|treatment|recovery|ifill>`.

## Open checks (for Joseph or a local)
- Poison centre 800-INTOXICA (800-4686-9422) comes from news items only; confirm with the Centro Nacional de Control de Intoxicaciones.
- Whether any local fisher, dive shop, APACS or the Cahuita and Puerto Viejo clinics know of cases (no published source).
- Friedman 2017 was read only in part; the NOAA Caribbean size-versus-toxin study and Lehane and Lewis 2000 were not read.
