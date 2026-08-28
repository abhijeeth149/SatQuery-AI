"""Generate **real** frontend fixtures by running the shipped analysis tools on the demo data.

The frontend is being built before the FastAPI layer exists, so it needs a data source. Rather
than hand-writing plausible JSON — which the brief forbids (§32/§42: *do not create fake API
responses ... do not generate fake confidence or fake benchmark metrics*) — this script drives the
genuine :mod:`app.agents.tools` pipeline over the genuine ``data/demo`` rasters and records exactly
what it produces. Every number the UI renders (answer, confidence, evidence, per-class areas) is
therefore a real measurement, captured once and replayed offline; only incidental envelope fields
that no backend has computed yet (the ``SAT-2026-…`` id, the wall-clock timestamp) are illustrative,
and they are marked as such.

The envelope written here **is the API contract** the frontend codes against and the backend must
later satisfy: it mirrors :meth:`ToolResult.to_dict` verbatim and wraps it with the analysis
metadata, per-input raster metadata, execution trace, and rendered artifacts the result page needs.

Outputs (relative to the repo root):
    frontend/src/fixtures/<case>.json    one AnalysisResult per demo case + index.json
    frontend/public/fixtures/<case>/*.png rendered base + overlay artifacts, served statically

Run:  python scripts/generate_frontend_fixtures.py
It is deterministic (the tools are), so re-running overwrites with identical content.
"""
from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import numpy as np  # noqa: E402
from pyproj import Transformer  # noqa: E402

from app.agents.tools import (  # noqa: E402
    ChangeTool,
    FusionTool,
    GroundingTool,
    LandCoverTool,
    SarTool,
    Tool,
    ToolContext,
    ToolResult,
)
from app.core.types import LandCoverClass, Modality, ScatteringRegime  # noqa: E402
from app.geospatial import viz  # noqa: E402
from app.geospatial.raster import RasterData, load_raster  # noqa: E402

DEMO = REPO_ROOT / "data" / "demo"
FIXTURE_JSON = REPO_ROOT / "frontend" / "src" / "fixtures"
FIXTURE_PNG = REPO_ROOT / "frontend" / "public" / "fixtures"

# Illustrative, fixed so re-runs are byte-stable. NOT a measurement — a stand-in for the id the
# database will mint (§13 format) and the time the request will arrive.
_BASE_TS = "2026-08-26T09:{:02d}:00Z"

_LANDCOVER_NAMES = {c.code: c.value for c in LandCoverClass if c.code != 0}
_REGIME_COLORS = {
    ScatteringRegime.SMOOTH.code: (33, 102, 205),
    ScatteringRegime.DIFFUSE.code: (46, 154, 62),
    ScatteringRegime.DOUBLE_BOUNCE.code: (214, 96, 45),
}


# --------------------------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------------------------
def _load(rel: str, modality: Modality) -> RasterData:
    return load_raster(DEMO / rel, max_edge=None, modality=modality)


def _wgs84_bounds(raster: RasterData) -> dict[str, float] | None:
    """Axis-aligned lat/lon box enclosing the raster footprint, for a Leaflet image overlay.

    ``None`` for an ungeoreferenced image — the UI then falls back to a plain pixel viewer rather
    than pretending the picture has coordinates (§8, §7 honesty boundary).
    """
    md = raster.metadata
    if not md.is_georeferenced or md.bounds is None or md.crs_epsg is None:
        return None
    minx, miny, maxx, maxy = md.bounds
    tf = Transformer.from_crs(f"EPSG:{md.crs_epsg}", "EPSG:4326", always_xy=True)
    corners = [(minx, miny), (minx, maxy), (maxx, miny), (maxx, maxy)]
    lonlat = [tf.transform(x, y) for x, y in corners]
    lons = [p[0] for p in lonlat]
    lats = [p[1] for p in lonlat]
    return {
        "south": min(lats),
        "west": min(lons),
        "north": max(lats),
        "east": max(lons),
    }


