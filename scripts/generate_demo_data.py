"""Generate deterministic synthetic remote-sensing demo data with known ground truth.

Why synthetic data is the right call for a prototype (and not a shortcut):

* Real benchmark corpora are enormous (BigEarthNet is tens of GB) and cannot ship in a repo.
* Ground truth is **exactly known** here, so geospatial tests can assert precise coordinates
  and areas, and evaluation scripts can compute *real* IoU/precision/recall/F1 rather than
  quoting numbers from a paper.
* Spectral and backscatter signatures are taken from published class behaviour, so the
  indices and fusion logic are exercised the way real imagery would exercise them.

Everything is seeded, so regenerating produces byte-comparable rasters.

Usage::

    python scripts/generate_demo_data.py            # write data/demo
    python scripts/generate_demo_data.py --force    # overwrite existing
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

REPO_ROOT = Path(__file__).resolve().parents[1]
DEMO_ROOT = REPO_ROOT / "data" / "demo"

SEED = 20260101
SIZE = 512               # pixels per side
PIXEL_M = 10.0           # 10 m ground sample distance (Sentinel-2 like)
UTM_EPSG = 32643         # UTM zone 43N — covers much of India
ORIGIN_X = 700000.0      # easting of upper-left corner
ORIGIN_Y = 2100000.0     # northing of upper-left corner

# Class codes used in ground-truth rasters.
CLS_UNCLASSIFIED = 0
CLS_WATER = 1
CLS_VEGETATION = 2
CLS_BUILT_UP = 3
CLS_BARE_SOIL = 4

CLASS_NAMES = {
    CLS_UNCLASSIFIED: "unclassified",
    CLS_WATER: "water",
    CLS_VEGETATION: "vegetation",
    CLS_BUILT_UP: "built_up",
    CLS_BARE_SOIL: "bare_soil",
}

# Surface reflectance per class, ordered [blue, green, red, nir, swir1, swir2].
# Chosen to reproduce the real index behaviour: water NDWI>0, vegetation NDVI high,
# built-up NDBI>0. Built-up vs bare soil stay genuinely close in reflectance — that
# confusion is real, and it is what makes SAR fusion demonstrably useful.
REFLECTANCE = {
    CLS_WATER:      (0.06, 0.08, 0.05, 0.02, 0.010, 0.010),
    CLS_VEGETATION: (0.03, 0.06, 0.04, 0.45, 0.200, 0.100),
    CLS_BUILT_UP:   (0.15, 0.16, 0.18, 0.22, 0.300, 0.280),
    CLS_BARE_SOIL:  (0.12, 0.15, 0.20, 0.28, 0.320, 0.250),
}

# Per-class texture magnitude (fraction of reflectance). Built-up is heterogeneous
# (roofs/roads/shadows); water is near-specular and very smooth.
TEXTURE = {
    CLS_WATER: 0.03,
    CLS_VEGETATION: 0.10,
    CLS_BUILT_UP: 0.28,
    CLS_BARE_SOIL: 0.12,
}

# SAR VV backscatter in dB. Water is specular (very dark); built-up double-bounces
# (very bright). This is the complementary information optical indices lack.
SAR_DB = {
    CLS_WATER: -20.0,
    CLS_VEGETATION: -10.0,
    CLS_BUILT_UP: -3.5,
    CLS_BARE_SOIL: -14.0,
}

BAND_NAMES = ("blue", "green", "red", "nir", "swir1", "swir2")
REFLECTANCE_SCALE = 10000.0  # Sentinel-2 style uint16 scaling


def base_transform(pixel_m: float = PIXEL_M) -> Affine:
    """North-up affine transform for the demo grid."""
    return Affine(pixel_m, 0.0, ORIGIN_X, 0.0, -pixel_m, ORIGIN_Y)


# ---------------------------------------------------------------------------
# Scene layout
# ---------------------------------------------------------------------------
def _draw_urban_block(labels: np.ndarray, x0: int, y0: int, x1: int, y1: int,
                      rng: np.random.Generator) -> None:
    """Fill a rectangle with a built-up block pattern separated by a road grid."""
    cv2.rectangle(labels, (x0, y0), (x1, y1), CLS_BUILT_UP, thickness=-1)
    # Roads read as bare surfaces between buildings.
    step = 26
    for x in range(x0 + step, x1, step):
        jitter = int(rng.integers(-2, 3))
        cv2.line(labels, (x + jitter, y0), (x + jitter, y1), CLS_BARE_SOIL, thickness=3)
    for y in range(y0 + step, y1, step):
        jitter = int(rng.integers(-2, 3))
        cv2.line(labels, (x0, y + jitter), (x1, y + jitter), CLS_BARE_SOIL, thickness=3)


def build_label_map(rng: np.random.Generator, *, epoch: int = 1) -> np.ndarray:
    """Construct the ground-truth class map.

    Args:
        rng: Seeded generator.
        epoch: ``1`` for the earlier date, ``2`` for the later date. Epoch 2 applies known
            changes (urban expansion, reservoir shrinkage, field greening) so change
            detection can be scored against exactly-known regions.
    """
    labels = np.full((SIZE, SIZE), CLS_BARE_SOIL, dtype=np.uint8)

    # --- agricultural fields (vegetation) ---
    fields = [(40, 40, 190, 150), (210, 30, 330, 120), (30, 330, 160, 470)]
    for (x0, y0, x1, y1) in fields:
        cv2.rectangle(labels, (x0, y0), (x1, y1), CLS_VEGETATION, thickness=-1)
    cv2.ellipse(labels, (410, 400), (70, 55), 20.0, 0.0, 360.0, CLS_VEGETATION, -1)

    # --- reservoir (water) ---
    reservoir_axes = (58, 42) if epoch == 1 else (44, 30)  # shrinks by epoch 2
    cv2.ellipse(labels, (150, 240), reservoir_axes, 15.0, 0.0, 360.0, CLS_WATER, -1)

    # --- river (water) ---
    ys = np.arange(0, SIZE, 4)
    xs = (330 + 38 * np.sin(ys / 70.0)).astype(np.int32)
    river = np.stack([xs, ys.astype(np.int32)], axis=1)
    cv2.polylines(labels, [river], isClosed=False, color=CLS_WATER, thickness=9)

    # --- urban core ---
    _draw_urban_block(labels, 250, 200, 360, 300, rng)

    # --- epoch-2 known changes ---
    if epoch == 2:
        # 1. Urban expansion onto former bare soil / field edge.
        _draw_urban_block(labels, 360, 200, 440, 290, rng)
        # 2. New settlement replacing part of a vegetated field.
        _draw_urban_block(labels, 60, 60, 140, 130, rng)
        # 3. Newly irrigated land turning bare soil into cropland.
        cv2.rectangle(labels, (200, 380), (300, 470), CLS_VEGETATION, thickness=-1)

    return labels


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def render_optical(labels: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Render a 6-band optical scene from a class map.

    Returns:
        ``(6, H, W)`` uint16 array, reflectance scaled by 10000.
    """
    h, w = labels.shape
    out = np.zeros((len(BAND_NAMES), h, w), dtype=np.float32)

    for cls, refl in REFLECTANCE.items():
        mask = labels == cls
        if not mask.any():
            continue
        sigma = TEXTURE[cls]
        for b, value in enumerate(refl):
            noise = rng.normal(0.0, sigma * value, size=int(mask.sum())).astype(np.float32)
            out[b][mask] = value + noise

    # Mild illumination gradient — real scenes are never perfectly flat-fielded.
    gy, gx = np.mgrid[0:h, 0:w].astype(np.float32)
    gradient = 1.0 + 0.04 * ((gx / w) - 0.5) + 0.03 * ((gy / h) - 0.5)
    out *= gradient[None, :, :]

    # Sensor blur, so class edges are not unrealistically crisp.
    for b in range(out.shape[0]):
        out[b] = cv2.GaussianBlur(out[b], (3, 3), 0.7)

    np.clip(out, 0.0, 1.2, out=out)
    return (out * REFLECTANCE_SCALE).astype(np.uint16)


