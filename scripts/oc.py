"""
Satellite water clarity from Copernicus Marine GlobColour (PLAN 7.47): diffuse attenuation at
490 nm (`KD490`), gap-free daily L4 at 4 km, merged from every ocean-colour sensor flying.

  * Recent maps (default): the near-real-time product OCEANCOLOUR_GLO_BGC_L4_NRT_009_102, about a
    day late, last `--days` days, for scripts/forecast/satellite.ts (buildKd490Nrt) to pack as the
    `kd490-nrt` feed.
  * `--clim`: every day of the multi-year product OCEANCOLOUR_GLO_BGC_L4_MY_009_104 (1997 on, same
    algorithm and grid), for scripts/fetch-kd490-clim.ts to turn into the clear-water baseline.

    COPERNICUSMARINE_USERNAME=… COPERNICUSMARINE_PASSWORD=… \
      python3 -I scripts/oc.py --box=-83.5,9.3,-82.25,10.3 --days 10 --out oc.json

Needs the copernicusmarine toolbox (scripts/requirements.txt) and the free Copernicus Marine
account, read from the environment and never printed, like scat.py and mld.py. Output JSON: grid
(row 0 north), times in epoch ms at 12:00 UTC of the day each map covers (the product stamps the
day's start), one map per day, 1/m to 4 decimals, null on land.
"""
import argparse, json, logging, os, sys
from datetime import datetime, timedelta, timezone

NRT = ("cmems_obs-oc_glo_bgc-transp_nrt_l4-gapfree-multi-4km_P1D", "Copernicus GlobColour Kd490, gap-free L4 4 km, near real time (OCEANCOLOUR_GLO_BGC_L4_NRT_009_102)")
MY = ("cmems_obs-oc_glo_bgc-transp_my_l4-gapfree-multi-4km_P1D", "Copernicus GlobColour Kd490, gap-free L4 4 km, multi-year (OCEANCOLOUR_GLO_BGC_L4_MY_009_104)")
VAR = "KD490"
STEP = 1 / 24


def open_remote(dataset, box, start, end):
    """The dataset's subset over `box` from `start` to `end` (None: the whole record), lazily, through the toolbox (ARCO zarr)."""
    import copernicusmarine

    user, pw = os.environ.get("COPERNICUSMARINE_USERNAME"), os.environ.get("COPERNICUSMARINE_PASSWORD")
    if not user or not pw:
        sys.exit("COPERNICUSMARINE_USERNAME and COPERNICUSMARINE_PASSWORD are not set")
    w, s, e, n = box
    return copernicusmarine.open_dataset(
        dataset_id=dataset, username=user, password=pw, variables=[VAR],
        minimum_longitude=w, maximum_longitude=e, minimum_latitude=s, maximum_latitude=n,
        start_datetime=start.strftime("%Y-%m-%dT%H:%M:%S") if start else None,
        end_datetime=end.strftime("%Y-%m-%dT%H:%M:%S") if end else None,
    )


def frames(ds, every=1):
    """Daily maps, north-first rows, None on land; times as epoch ms. Days with no sea at all are left out."""
    import numpy as np

    ds = ds.sortby("latitude", ascending=False).sortby("longitude").isel(time=slice(None, None, every))
    lon, lat = ds.longitude.values, ds.latitude.values
    # Whole record over the coast box: about 10,700 maps of 30 x 24 pixels, 60 MB as float64.
    z = ds[VAR].values.astype("float64")
    t = ds.time.values.astype("datetime64[D]")
    times, maps = [], []
    for k in range(z.shape[0]):
        ok = np.isfinite(z[k]) & (z[k] > 0)
        if not ok.any():
            continue
        times.append(int((t[k].astype("datetime64[ms]") + np.timedelta64(12, "h")).astype("int64")))
        maps.append([round(float(x), 4) if m else None for x, m in zip(z[k].ravel(), ok.ravel())])
    # Steps from the span: the coordinates are float32, so neighbour differences wobble in the 6th place.
    step = lambda v: round(float(abs(v[-1] - v[0]) / (v.size - 1)), 8) if v.size > 1 else STEP
    grid = {"cols": int(lon.size), "rows": int(lat.size), "lon0": round(float(lon[0]), 6), "lat0": round(float(lat[0]), 6), "dlon": step(lon), "dlat": step(lat)}
    return grid, times, maps


def collect(box, days, clim=False, every=1, opener=open_remote):
    dataset, name = MY if clim else NRT
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start, end = (None, None) if clim else (today - timedelta(days=days), today + timedelta(days=1))
    grid, times, maps = frames(opener(dataset, box, start, end), every)
    if not times:
        raise SystemExit("oc: no sea pixels over the box")
    return {"id": dataset, "name": name, "grid": grid, "times": times, "kd490": maps}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--box", required=True, help="w,s,e,n")
    ap.add_argument("--days", type=int, default=10)
    ap.add_argument("--clim", action="store_true", help="the whole multi-year record instead of the recent maps")
    ap.add_argument("--every", type=int, default=1, help="with --clim: keep every Nth day")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    logging.getLogger("copernicusmarine").setLevel(logging.WARNING)
    out = collect([float(x) for x in a.box.split(",")], a.days, a.clim, max(1, a.every))
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(f"{len(out['times'])} days over {out['grid']['cols']}x{out['grid']['rows']} pixels")


if __name__ == "__main__":
    main()