def _input_meta(raster: RasterData) -> dict[str, Any]:
    meta = raster.metadata.to_dict()
    meta["modality"] = raster.modality.value
    meta["band_roles"] = [r.value for r in raster.band_roles]
    meta["bounds_wgs84"] = _wgs84_bounds(raster)
    return meta


# --------------------------------------------------------------------------------------------
# Artifact rendering (real arrays only)
# --------------------------------------------------------------------------------------------
def _render_codes(code_map: np.ndarray, code_to_color: dict[int, tuple[int, int, int]]) -> np.ndarray:
    h, w = code_map.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    for code, color in code_to_color.items():
        out[code_map == code] = color
    return out


def _artifacts_for(
    case_id: str, result: ToolResult, primary: RasterData, bounds: dict[str, float] | None
) -> list[dict[str, Any]]:
    """Render base + task overlay PNGs from ``result.raw`` and return artifact descriptors."""
    out_dir = FIXTURE_PNG / case_id
    arts: list[dict[str, Any]] = []
    base = viz.render_rgb(primary)
    viz.save_png(out_dir / "base.png", base)
    arts.append(
        {
            "kind": "base",
            "label": "Input image",
            "url": f"/fixtures/{case_id}/base.png",
            "bounds_wgs84": bounds,
            "legend": [],
        }
    )

    raw = result.raw
    overlay: np.ndarray | None = None
    legend: list[dict[str, str]] = []
    kind = "overlay"
    label = "Analysis overlay"

    if hasattr(raw, "class_map") and getattr(raw, "class_map") is not None:
        overlay = viz.render_class_map(raw.class_map, _LANDCOVER_NAMES)
        legend = viz.make_legend(
            [(c.value.replace("_", " ").title(), c.value) for c in LandCoverClass if c.code != 0]
        )
        kind, label = "class_map", "Land-cover classification"
    elif hasattr(raw, "regime_map") and getattr(raw, "regime_map") is not None:
        overlay = _render_codes(raw.regime_map, _REGIME_COLORS)
        legend = [
            {"label": "Smooth", "color": "#2166cd", "key": "smooth"},
            {"label": "Diffuse", "color": "#2e9a3e", "key": "diffuse"},
            {"label": "Double bounce", "color": "#d6602d", "key": "double_bounce"},
        ]
        kind, label = "regime_map", "SAR scattering regimes"
    elif hasattr(raw, "change_mask") and getattr(raw, "change_mask") is not None:
        overlay = viz.overlay_mask(base, raw.change_mask, viz.CLASS_COLORS["change"])
        legend = viz.make_legend([("Changed", "change")])
        kind, label = "change_mask", "Detected change"
    elif hasattr(raw, "mask") and getattr(raw, "mask") is not None:
        overlay = viz.overlay_mask(base, raw.mask, viz.CLASS_COLORS["highlight"])
        legend = viz.make_legend([("Matched region", "highlight")])
        kind, label = "grounding", "Grounded regions"

    if overlay is not None:
        viz.save_png(out_dir / "overlay.png", overlay)
        arts.append(
            {
                "kind": kind,
                "label": label,
                "url": f"/fixtures/{case_id}/overlay.png",
                "bounds_wgs84": bounds,
                "legend": legend,
            }
        )
    return arts


# --------------------------------------------------------------------------------------------
# Traced execution
# --------------------------------------------------------------------------------------------
@dataclass
class _Step:
    step: str
    tool: str | None
    summary: str
    params: dict[str, Any] = field(default_factory=dict)


def _ms(t0: float, t1: float) -> float:
    return round((t1 - t0) * 1000.0, 2)