def render_sar(labels: np.ndarray, rng: np.random.Generator, looks: int = 6) -> np.ndarray:
    """Render a single-band SAR VV scene in dB, with realistic multiplicative speckle.

    Speckle for an ``looks``-look intensity image is Gamma distributed with shape
    ``looks`` and mean 1 — modelling it multiplicatively in linear power (not additively
    in dB) is what makes the Lee filter a meaningful thing to run downstream.
    """
    h, w = labels.shape
    linear = np.zeros((h, w), dtype=np.float32)
    for cls, db in SAR_DB.items():
        mask = labels == cls
        if mask.any():
            linear[mask] = 10.0 ** (db / 10.0)

    speckle = rng.gamma(shape=looks, scale=1.0 / looks, size=(h, w)).astype(np.float32)
    linear *= speckle
    linear = cv2.GaussianBlur(linear, (3, 3), 0.5)  # system impulse response
    linear = np.maximum(linear, 1e-6)
    return (10.0 * np.log10(linear)).astype(np.float32)


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------
def write_raster(
    path: Path,
    array: np.ndarray,
    *,
    transform: Affine,
    epsg: int | None,
    descriptions: tuple[str, ...] | None = None,
    tags: dict[str, str] | None = None,
    nodata: float | None = None,
) -> None:
    """Write a (bands, H, W) or (H, W) array as a GeoTIFF."""
    if array.ndim == 2:
        array = array[None, :, :]
    count, height, width = array.shape
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        path, "w", driver="GTiff", height=height, width=width, count=count,
        dtype=array.dtype, crs=CRS.from_epsg(epsg) if epsg else None,
        transform=transform, nodata=nodata, compress="deflate",
    ) as ds:
        ds.write(array)
        if descriptions:
            for i, name in enumerate(descriptions[:count], start=1):
                ds.set_band_description(i, name)
        if tags:
            ds.update_tags(**tags)


