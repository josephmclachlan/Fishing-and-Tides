# Weather tracker (PLAN 7.5)

**Shown:** rain now and over the next 24 h, cloud, UV and air temperature at the slider's valid time, as the plain mean of GFS, ECMWF IFS and ICON (`src/weather.ts`). When the models' rain rates differ by 2 mm/h or more the panel says MODELS DISAGREE. The weighted blend with local bias correction is PLAN 7.4. The WEATHER layer shows active Atlantic tropical storms from NHC as a red ring with name and category.

**Alerts** (alert strip, after the rip warning): a tropical system within 1500 km of the region, and heavy rain (mean model rate of 10 mm/h or more) in the next 3 hours. Both are advisory and say so; follow NHC and the IMN.

**Not built, and why:**
- Rain radar: needs an observation source with a licence for this use (satellite precipitation or a radar tile service). Not guessed at; add when one is chosen.
- Storm forecast cone, track and wind radii: need NHC's GIS products (shapefile or KMZ). The data build relays only the active-storm list today.
- Gridded cloud and UV maps: the adapter is one point at the region centre, which is honest for a 90 km coast but not for a map layer.