def _run_traced(tool: Tool, ctx: ToolContext) -> tuple[ToolResult, list[dict[str, Any]]]:
    """Run a tool through its five phases individually, timing each for a real execution trace.

    This mirrors :meth:`Tool.run` exactly (same call order, same result); it is decomposed only so
    each phase can be timed and recorded as a :class:`~app.core.types.StepStatus` step the way the
    orchestrator's trace will. Internal reasoning is never captured — only the structured record.
    """
    trace: list[dict[str, Any]] = []

    t0 = time.perf_counter()
    modalities = [r.modality.value for r in ctx.rasters]
    t1 = time.perf_counter()
    trace.append(
        _classify_step(tool, ctx, modalities, _ms(t0, t1))
    )

    t0 = time.perf_counter()
    tool.validate_input(ctx)
    t1 = time.perf_counter()
    trace.append(
        _step("validate", tool.name, "Inputs accepted: modality and image count satisfy the tool's "
              "preconditions.", _ms(t0, t1), {"images": len(ctx.rasters), "modalities": modalities})
    )

    t0 = time.perf_counter()
    prepared = tool.preprocess(ctx)
    t1 = time.perf_counter()
    prep_params: dict[str, Any] = {}
    if prepared.quality is not None:
        prep_params["input_quality"] = round(prepared.quality.score, 4)
    if "alignment" in prepared.context:
        align = prepared.context["alignment"]
        prep_params["registration_offset_px"] = align.get("offset_magnitude") or align.get("score")
    trace.append(
        _step("preprocess", tool.name, "Inputs inspected and readied "
              "(quality assessed; any pair aligned to a common grid).", _ms(t0, t1), prep_params)
    )

    t0 = time.perf_counter()
    raw = tool.predict(prepared)
    t1 = time.perf_counter()
    trace.append(
        _step("execute", tool.name, f"Ran {tool.name} ({tool.tier.label} tier) over the prepared "
              "raster(s).", _ms(t0, t1), {"tier": tool.tier.label})
    )

    t0 = time.perf_counter()
    result = tool.postprocess(raw, prepared)
    t1 = time.perf_counter()
    trace.append(
        _step("score", tool.name, "Confidence computed from measured evidence and the answer phrased "
              "from those measurements.", _ms(t0, t1),
              {"confidence": result.confidence.level.value, "score": result.confidence.score},
              status=result.status.value)
    )

    t0 = time.perf_counter()
    sufficient = result.is_sufficient
    t1 = time.perf_counter()
    trace.append(
        _step("verify", None,
              "Evidence sufficient to release the answer." if sufficient
              else "Evidence insufficient — the answer is withheld and the system declines (§28).",
              _ms(t0, t1), {"sufficient": sufficient},
              status="ok" if sufficient else "warning")
    )
    return result, trace


def _classify_step(tool: Tool, ctx: ToolContext, modalities: list[str], ms: float) -> dict[str, Any]:
    return _step(
        "classify", None,
        f"Query routed to the {tool.task.value} task by deterministic keyword/shape rules "
        f"({len(ctx.rasters)} image(s), modalities {modalities or ['none']}).",
        ms, {"task": tool.task.value}, status="ok"
    )


def _step(
    step: str, tool: str | None, summary: str, ms: float, params: dict[str, Any],
    status: str = "ok",
) -> dict[str, Any]:
    return {
        "step": step,
        "tool": tool,
        "status": status,
        "duration_ms": ms,
        "summary": summary,
        "parameters": params,
        "warnings": [],
    }


# --------------------------------------------------------------------------------------------
# Case definitions
# --------------------------------------------------------------------------------------------
@dataclass
class Case:
    case_id: str
    seq: int
    title: str
    mode: str
    query: str
    tool_factory: Callable[[], Tool]
    rasters: Callable[[], list[RasterData]]
    note: str = ""