def write_quicklook_png(path: Path, optical: np.ndarray) -> None:
    """Write a plain RGB PNG with no georeferencing.

    Used to prove the system refuses to invent coordinates for ordinary images.
    """
    rgb = optical[[2, 1, 0]].astype(np.float32)  # red, green, blue
    lo = np.percentile(rgb, 2.0)
    hi = np.percentile(rgb, 98.0)
    stretched = np.clip((rgb - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    img = (stretched * 255).astype(np.uint8).transpose(1, 2, 0)
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))


def write_edge_cases(root: Path) -> list[str]:
    """Create the malformed and mismatched inputs the edge-case tests require (brief §23)."""
    root.mkdir(parents=True, exist_ok=True)
    created: list[str] = []
    rng = np.random.default_rng(SEED + 99)
    labels = build_label_map(rng, epoch=1)
    optical = render_optical(labels, rng)

    # Zero-byte file.
    (root / "empty.tif").write_bytes(b"")
    created.append("empty.tif")

    # Valid TIFF header, truncated body.
    tmp = root / "_full.tif"
    write_raster(tmp, optical, transform=base_transform(), epsg=UTM_EPSG,
                 descriptions=BAND_NAMES)
    blob = tmp.read_bytes()
    (root / "corrupt.tif").write_bytes(blob[: len(blob) // 3])
    tmp.unlink()
    created.append("corrupt.tif")

    # Not an image at all, despite a plausible extension.
    (root / "not_an_image.pdf").write_bytes(b"%PDF-1.4\n% not really a pdf\n")
    created.append("not_an_image.pdf")

    # Same scene in a geographic CRS -> exercises reprojection.
    deg = 10.0 / 111_320.0
    write_raster(
        root / "different_crs.tif", optical,
        transform=Affine(deg, 0, 77.5, 0, -deg, 18.9), epsg=4326,
        descriptions=BAND_NAMES,
    )
    created.append("different_crs.tif")

    # Coarser resolution -> exercises safe resampling.
    coarse = optical[:, ::2, ::2]
    write_raster(root / "different_res.tif", coarse,
                 transform=base_transform(PIXEL_M * 2), epsg=UTM_EPSG,
                 descriptions=BAND_NAMES)
    created.append("different_res.tif")

    # Far-away extent -> must be rejected for pair analysis, not silently compared.
    write_raster(
        root / "disjoint_extent.tif", optical,
        transform=Affine(PIXEL_M, 0, ORIGIN_X + 500_000, 0, -PIXEL_M, ORIGIN_Y + 500_000),
        epsg=UTM_EPSG, descriptions=BAND_NAMES,
    )
    created.append("disjoint_extent.tif")

    # RGB only -> no NIR, so NDVI/NDWI are impossible and the system must degrade
    # gracefully with a warning instead of faking an index.
    write_raster(root / "rgb_only.tif", optical[[2, 1, 0]],
                 transform=base_transform(), epsg=UTM_EPSG,
                 descriptions=("red", "green", "blue"))
    created.append("rgb_only.tif")

    # Georeference absent entirely.
    write_raster(root / "no_georeference.tif", optical, transform=Affine.identity(),
                 epsg=None, descriptions=BAND_NAMES)
    created.append("no_georeference.tif")

    return created


def class_pixel_counts(labels: np.ndarray) -> dict[str, int]:
    return {
        CLASS_NAMES[c]: int((labels == c).sum())
        for c in sorted(CLASS_NAMES)
        if (labels == c).any()
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate SatQuery AI demo data")
    parser.add_argument("--out", type=Path, default=DEMO_ROOT)
    parser.add_argument("--force", action="store_true", help="overwrite existing output")
    args = parser.parse_args(argv)

    out: Path = args.out
    if out.exists() and any(out.iterdir()) and not args.force:
        print(f"[skip] {out} already populated; pass --force to regenerate")
        return 0
    if out.exists() and args.force:
        shutil.rmtree(out)

    rng = np.random.default_rng(SEED)
    transform = base_transform()
    geo_tags_t1 = {"ACQUISITION_DATE": "2024-01-15", "SENSOR": "synthetic-optical-6band"}
    geo_tags_t2 = {"ACQUISITION_DATE": "2025-01-20", "SENSOR": "synthetic-optical-6band"}

    # --- epoch 1 (also the single-image demo scene) ---
    labels_t1 = build_label_map(rng, epoch=1)
    optical_t1 = render_optical(labels_t1, rng)
    sar_t1 = render_sar(labels_t1, rng)

    # --- epoch 2 ---
    rng2 = np.random.default_rng(SEED + 1)
    labels_t2 = build_label_map(rng2, epoch=2)
    optical_t2 = render_optical(labels_t2, rng2)

    opt_dir, sar_dir, tmp_dir = out / "optical", out / "sar", out / "temporal"

    write_raster(opt_dir / "scene_optical.tif", optical_t1, transform=transform,
                 epsg=UTM_EPSG, descriptions=BAND_NAMES, tags=geo_tags_t1)
    write_raster(opt_dir / "scene_landcover_gt.tif", labels_t1, transform=transform,
                 epsg=UTM_EPSG, descriptions=("landcover_class",))
    write_quicklook_png(opt_dir / "scene_quicklook.png", optical_t1)

    write_raster(sar_dir / "scene_sar_vv.tif", sar_t1, transform=transform,
                 epsg=UTM_EPSG, descriptions=("vv",),
                 tags={"SENSOR": "synthetic-SAR-VV", "UNIT": "dB",
                       "ACQUISITION_DATE": "2024-01-16"})

    write_raster(tmp_dir / "scene_t1_optical.tif", optical_t1, transform=transform,
                 epsg=UTM_EPSG, descriptions=BAND_NAMES, tags=geo_tags_t1)
    write_raster(tmp_dir / "scene_t2_optical.tif", optical_t2, transform=transform,
                 epsg=UTM_EPSG, descriptions=BAND_NAMES, tags=geo_tags_t2)
    write_raster(tmp_dir / "scene_t1_landcover_gt.tif", labels_t1, transform=transform,
                 epsg=UTM_EPSG, descriptions=("landcover_class",))
    write_raster(tmp_dir / "scene_t2_landcover_gt.tif", labels_t2, transform=transform,
                 epsg=UTM_EPSG, descriptions=("landcover_class",))

    change_gt = (labels_t1 != labels_t2).astype(np.uint8)
    write_raster(tmp_dir / "change_gt.tif", change_gt, transform=transform,
                 epsg=UTM_EPSG, descriptions=("changed",))

    edge_cases = write_edge_cases(out / "edge_cases")

    pixel_area = PIXEL_M * PIXEL_M
    manifest = {
        "generator": "scripts/generate_demo_data.py",
        "seed": SEED,
        "note": (
            "Synthetic imagery with exactly-known ground truth. Spectral and backscatter "
            "signatures follow published class behaviour so indices and fusion behave as "
            "they would on real scenes. These are NOT real satellite acquisitions and the "
            "coordinates are illustrative."
        ),
        "grid": {
            "width": SIZE, "height": SIZE, "pixel_size_m": PIXEL_M,
            "crs": f"EPSG:{UTM_EPSG}", "pixel_area_m2": pixel_area,
            "transform": list(base_transform())[:6],
            "bounds": [ORIGIN_X, ORIGIN_Y - SIZE * PIXEL_M,
                       ORIGIN_X + SIZE * PIXEL_M, ORIGIN_Y],
        },
        "optical_bands": list(BAND_NAMES),
        "class_codes": {str(k): v for k, v in CLASS_NAMES.items()},
        "reflectance": {CLASS_NAMES[k]: list(v) for k, v in REFLECTANCE.items()},
        "sar_backscatter_db": {CLASS_NAMES[k]: v for k, v in SAR_DB.items()},
        "ground_truth": {
            "t1_class_pixels": class_pixel_counts(labels_t1),
            "t2_class_pixels": class_pixel_counts(labels_t2),
            "t1_class_area_m2": {k: v * pixel_area
                                 for k, v in class_pixel_counts(labels_t1).items()},
            "changed_pixels": int(change_gt.sum()),
            "changed_area_m2": float(change_gt.sum() * pixel_area),
            "changed_fraction": float(change_gt.mean()),
        },
        "known_changes": [
            "urban expansion east of the existing built-up core (bare soil -> built-up)",
            "new settlement replacing part of the north-west field (vegetation -> built-up)",
            "reservoir shrinkage (water -> bare soil)",
            "newly irrigated cropland in the south (bare soil -> vegetation)",
        ],
        "edge_cases": edge_cases,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"[ok] demo data written to {out}")
    print(f"     changed pixels: {manifest['ground_truth']['changed_pixels']} "
          f"({manifest['ground_truth']['changed_fraction'] * 100:.2f}%)")
    for name, count in manifest["ground_truth"]["t1_class_pixels"].items():
        print(f"     t1 {name:<13} {count:>7} px")
    return 0


if __name__ == "__main__":
    sys.exit(main())
