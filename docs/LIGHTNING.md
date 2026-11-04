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
- GitHub runs the 10-minute schedule only every few hours; the external timer below fixes that.

## Running every 10 minutes for real (external timer)

GitHub's `*/10` schedule is a request, not a promise. In practice it fired every 4 to 8 hours (8 runs from 2 to 4 Nov 2026), so the file was usually hours old and the alert was suppressed. A run started through the API (`workflow_dispatch`) starts within seconds, so a free outside timer calls it every 10 minutes. The schedule stays as a backup.

**1. Make a token that can only start workflows in this repo.** GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
- Name: `lightning timer`. Expiration: the longest offered (note the date; the timer stops when it expires).
- Repository access: Only select repositories, `Fishing-and-Tides`.
- Repository permissions: **Actions: Read and write**. Nothing else (Metadata: Read-only is added automatically).
- Copy the token (`github_pat_...`). It is shown once.

**2. Make the timer.** Free account at https://cron-job.org, Create cronjob.
- URL: `https://api.github.com/repos/josephmclachlan/Fishing-and-Tides/actions/workflows/lightning.yml/dispatches`
- Schedule: every 10 minutes.
- Advanced: Request method **POST**; headers
  - `Authorization: Bearer github_pat_...`
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `Content-Type: application/json`
- Request body: `{"ref":"main"}`
- Save, then press Test run. GitHub answers **204 No Content** when it worked, and a new "Collect lightning" run appears under Actions with the event `workflow_dispatch`.

**Checking it:** SYSTEM CHECK's "Collector ran within the last 30 min" goes green. A 401 means the token is wrong or expired; 403 or 404 means the token lacks Actions write on this repo. Each run is about a minute of Actions time, free on a public repo.
