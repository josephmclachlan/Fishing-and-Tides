# Seafloor data sources

What feeds the depth, reef and seamark layer (PLAN 2.6), and what we looked at and didn't use.
Rebuild with `npm run data:seafloor` (writes `public/data/seafloor/`, ~1.5 MB, ~0.5 MB gzipped; precached for offline).

## Used

| Data | Source | Resolution | Licence | Notes |
|---|---|---|---|---|
| Depth + elevation | [GEBCO 2026 Grid](https://www.gebco.net/) via download.gebco.net | 15″ (~460 m); packed at 15″ for the region, 1′ means for the Caribbean view | Public domain; must credit; **not for navigation** | Best open global grid. Comes with a type-ID (TID) grid saying where each depth came from; the HUD shows it as SOURCE. |
| Reef zones, bottom cover | [Allen Coral Atlas](https://allencoralatlas.org/) public WFS | 5 m pixels, to ~10–15 m depth | CC BY 4.0 | Geomorphic zones (reef crest, flats, slopes, lagoons) and benthic cover (coral/algae, seagrass, sand, rubble, rock). Covers Cahuita to Punta Mona. |
| Named reefs, wrecks, lights, harbours | OpenStreetMap (OSM API) | Hand-mapped | ODbL | `natural=reef` (six named reefs), `seamark:*` (wrecks incl. the Danish wrecks at Cahuita, Sixaola light, Limón and Moín harbours). |
| Coastline land mask | OpenStreetMap `natural=coastline` | Rasterised to 0.0003° (~33 m) | ODbL | Keeps GEBCO's coarse shading and shallow contours off the beach at street zoom. |

**What the depth here actually is.** GEBCO's TID grid for Gandoca to Limón: shallow water (<60 m) is mostly satellite-derived optical bathymetry (TID 16); deeper water mixes multibeam/singlebeam survey lines (11, 10, 17) with depths predicted from satellite gravity (40). No ENC/chart soundings (14) feed GEBCO here. So contours near shore are smooth approximations at 460 m spacing, which is why the reef zones (5 m) carry the detail at the spot tier.

## Looked at, not used

- **NOAA NCEI DEMs**: only ETOPO 2022 (15″) covers this coast, and it takes its ocean depths from GEBCO. The Coastal Relief Model and other high-res DEMs are US-only.
- **GMRT** (Lamont, CC BY 4.0): serves this area at ~120 m nodes, but they're interpolated from the same GEBCO base plus a few multibeam lines. No real gain.
- **Costa Rican charts**: no public digital hydrographic survey or ENC data found. SNIT/IGN geoservices weren't reachable from the build machine. Paper/ENC charts (NGA, UKHO) aren't openly licensed.
- **UNEP-WCMC Global Distribution of Coral Reefs v4.1**: only 6 coarse polygons here, non-commercial licence. Allen Coral Atlas is finer and CC BY.
- **Protected areas**: WDPA (Protected Planet) has Cahuita NP and Gandoca-Manzanillo with marine areas, but its terms bar redistributing the data, so don't bundle it. SINAC/SNIT is the official source. Done in PLAN 4.3 from OSM boundaries (SINAC 2019): see docs/ZONES.md.
- **OpenSeaMap raster tiles**: would show the same OSM seamarks but in chart colours, not the HUD style.
