# Lightning alerts (PLAN 7.6)

**Source:** NOAA GOES-East GLM (Geostationary Lightning Mapper), Level 2 LCFA files on the public S3 bucket `noaa-goes19`, one NetCDF4 file per 20 s. No key needed.

**Pipeline:** `.github/workflows/lightning.yml` runs every 10 minutes. `scripts/lightning.py` (Python and h5py, installed in the workflow only, not an app dependency) reads the last 30 minutes of files, keeps flashes inside the region plus 3° (`LIGHTNING_BOUNDS` in `src/region.ts`), and the job force-pushes `lightning.json` as the only commit of the orphan branch `data-lightning`. The app reads it from `raw.githubusercontent.com` (CORS open). It is kept off the Pages deploy so a 10-minute cadence does not rebuild the site.

**App:** `src/adapters/lightning.ts` (offline cache, DATA AGE reports the collector's time, verify checks), `src/lightning.ts` (nearest flash and counts, tested), `src/layers/lightning.ts` (dots: red under 10 minutes, amber older), `src/lightning-hud.ts` (rows and alert strip). A flash within 25 km of the reticle in the last 15 minutes raises "LIGHTNING n KM AWAY".

**Limits, said plainly:**
- Latency: GLM files appear 1 to 2 minutes after the flash, the job runs every 10 minutes, GitHub may delay a scheduled run, and raw.githubusercontent caches for about 5 minutes. Expect up to roughly 15 minutes. If the file is over 30 minutes old the panel says FEED n MIN OLD and the alert is suppressed, so silence is never mistaken for "no storms".
- GLM sees optical flashes from space, cloud-to-cloud included, with a detection rate below 100% and a pixel of about 8 km.
- Advisory only. It is not a safety system: if you can hear thunder, get off the water.
- Needs the app served from GitHub Pages (the repo is read from the host name); in dev the rows show NO DATA.
- The first run must happen before the branch exists: trigger the workflow once by hand (Actions, Collect lightning, Run workflow).
