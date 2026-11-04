"""
Mixed-layer depth forecast (PLAN 7.18): the depth of the warm, stirred surface layer above the
thermocline, from the Copernicus Marine global ocean model (GLOBAL_ANALYSISFORECAST_PHY_001_024,
daily means at 1/12°, variable `mlotst`, about 10 days ahead). Offshore fish hold at or just
under its base, so a shallow layer pushes bait and pelagics up to trolling depth.

Writes the daily maps to JSON for scripts/forecast/satellite.ts (buildMld) to pack. Run by the
data build:

    COPERNICUSMARINE_USERNAME=… COPERNICUSMARINE_PASSWORD=… \
      python3 -I scripts/mld.py --box=-84,8.75,-81.5,11 --days 10 --out mld.json

Needs the copernicusmarine toolbox (scripts/requirements.txt) and the free Copernicus Marine
account, read from the environment and never printed.
"""
import argparse, json, logging, os, sys
from datetime import datetime, timedelta, timezone

DATASET = "cmems_mod_glo_phy_anfc_0.083deg_P1D-m"
NAME = "Copernicus Marine global ocean model 1/12° (GLOBAL_ANALYSISFORECAST_PHY_001_024)"
VAR = "mlotst"
STEP = 1 / 12


def open_remote(box, start: datetime, end: datetime):
    """The dataset's subset over `box` from `start` to `end`, lazily, through the toolbox (ARCO zarr)."""
    import copernicusmarine

    user, pw = os.environ.get("COPERNICUSMARINE_USERNAME"), os.environ.get("COPERNICUSMARINE_PASSWORD")
    if not user or not pw:
        sys.exit("COPERNICUSMARINE_USERNAME and COPERNICUSMARINE_PASSWORD are not set")
    w, s, e, n = box
    return copernicusmarine.open_dataset(
        dataset_id=DATASET, username=user, password=pw, variables=[VAR],
        minimum_longitude=w, maximum_longitude=e, minimum_latitude=s, maximum_latitude=n,
        start_datetime=start.strftime("%Y-%m-%dT%H:%M:%S"), end_datetime=end.strftime("%Y-%m-%dT%H:%M:%S"),
    )


def frames(ds):
    """Daily maps, north-first rows, NaN (land) as None, metres to 0.1 m; times as epoch ms."""
    import numpy as np

    ds = ds.sortby("latitude", ascending=False).sortby("longitude").load()
    lon, lat = ds.longitude.values, ds.latitude.values
    times, maps = [], []
    for k in range(ds.sizes["time"]):
        z = ds[VAR].isel(time=k).values.astype("float64")
        ok = np.isfinite(z)
        if not ok.any():
            continue
        times.append(int(ds.time.values[k].astype("datetime64[ms]").astype("int64")))
        maps.append([round(float(x), 1) if m else None for x, m in zip(z.ravel(), ok.ravel())])
    grid = {"cols": int(lon.size), "rows": int(lat.size), "lon0": round(float(lon[0]), 4), "lat0": round(float(lat[0]), 4),
            "dlon": round(float(lon[1] - lon[0]), 6) if lon.size > 1 else STEP, "dlat": round(float(lat[0] - lat[1]), 6) if lat.size > 1 else STEP}
    return grid, times, maps


def collect(box, days: int, opener=open_remote):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    grid, times, maps = frames(opener(box, today - timedelta(days=1), today + timedelta(days=days)))
    if not times:
        raise SystemExit("mld: the model returned no sea cells over the box")
    return {"id": DATASET, "name": NAME, "grid": grid, "times": times, "mld": maps}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--box", required=True, help="w,s,e,n")
    ap.add_argument("--days", type=int, default=10)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    logging.getLogger("copernicusmarine").setLevel(logging.WARNING)
    out = collect([float(x) for x in a.box.split(",")], a.days)
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(f"{len(out['times'])} days over {out['grid']['cols']}x{out['grid']['rows']} cells")


if __name__ == "__main__":
    main()
