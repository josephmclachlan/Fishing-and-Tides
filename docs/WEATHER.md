# Weather tracker (PLAN 7.5)

**Shown:** rain now and over the next 24 h, cloud, UV and air temperature at the slider's valid time, as the plain mean of GFS, ECMWF IFS and ICON (`src/weather.ts`). When the models' rain rates differ by 2 mm/h or more the panel says MODELS DISAGREE. The weighted blend with local bias correction is PLAN 7.4. The WEATHER layer shows active Atlantic tropical storms from NHC as a red ring with name and category.

**Alerts** (alert strip, after the rip warning): a tropical system within 1500 km of the region, and heavy rain (mean model rate of 10 mm/h or more) in the next 3 hours. Both are advisory and say so; follow NHC and the IMN.

**Not built, and why:**
- Rain radar: needs an observation source with a licence for this use (satellite precipitation or a radar tile service). Not guessed at; add when one is chosen.
- Storm forecast cone, track and wind radii: need NHC's GIS products (shapefile or KMZ). The data build relays only the active-storm list today.
- Gridded cloud and UV maps: the adapter is one point at the region centre, which is honest for a 90 km coast but not for a map layer.

## Gusts and squall flag (PLAN 6.5)

GUSTS (kt) and CAPE (J/kg) are rows beside the other weather readings, from the same three models. The SQUALL 6H row looks at the next six hours: WATCH when mean CAPE is 1000 J/kg or more and either gusts reach 25 kt or rain reaches 5 mm/h in the same hour; HIGH when CAPE is 2500 or more with the same gates. The thresholds are common usage for convective instability plus two gates to avoid firing on dry unstable air; they are a heuristic and have not been tuned against Limón observations (PLAN 7.4 and 7.10 are where that learning belongs). Both levels add an alert-strip message. Advisory only.
