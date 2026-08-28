"""Tests for the router: classifier verdict + input modalities -> a dispatch decision (§5, §9).

Four parts, mirroring what the router owns:

* **input defaults** — an ``UNKNOWN`` query is defaulted from the images (one optical -> land cover,
  one radar -> SAR, two non-radar -> change, optical+SAR -> fusion), and declined for clarification
  when the images fit no analysis (none, two radar, three or more);
* **recognised pass-through** — a task named by the text is dispatched as-is, and a recognised task
  overrides any input default (the words win over the images when both point somewhere);
* **the one input override** — a general "what do you see / describe this" query whose only input is
  a single SAR image is re-pointed to SAR analysis, while grounding and land-cover queries are not;
* **the decision object** — source, reason, clarification flag and serialisation.

Inputs are real :class:`RasterData` built in memory (the router reads only ``.modality``), so the
tests use the same type the orchestrator passes rather than a stand-in.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from app.agents.classifier import Classification, classify
from app.agents.router import RouteDecision, RouteSource, route
from app.core.types import BandRole, Modality, QueryTask
from app.geospatial.raster import RasterData, RasterMetadata


# ---------------------------------------------------------------------------
# In-memory rasters of a chosen modality (only .modality is read by the router)
# ---------------------------------------------------------------------------
def _raster(modality: Modality) -> RasterData:
    meta = RasterMetadata(
        path=Path(f"{modality.value}.tif"),
        driver="GTiff",
        width=4,
        height=4,
        count=1,
        dtype="float32",
        crs_wkt=None,
        crs_epsg=None,
        transform=None,
        bounds=None,
        nodata=None,
    )
    return RasterData(
        data=np.zeros((1, 4, 4), dtype=np.float32),
        metadata=meta,
        band_roles=[BandRole.GRAY],
        modality=modality,
    )


def opt() -> RasterData:
    return _raster(Modality.OPTICAL)


def sar() -> RasterData:
    return _raster(Modality.SAR)


def unk() -> RasterData:
    return _raster(Modality.UNKNOWN)


# ---------------------------------------------------------------------------
# Input-aware defaults for an UNKNOWN query (§9)
# ---------------------------------------------------------------------------
class TestInputDefaults:
    def test_empty_query_one_optical_defaults_to_land_cover(self):
        d = route("", [opt()])
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT
        assert d.is_resolved
        assert not d.needs_clarification

    def test_vague_query_one_optical_defaults_to_land_cover(self):
        # "hello there" carries no task signal -> UNKNOWN -> defaulted from the single optical image.
        d = route("hello there, nice picture", [opt()])
        assert d.classification.task is QueryTask.UNKNOWN  # the text alone recognised nothing
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_one_sar_defaults_to_sar_analysis(self):
        d = route("", [sar()])
        assert d.task is QueryTask.OPTICAL_SAR_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_one_unknown_modality_is_treated_as_optical(self):
        d = route("", [unk()])
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_two_optical_defaults_to_change(self):
        d = route("", [opt(), opt()])
        assert d.task is QueryTask.CHANGE_DETECTION
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_optical_and_unknown_defaults_to_change(self):
        # No radar present, so the pair is compared for change (an unknown side is treated optical).
        d = route("", [opt(), unk()])
        assert d.task is QueryTask.CHANGE_DETECTION

    def test_optical_and_sar_defaults_to_fusion(self):
        d = route("", [opt(), sar()])
        assert d.task is QueryTask.OPTICAL_SAR_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_no_image_is_unresolved(self):
        d = route("", [])
        assert d.task is QueryTask.UNKNOWN
        assert d.source is RouteSource.UNRESOLVED
        assert d.needs_clarification
        assert not d.is_resolved

    def test_two_sar_images_are_unresolved(self):
        d = route("", [sar(), sar()])
        assert d.source is RouteSource.UNRESOLVED
        assert d.needs_clarification
        assert "SAR change detection is not implemented" in d.reason

    def test_sar_beside_unknown_is_unresolved(self):
        d = route("", [sar(), unk()])
        assert d.source is RouteSource.UNRESOLVED
        assert "undetermined type" in d.reason

    def test_three_images_are_unresolved(self):
        d = route("", [opt(), opt(), opt()])
        assert d.source is RouteSource.UNRESOLVED
        assert d.needs_clarification
        assert "more than two" in d.reason


# ---------------------------------------------------------------------------
# Recognised tasks pass through; the text wins over the input default
# ---------------------------------------------------------------------------
class TestRecognisedPassThrough:
    def test_land_cover_query_passes_through(self):
        d = route("classify the land cover", [opt()])
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.CLASSIFIER
        assert "matched:" in d.reason  # the reason cites the evidence behind the task

    def test_recognised_task_beats_the_input_default(self):
        # Two optical images would default to change, but an explicit land-cover query wins.
        d = route("classify the land cover", [opt(), opt()])
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.CLASSIFIER

    def test_change_question_routes_to_change_vqa(self):
        d = route("what changed between the two dates?", [opt(), opt()])
        assert d.task is QueryTask.CHANGE_VQA
        assert d.source is RouteSource.CLASSIFIER

    def test_change_command_routes_to_change_detection(self):
        d = route("show me the change", [opt(), opt()])
        assert d.task is QueryTask.CHANGE_DETECTION
        assert d.source is RouteSource.CLASSIFIER

    def test_sar_query_on_sar_input_is_classifier_not_override(self):
        # The text already names SAR analysis, so this is a plain recognition, not an input override.
        d = route("analyse the backscatter", [sar()])
        assert d.task is QueryTask.OPTICAL_SAR_ANALYSIS
        assert d.source is RouteSource.CLASSIFIER

    def test_unimplemented_task_passes_through_for_the_registry_to_refuse(self):
        # The router does not refuse object detection itself; it routes it and the registry declines.
        d = route("detect all the ships and count them", [opt()])
        assert d.task is QueryTask.OBJECT_DETECTION
        assert d.source is RouteSource.CLASSIFIER
        assert d.is_resolved  # "resolved" means routed, not that a tool exists

    def test_report_generation_passes_through(self):
        d = route("generate a full analysis report", [opt()])
        assert d.task is QueryTask.REPORT_GENERATION
        assert d.source is RouteSource.CLASSIFIER


# ---------------------------------------------------------------------------
# The single input override: general description + lone SAR image -> SAR analysis
# ---------------------------------------------------------------------------
class TestInputOverride:
    def test_vqa_on_a_lone_sar_image_is_re_pointed_to_sar(self):
        d = route("what do you see in this image", [sar()])
        assert d.task is QueryTask.OPTICAL_SAR_ANALYSIS
        assert d.source is RouteSource.INPUT_OVERRIDE
        assert "SAR" in d.reason and "radar" in d.reason.lower()

    def test_captioning_on_a_lone_sar_image_is_re_pointed_to_sar(self):
        d = route("describe this image", [sar()])
        assert d.task is QueryTask.OPTICAL_SAR_ANALYSIS
        assert d.source is RouteSource.INPUT_OVERRIDE

    def test_grounding_on_sar_is_not_overridden(self):
        # A specific optical product is not silently swapped; it passes through to an honest refusal.
        d = route("where is the water", [sar()])
        assert d.task is QueryTask.GROUNDING
        assert d.source is RouteSource.CLASSIFIER

    def test_land_cover_on_sar_is_not_overridden(self):
        d = route("classify the land cover", [sar()])
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.CLASSIFIER

    def test_vqa_on_optical_is_not_overridden(self):
        d = route("what do you see in this image", [opt()])
        assert d.task is QueryTask.VQA
        assert d.source is RouteSource.CLASSIFIER

    def test_override_requires_a_single_sar_image(self):
        # Two SAR images do not trigger the single-image override; VQA passes through instead.
        d = route("what do you see in this image", [sar(), sar()])
        assert d.task is QueryTask.VQA
        assert d.source is RouteSource.CLASSIFIER


# ---------------------------------------------------------------------------
# The decision object
# ---------------------------------------------------------------------------
class TestRouteDecision:
    def test_injected_classification_is_used_without_reclassifying(self):
        # A pre-computed UNKNOWN classification + one optical image still defaults to land cover,
        # proving route() honours the injected verdict rather than re-reading the (here mismatched) text.
        injected = Classification(QueryTask.UNKNOWN, 0.0)
        d = route("classify the land cover", [opt()], classification=injected)
        assert d.classification is injected
        assert d.task is QueryTask.LAND_COVER_ANALYSIS
        assert d.source is RouteSource.INPUT_DEFAULT

    def test_to_dict_carries_the_decision_and_the_classification(self):
        d = route("classify the land cover", [opt()])
        payload = d.to_dict()
        assert payload["task"] == QueryTask.LAND_COVER_ANALYSIS.value
        assert payload["source"] == RouteSource.CLASSIFIER.value
        assert payload["needs_clarification"] is False
        assert isinstance(payload["reason"], str) and payload["reason"]
        # The raw text verdict is nested for the trace.
        assert payload["classification"]["task"] == QueryTask.LAND_COVER_ANALYSIS.value
        assert payload["classification"]["recognized"] is True

    def test_routing_is_deterministic(self):
        first = route("what do you see", [sar()])
        second = route("what do you see", [sar()])
        assert first == second

    def test_default_classification_matches_classify(self):
        # With no injected classification, route() runs the classifier itself.
        query = "detect all the ships"
        d = route(query, [opt()])
        assert d.classification == classify(query)
