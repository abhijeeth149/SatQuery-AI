"""Shared spatial feature extraction: texture, morphology, linearity.

Spectral indices answer *what a pixel is made of*; these answer *how it is arranged*. That
distinction is what separates built-up land from bare soil, which have similar reflectance
but very different spatial structure — roofs, roads and shadows produce high local variance,
while a ploughed field does not.
"""
from __future__ import annotations

import cv2
import numpy as np


def _fill_invalid(band: np.ndarray) -> np.ndarray:
    """Replace non-finite pixels with the band median so OpenCV kernels behave."""
    finite = np.isfinite(band)
    if not finite.any():
        return np.zeros_like(band, dtype=np.float32)
    return np.where(finite, band, float(np.median(band[finite]))).astype(np.float32)


def normalize01(band: np.ndarray, lo_pct: float = 1.0, hi_pct: float = 99.0) -> np.ndarray:
    """Percentile-stretch to ``[0, 1]``, preserving NaN."""
    finite = band[np.isfinite(band)]
    if finite.size == 0:
        return np.zeros_like(band, dtype=np.float32)
    lo, hi = np.percentile(finite, [lo_pct, hi_pct])
    if hi - lo < 1e-12:
        return np.zeros_like(band, dtype=np.float32)
    out = (band - lo) / (hi - lo)
    return np.clip(out, 0.0, 1.0).astype(np.float32)


def local_variance(band: np.ndarray, window: int = 7) -> np.ndarray:
    """Local variance texture via the identity ``Var = E[x²] - E[x]²``.

    Computed with box filters, so cost is independent of window size.
    Returns values normalised to ``[0, 1]``.
    """
    norm = normalize01(_fill_invalid(band))
    ksize = (window, window)
    mean = cv2.blur(norm, ksize)
    mean_sq = cv2.blur(norm * norm, ksize)
    var = np.maximum(mean_sq - mean * mean, 0.0)
    return normalize01(np.sqrt(var))


def edge_density(band: np.ndarray, window: int = 9) -> np.ndarray:
    """Fraction of edge pixels in a neighbourhood, normalised to ``[0, 1]``.

    Uses Canny on an 8-bit stretch, then a box filter to get local density. Dense edges
    indicate man-made structure; smooth areas indicate water, crops or bare ground.
    """
    norm = normalize01(_fill_invalid(band))
    u8 = (norm * 255).astype(np.uint8)
    # Otsu supplies a scene-adaptive high threshold so the detector is not tuned to
    # one particular brightness range.
    high, _ = cv2.threshold(u8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    high = float(np.clip(high, 30, 200))
    edges = cv2.Canny(u8, int(high * 0.5), int(high)).astype(np.float32) / 255.0
    return normalize01(cv2.blur(edges, (window, window)))


def linearity(band: np.ndarray, min_length: int = 25) -> np.ndarray:
    """Response map highlighting elongated linear structures (roads, canals).

    Applies a morphological top-hat with long thin structuring elements at several
    orientations and keeps the per-pixel maximum, so a pixel scores highly when it lies on a
    thin bright ridge in *some* direction.
    """
    norm = normalize01(_fill_invalid(band))
    u8 = (norm * 255).astype(np.uint8)
    best = np.zeros_like(u8, dtype=np.float32)
    for angle in (0, 30, 60, 90, 120, 150):
        kernel = _line_kernel(min_length, angle)
        opened = cv2.morphologyEx(u8, cv2.MORPH_OPEN, kernel)
        best = np.maximum(best, opened.astype(np.float32))
    return normalize01(best)


def _line_kernel(length: int, angle_deg: int) -> np.ndarray:
    """Binary structuring element: a line of ``length`` at ``angle_deg``."""
    size = length if length % 2 == 1 else length + 1
    kernel = np.zeros((size, size), dtype=np.uint8)
    center = size // 2
    rad = np.deg2rad(angle_deg)
    dx, dy = np.cos(rad), np.sin(rad)
    for t in np.linspace(-center, center, size * 2):
        x = int(round(center + t * dx))
        y = int(round(center + t * dy))
        if 0 <= x < size and 0 <= y < size:
            kernel[y, x] = 1
    return kernel


def clean_mask(
    mask: np.ndarray,
    *,
    open_radius: int = 2,
    close_radius: int = 2,
    min_area: int = 0,
) -> np.ndarray:
    """Morphologically denoise a binary mask.

    Opening removes isolated speckle (single misclassified pixels); closing fills small
    interior holes. Without this step, threshold noise becomes hundreds of spurious
    one-pixel "detections".
    """
    m: np.ndarray = mask.astype(np.uint8)
    if open_radius > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_radius * 2 + 1,) * 2)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    if close_radius > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_radius * 2 + 1,) * 2)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    if min_area > 0:
        m = remove_small_components(m.astype(bool), min_area).astype(np.uint8)
    return m.astype(bool)


def remove_small_components(mask: np.ndarray, min_area: int) -> np.ndarray:
    """Drop connected components smaller than ``min_area`` pixels."""
    num, labels, stats, _ = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8), connectivity=8
    )
    out = np.zeros_like(mask, dtype=bool)
    for lbl in range(1, num):
        if stats[lbl, cv2.CC_STAT_AREA] >= min_area:
            out |= labels == lbl
    return out


def compactness(mask: np.ndarray) -> float:
    """Mean isoperimetric compactness ``4πA / P²`` of components in ``[0, 1]``.

    ~1 for circles, lower for ragged or elongated shapes. Useful for distinguishing
    field parcels (compact) from river networks (elongated).
    """
    contours, _ = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    scores: list[float] = []
    for c in contours:
        area = cv2.contourArea(c)
        perim = cv2.arcLength(c, True)
        if area > 4 and perim > 1e-6:
            scores.append(float(np.clip(4 * np.pi * area / (perim * perim), 0.0, 1.0)))
    return float(np.mean(scores)) if scores else 0.0


def rectangularity(mask: np.ndarray) -> float:
    """Mean ratio of component area to its minimum-area rotated bounding rectangle.

    Near 1 for rectangular footprints (buildings), lower for organic shapes (lakes).
    """
    contours, _ = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    scores: list[float] = []
    for c in contours:
        area = cv2.contourArea(c)
        if area <= 4:
            continue
        (_, (w, h), _) = cv2.minAreaRect(c)
        rect_area = w * h
        if rect_area > 1e-6:
            scores.append(float(np.clip(area / rect_area, 0.0, 1.0)))
    return float(np.mean(scores)) if scores else 0.0