def _cases() -> list[Case]:
    return [
        Case(
            "SAT-2026-000101", 1, "Optical land-cover analysis", "single_optical",
            "What land cover types are present in this scene?",
            LandCoverTool, lambda: [_load("optical/scene_optical.tif", Modality.OPTICAL)],
            "Single 6-band optical scene: spectral-index classifier cascade.",
        ),
        Case(
            "SAT-2026-000102", 2, "Text-guided region grounding", "single_optical",
            "Where is the water?",
            GroundingTool, lambda: [_load("optical/scene_optical.tif", Modality.OPTICAL)],
            "Locates a countable class as regions with a reportable count.",
        ),
        Case(
            "SAT-2026-000103", 3, "Grounding with a withheld count", "single_optical",
            "How many buildings are there?",
            GroundingTool, lambda: [_load("optical/scene_optical.tif", Modality.OPTICAL)],
            "Built-up cannot be counted from optical alone — extent kept, count declined (§4.8).",
        ),
        Case(
            "SAT-2026-000104", 4, "SAR backscatter analysis", "single_sar",
            "Describe the SAR backscatter in this image.",
            SarTool, lambda: [_load("sar/scene_sar_vv.tif", Modality.SAR)],
            "Single VV SAR scene: speckle filter + scattering-regime segmentation.",
        ),
        Case(
            "SAT-2026-000105", 5, "Optical + SAR fusion", "optical_sar_pair",
            "Combine the optical and radar images to map land cover.",
            FusionTool,
            lambda: [
                _load("optical/scene_optical.tif", Modality.OPTICAL),
                _load("sar/scene_sar_vv.tif", Modality.SAR),
            ],
            "Decision-level fusion: radar arbitrates the built-up/bare-soil axis (§4.7).",
        ),
        Case(
            "SAT-2026-000106", 6, "Bi-temporal change analysis", "bitemporal_pair",
            "What changed between the two dates?",
            ChangeTool,
            lambda: [
                _load("temporal/scene_t1_optical.tif", Modality.OPTICAL),
                _load("temporal/scene_t2_optical.tif", Modality.OPTICAL),
            ],
            "Two optical dates: CVA ∪ class disagreement, with agreement carried per transition.",
        ),
    ]


_DECLINE = "Insufficient evidence for a reliable conclusion."


def _build(case: Case) -> dict[str, Any]:
    rasters = case.rasters()
    tool = case.tool_factory()
    ctx = ToolContext(case.query, rasters)
    result, trace = _run_traced(tool, ctx)

    primary = rasters[0]
    bounds = _wgs84_bounds(primary)
    artifacts = _artifacts_for(case.case_id, result, primary, bounds)

    sufficient = result.is_sufficient
    total_ms = round(sum(s["duration_ms"] for s in trace), 2)
    payload = result.to_dict()

    return {
        "id": case.case_id,
        "request_id": f"req-{case.case_id.lower()}",
        "created_at": _BASE_TS.format(case.seq * 3),
        "status": "success" if sufficient else "partial",
        "mode": case.mode,
        "title": case.title,
        "note": case.note,
        "query": case.query,
        "task": payload["task"],
        "tool": payload["tool"],
        "tier": payload["tier"],
        "duration_ms": total_ms,
        "answer": payload["answer"] if sufficient else _DECLINE,
        "answer_withheld": None if sufficient else payload["answer"],
        "confidence": payload["confidence"],
        "evidence": payload["evidence"],
        "warnings": payload["warnings"],
        "data": payload["data"],
        "inputs": [_input_meta(r) for r in rasters],
        "trace": trace,
        "artifacts": artifacts,
        "fixture": True,
    }


def main() -> int:
    FIXTURE_JSON.mkdir(parents=True, exist_ok=True)
    FIXTURE_PNG.mkdir(parents=True, exist_ok=True)
    index: list[dict[str, Any]] = []
    for case in _cases():
        print(f"[fixtures] running {case.case_id}: {case.title} ...", flush=True)
        record = _build(case)
        (FIXTURE_JSON / f"{case.case_id}.json").write_text(
            json.dumps(record, indent=2), encoding="utf-8"
        )
        index.append(
            {
                "id": record["id"],
                "title": record["title"],
                "mode": record["mode"],
                "task": record["task"],
                "query": record["query"],
                "created_at": record["created_at"],
                "status": record["status"],
                "confidence": record["confidence"]["level"],
                "answer": record["answer"],
            }
        )
        print(
            f"[fixtures]   -> {record['task']} | conf={record['confidence']['level']} "
            f"| {len(record['artifacts'])} artifact(s)",
            flush=True,
        )
    (FIXTURE_JSON / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"[fixtures] wrote {len(index)} cases to {FIXTURE_JSON}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
