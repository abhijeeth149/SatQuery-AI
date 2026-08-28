"""Bi-temporal change analysis wrapped as a :class:`~app.agents.tools.base.Tool` (brief §3, §17).

This is the first *pair* tool, and it owns the step the change service deliberately does not:
bringing the two dates onto a common grid. :func:`app.services.change.detect_change` refuses a
shape mismatch rather than guessing an alignment, so the tool runs
:func:`~app.geospatial.validate.check_pair_compatibility` first — which decides whether the scenes
may be compared at all and, if so, how — then :func:`~app.geospatial.validate.require_compatible`
(an honest refusal when they do not overlap) and :func:`~app.geospatial.align.align_to_reference`
(a no-op for an identical grid, a reprojection/resample otherwise). Only then does it difference the
dates.

It serves both :attr:`QueryTask.CHANGE_DETECTION` ("show the change") and
:attr:`QueryTask.CHANGE_VQA` ("what changed?"): the same measurement answers both moods, and the
registry maps both tasks here. The answer is phrased from the measured changed fraction, the
dominant land-cover transition and the two-detector corroboration — never asserted beyond what the
:class:`~app.services.change.ChangeResult` contains.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

from ...core.errors import ErrorCode, ValidationError
from ...core.types import InputMode, LandCoverClass, Modality, QueryTask
from ...geospatial.align import align_to_reference
from ...geospatial.validate import (
    assess_quality,
    check_pair_compatibility,
    require_compatible,
)
from ...services import confidence
from ...services.change import detect_change
from .base import Prepared, Tool, ToolContext, ToolResult, ToolTier

if TYPE_CHECKING:
    from ...services.change import ChangeResult


def _pretty(label: LandCoverClass) -> str:
    return label.value.replace("_", " ")


class ChangeTool(Tool):
    """Compare two co-registered dates of the same area and describe what changed."""

    task: ClassVar[QueryTask] = QueryTask.CHANGE_DETECTION
    name: ClassVar[str] = "change-cva-cv"
    tier: ClassVar[ToolTier] = ToolTier.CLASSICAL
    summary: ClassVar[str] = (
        "Bi-temporal change analysis combining spectral change-vector analysis with land-cover "
        "disagreement, after aligning the two dates to a common grid and measuring registration."
    )

    # Two images of the same sensor family. An optical+SAR pair normalises to
    # OPTICAL_SAR_PAIR, which this contract excludes — that is a cross-modal question.
    supported_modes: ClassVar[tuple[InputMode, ...]] = (InputMode.BITEMPORAL_PAIR,)
    min_images: ClassVar[int] = 2
    max_images: ClassVar[int] = 2
    required_modalities: ClassVar[frozenset[Modality]] = frozenset()

    def validate_input(self, ctx: ToolContext) -> None:
        ctx.expect_count(2, self.task)
        a, b = ctx.rasters
        # Bi-temporal change compares one sensor across time. An optical/SAR pair is a
        # cross-modal question, not a change question, so redirect rather than let the service
        # refuse later with a bare "no bands in common".
        if {a.modality, b.modality} == {Modality.OPTICAL, Modality.SAR}:
            raise ValidationError(
                "Change detection compares two images from the same sensor over time, but these "
                "appear to be different sensor types (optical and SAR). For a combined reading of "
                "the two, use the optical/SAR analysis instead.",
                code=ErrorCode.WRONG_MODALITY,
                context={"modalities": [a.modality.value, b.modality.value]},
            )

    def preprocess(self, ctx: ToolContext) -> Prepared:
        before, after = ctx.rasters
        pair = check_pair_compatibility(before, after)
        require_compatible(pair)  # raises GeospatialError on no / insufficient overlap
        aligned_after, report = align_to_reference(after, before, pair.strategy)
        return Prepared(
            rasters=[before, aligned_after],
            quality=assess_quality(before),
            context={
                "warnings": [*pair.warnings, *report.warnings],
                "compatibility": pair.to_dict(),
                "alignment": report.to_dict(),
            },
        )

    def predict(self, prepared: Prepared) -> ChangeResult:
        before, after = prepared.rasters
        return detect_change(before, after)

    def explain(self, raw: ChangeResult) -> list[str]:
        lines = [
            f"Method: {raw.method}; detectors: {', '.join(raw.detectors)}.",
            f"Change threshold {raw.threshold:.4f} ({raw.threshold_method}); "
            f"magnitude bimodality {raw.bimodality:.2f}.",
            f"Registration offset {raw.registration.offset_magnitude:.2f} px "
            f"(quality {raw.registration.score:.2f}).",
        ]
        if raw.changed_pixels:
            lines.append(
                f"{raw.corroborated_fraction * 100:.0f}% of {raw.changed_pixels} changed pixels "
                f"are corroborated by both detectors."
            )
        dom = raw.dominant_transition()
        if dom is not None:
            lines.append(
                f"Dominant transition {_pretty(dom.before)} to {_pretty(dom.after)} "
                f"({dom.spectral_agreement * 100:.0f}% spectral agreement)."
            )
        lines.extend(raw.warnings)
        return lines

    def postprocess(self, raw: ChangeResult, prepared: Prepared) -> ToolResult:
        report = confidence.for_change(raw, prepared.quality)
        # raw.warnings already carries registration + per-date caveats; the pair/alignment
        # warnings (partial overlap, reprojection) are added here. dict.fromkeys dedups.
        extra = prepared.context.get("warnings", [])
        warnings = list(dict.fromkeys([*raw.warnings, *extra]))
        return self.build_result(
            answer=self._summarize(raw),
            data=raw.to_dict(),
            confidence=report,
            evidence=self.explain(raw),
            warnings=warnings,
            raw=raw,
        )

    @staticmethod
    def _summarize(raw: ChangeResult) -> str:
        if raw.changed_pixels == 0:
            return (
                "No change large enough to be distinguished from image noise was detected "
                "between the two dates. This measures no detected change, not proof that "
                "nothing changed."
            )
        parts = [f"Change was detected across {raw.changed_fraction * 100:.1f}% of the valid area"]
        if raw.changed_area_m2 is not None:
            parts.append(f" (about {raw.changed_area_m2 / 1e6:.2f} km²)")
        parts.append(".")
        dom = raw.dominant_transition()
        if dom is not None:
            parts.append(
                f" The dominant transition is {_pretty(dom.before)} to {_pretty(dom.after)}, "
                f"covering {dom.fraction_of_change * 100:.0f}% of the changed area."
            )
        parts.append(
            f" {raw.corroborated_fraction * 100:.0f}% of the detected change is corroborated by "
            f"both detectors."
        )
        return "".join(parts)
