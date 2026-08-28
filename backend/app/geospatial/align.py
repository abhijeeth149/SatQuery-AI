"""Bringing rasters onto a common grid, and measuring how well they actually line up.

The important function here is :func:`measure_registration`. The brief forbids claiming that
optical/SAR co-registration is correct without validating it, so alignment quality is
*measured* — via gradient-domain phase correlation plus normalised cross-correlation — and
the measured sub-pixel offset flows into the confidence score. If the images are misaligned,
the system says so.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.warp import reproject

from ..core.errors import ErrorCode, GeospatialError
from ..core.logging import get_logger
from .raster import RasterData, RasterMetadata
from .validate import AlignmentStrategy

logger = get_logger(__name__)

# Resampling choice matters: averaging is right for continuous radiometry when
# downsampling, bilinear for upsampling. Nearest is reserved for label rasters.
_CONTINUOUS_UP = Resampling.bilinear
_CONTINUOUS_DOWN = Resampling.average

# Above this measured offset, any analysis that compares two images pixel-by-pixel starts
# reporting the misalignment itself. One pixel is the natural place to draw the line: below it,
# disagreement along a feature boundary is dominated by genuine mixed pixels, and above it by
# the two grids simply not describing the same ground. Callers share the number but phrase
# their own warning, because what the misalignment corrupts differs — change detection
# over-reports changed area, optical/SAR fusion over-reports sensor conflict.
REGISTRATION_WARN_PX = 1.0


@dataclass
class RegistrationQuality:
    """Measured spatial agreement between two co-located rasters."""

    offset_x: float
    """Estimated horizontal misalignment in pixels (sub-pixel precision)."""

    offset_y: float
    """Estimated vertical misalignment in pixels."""

    phase_response: float
    """Phase-correlation peak strength in ``[0, 1]``; higher means a clearer common signal."""

    ncc: float
    """Normalised cross-correlation of gradient magnitudes in ``[-1, 1]``."""

    score: float
    """Aggregate 0..1 registration quality."""

    warnings: list[str] = field(default_factory=list)

    @property
    def offset_magnitude(self) -> float:
        return math.hypot(self.offset_x, self.offset_y)

    def to_dict(self) -> dict[str, Any]:
        return {
            "offset_x_px": round(self.offset_x, 3),
            "offset_y_px": round(self.offset_y, 3),
            "offset_magnitude_px": round(self.offset_magnitude, 3),
            "phase_response": round(self.phase_response, 4),
            "ncc": round(self.ncc, 4),
            "score": round(self.score, 4),
            "warnings": list(self.warnings),
        }


@dataclass
class AlignmentReport:
    """What was done to bring a raster onto the reference grid."""

    strategy: AlignmentStrategy
    resampling: str
    source_shape: tuple[int, int]
    target_shape: tuple[int, int]
    reprojected: bool
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "strategy": self.strategy.value,
            "resampling": self.resampling,
            "source_shape": list(self.source_shape),
            "target_shape": list(self.target_shape),
            "reprojected": self.reprojected,
            "warnings": list(self.warnings),
        }


def _representative_band(raster: RasterData) -> np.ndarray:
    """A single 2-D band summarising a raster, for correlation-based comparisons.

    Uses the mean across bands (ignoring NaN) so the estimate is not dominated by a single
    noisy channel.
    """
    band = raster.band_mean()
    return np.nan_to_num(band, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)


def _normalize01(a: np.ndarray) -> np.ndarray:
    """Percentile-stretch to ``[0, 1]``, robust to outliers."""
    finite = a[np.isfinite(a)]
    if finite.size == 0:
        return np.zeros_like(a, dtype=np.float32)
    lo, hi = np.percentile(finite, [1.0, 99.0])
    if hi - lo < 1e-12:
        return np.zeros_like(a, dtype=np.float32)
    return np.clip((a - lo) / (hi - lo), 0.0, 1.0).astype(np.float32)


def _gradient_magnitude(a: np.ndarray) -> np.ndarray:
    """Sobel gradient magnitude.

    Comparing gradients rather than raw intensity is what lets optical and SAR imagery be
    correlated at all: their absolute brightness is physically unrelated, but their
    *structural edges* (coastlines, field boundaries, roads) coincide.
    """
    norm = _normalize01(a)
    gx = cv2.Sobel(norm, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(norm, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.magnitude(gx, gy)


def measure_registration(a: RasterData, b: RasterData) -> RegistrationQuality:
    """Measure how well two same-shaped rasters line up.

    Both rasters must already be on a common grid (call :func:`align_to_reference` first).

    Raises:
        GeospatialError: if shapes differ.
    """
    if a.shape != b.shape:
        raise GeospatialError(
            "Registration quality can only be measured after the images share a grid.",
            code=ErrorCode.SIZE_MISMATCH,
            context={"a": list(a.shape), "b": list(b.shape)},
        )

    ga = _gradient_magnitude(_representative_band(a))
    gb = _gradient_magnitude(_representative_band(b))

    # Hanning window suppresses edge effects that otherwise bias phase correlation.
    warnings: list[str] = []
    try:
        window = cv2.createHanningWindow((ga.shape[1], ga.shape[0]), cv2.CV_32F)
        (dx, dy), response = cv2.phaseCorrelate(ga.astype(np.float64),
                                                gb.astype(np.float64),
                                                window.astype(np.float64))
    except cv2.error as exc:  # pragma: no cover - degenerate input
        logger.warning("phase correlation failed", extra={"error": str(exc)})
        dx, dy, response = 0.0, 0.0, 0.0
        warnings.append("Sub-pixel alignment could not be estimated for these images.")

    # NCC on gradient magnitudes: structural agreement independent of brightness scale.
    fa = ga.ravel() - ga.mean()
    fb = gb.ravel() - gb.mean()
    denom = float(np.linalg.norm(fa) * np.linalg.norm(fb))
    ncc = float(np.dot(fa, fb) / denom) if denom > 1e-12 else 0.0

    offset_mag = math.hypot(dx, dy)
    if offset_mag > 5.0:
        warnings.append(
            f"The images appear misaligned by about {offset_mag:.1f} pixels. "
            f"Results near feature boundaries may be unreliable."
        )
    elif offset_mag > 2.0:
        warnings.append(
            f"A residual misalignment of about {offset_mag:.1f} pixels was measured."
        )
    if ncc < 0.15:
        warnings.append(
            "The two images share little common structure, so their co-registration "
            "could not be confirmed."
        )

    # Offsets beyond ~10 px contribute nothing; NCC is clipped at 0 (anti-correlation is
    # no better than no correlation for our purposes).
    offset_term = max(0.0, 1.0 - offset_mag / 10.0)
    score = float(np.clip(0.5 * offset_term + 0.35 * max(ncc, 0.0)
                          + 0.15 * float(np.clip(response, 0.0, 1.0)), 0.0, 1.0))

    return RegistrationQuality(
        offset_x=float(dx), offset_y=float(dy),
        phase_response=float(np.clip(response, 0.0, 1.0)),
        ncc=ncc, score=score, warnings=warnings,
    )


def align_to_reference(
    src: RasterData,
    ref: RasterData,
    strategy: AlignmentStrategy,
) -> tuple[RasterData, AlignmentReport]:
    """Warp/resample ``src`` onto ``ref``'s grid.

    Returns:
        The aligned copy of ``src`` and a report describing what was done.

    Raises:
        GeospatialError: if reprojection fails or the strategy is ``INCOMPATIBLE``.
    """
    warnings: list[str] = []
    src_shape = src.shape

    if strategy is AlignmentStrategy.INCOMPATIBLE:
        raise GeospatialError(
            "The two images cannot be placed on a common grid.",
            code=ErrorCode.NO_SPATIAL_OVERLAP,
        )

    if strategy is AlignmentStrategy.IDENTICAL_GRID and src.shape == ref.shape:
        return src, AlignmentReport(strategy, "none", src_shape, ref.shape, False)

    upsampling = (ref.height * ref.width) > (src.height * src.width)
    resampling = _CONTINUOUS_UP if upsampling else _CONTINUOUS_DOWN

    # --- true reprojection when both sides are georeferenced ---
    if strategy in (AlignmentStrategy.REPROJECT, AlignmentStrategy.RESAMPLE):
        # `is_georeferenced` already implies both transforms are present; binding them here
        # makes that invariant explicit at the point of use instead of implied by a property.
        src_tf, ref_tf = src.metadata.transform, ref.metadata.transform
        if (
            src.metadata.is_georeferenced
            and ref.metadata.is_georeferenced
            and src_tf is not None
            and ref_tf is not None
        ):
            out = np.full((src.data.shape[0], ref.height, ref.width), np.nan, dtype=np.float32)
            try:
                for i in range(src.data.shape[0]):
                    reproject(
                        source=src.data[i],
                        destination=out[i],
                        src_transform=Affine(*src_tf),
                        src_crs=CRS.from_wkt(src.metadata.crs_wkt),
                        dst_transform=Affine(*ref_tf),
                        dst_crs=CRS.from_wkt(ref.metadata.crs_wkt),
                        resampling=resampling,
                        src_nodata=np.nan,
                        dst_nodata=np.nan,
                    )
            except Exception as exc:
                raise GeospatialError(
                    "The second image could not be reprojected onto the first image's "
                    "coordinate system.",
                    code=ErrorCode.REPROJECTION_FAILED,
                    context={"error": str(exc)},
                ) from exc

            aligned = _rebuild(src, out, ref.metadata)
            return aligned, AlignmentReport(
                strategy, resampling.name, src_shape, ref.shape, True, warnings
            )

        warnings.append(
            "Georeferencing was incomplete, so the images were matched by pixel grid "
            "rather than by coordinates."
        )

    # --- pixel-space resize fallback ---
    out = np.empty((src.data.shape[0], ref.height, ref.width), dtype=np.float32)
    interp = cv2.INTER_LINEAR if upsampling else cv2.INTER_AREA
    for i in range(src.data.shape[0]):
        band = src.data[i]
        # cv2 has no NaN handling: substitute, resize, then restore the invalid region.
        nan_mask = ~np.isfinite(band)
        filled = np.where(nan_mask, 0.0, band).astype(np.float32)
        resized = cv2.resize(filled, (ref.width, ref.height), interpolation=interp)
        if nan_mask.any():
            mask_resized = cv2.resize(
                nan_mask.astype(np.float32), (ref.width, ref.height),
                interpolation=cv2.INTER_NEAREST,
            )
            resized = np.where(mask_resized > 0.5, np.nan, resized)
        out[i] = resized

    aligned = _rebuild(src, out, ref.metadata)
    return aligned, AlignmentReport(
        strategy, "bilinear" if upsampling else "area",
        src_shape, ref.shape, False, warnings,
    )


def _rebuild(src: RasterData, data: np.ndarray, ref_meta: RasterMetadata) -> RasterData:
    """Clone ``src`` with new pixel data and the reference grid's geometry.

    Provenance (path, driver, band descriptions) stays with the source; geometry comes from
    the reference, because that is now the grid the data lives on.
    """
    meta = RasterMetadata(
        path=src.metadata.path,
        driver=src.metadata.driver,
        width=int(data.shape[2]),
        height=int(data.shape[1]),
        count=int(data.shape[0]),
        dtype=str(data.dtype),
        crs_wkt=ref_meta.crs_wkt,
        crs_epsg=ref_meta.crs_epsg,
        transform=ref_meta.transform,
        bounds=ref_meta.bounds,
        nodata=src.metadata.nodata,
        band_descriptions=src.metadata.band_descriptions,
        tags=src.metadata.tags,
        decimation=src.metadata.decimation,
    )
    return RasterData(
        data=data, metadata=meta, band_roles=list(src.band_roles), modality=src.modality
    )


def normalize_radiometry(
    target: RasterData, reference: RasterData
) -> tuple[RasterData, list[str]]:
    """Relative radiometric normalisation of ``target`` towards ``reference``.

    Matches per-band mean and standard deviation over jointly-valid pixels. Without this,
    differencing two dates conflates genuine surface change with illumination, atmospheric
    and sensor-gain differences — producing "change" everywhere.

    Returns:
        The normalised copy and any warnings.
    """
    warnings: list[str] = []
    if target.shape != reference.shape:
        raise GeospatialError(
            "Radiometric normalisation requires images on a common grid.",
            code=ErrorCode.SIZE_MISMATCH,
        )
    if target.data.shape[0] != reference.data.shape[0]:
        warnings.append(
            "The two images have different band counts; radiometric normalisation was "
            "applied only to the bands they share."
        )

    n_bands = min(target.data.shape[0], reference.data.shape[0])
    out = target.data.copy()
    joint_valid = target.valid_mask() & reference.valid_mask()

    if np.count_nonzero(joint_valid) < 100:
        warnings.append(
            "Too few jointly valid pixels to normalise brightness between the two images; "
            "differences may partly reflect illumination rather than surface change."
        )
        return target, warnings

    for i in range(n_bands):
        t_vals = target.data[i][joint_valid]
        r_vals = reference.data[i][joint_valid]
        t_std = float(np.std(t_vals))
        r_std = float(np.std(r_vals))
        t_mean = float(np.mean(t_vals))
        r_mean = float(np.mean(r_vals))
        if t_std < 1e-9:
            warnings.append(f"Band {i + 1} of the second image is constant; left unscaled.")
            continue
        if r_std < 1e-9:
            # The gain factor would be r_std/t_std = 0, collapsing the target to the single
            # value `r_mean` — every difference erased, silently, producing a confidently
            # empty change map. A constant reference band carries no radiometric range to
            # match, so only the offset is applied and the target's own contrast is kept.
            warnings.append(
                f"Band {i + 1} of the first image has no variation, so brightness between "
                f"the two images could only be matched on average, not on contrast."
            )
            out[i] = target.data[i] - t_mean + r_mean
            continue
        out[i] = (target.data[i] - t_mean) * (r_std / t_std) + r_mean

    return _rebuild(target, out, target.metadata), warnings
