"""Router: reconcile the classifier's task with the actual inputs, and default honestly (§5, §9).

Second stage of the agentic pipeline (classifier -> **router** -> tools -> evidence validator ->
result integrator, §5). The classifier reads the query *text* alone; the registry knows which tool
serves a task and how to refuse one it cannot. The router is the only stage that sees *both* the
query and the images, so it owns the two decisions neither of the others can make:

1. **Give ``UNKNOWN`` an input-aware default, or decline (§9).** The classifier returns
   :attr:`QueryTask.UNKNOWN` for a query with no task signal rather than forcing it into the nearest
   bucket. The router then reads the inputs: a single optical image with no question is a land-cover
   overview, a single radar image is a SAR analysis, two optical images are a change comparison, an
   optical+SAR pair is a fusion. When the inputs fit no analysis — no image, two SAR images, three or
   more — it does **not** invent a workflow; it returns ``UNKNOWN`` flagged for clarification so the
   orchestrator can ask the user what they meant. Guessing a workflow for a vague query is the exact
   failure mode §9 forbids.

2. **Reconcile a recognised task against the input modality (§5).** A task recognised from the text
   is normally passed straight through — the registry validates the inputs and refuses honestly if
   they do not fit (a SAR analysis asked of an optical image, say, is declined there with a redirect,
   which is more honest than the router silently substituting a different analysis). The one override
   the router applies is narrow and defensible: a general "what do you see / describe this" query
   whose *only* input is a single SAR image is routed to SAR analysis, because the optical describer
   cannot run on radar at all and the radar analyser answers the same general question. Specific
   optical products — grounding, land-cover classification — are never silently swapped; they pass
   through to an honest modality refusal.

The router never runs a tool and never fabricates a result. It produces a :class:`RouteDecision` —
a task plus an auditable reason — that the orchestrator dispatches, and whose reason is surfaced in
the execution trace so a defaulted or overridden route is visible rather than implied.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from ..core.logging import get_logger
from ..core.types import InputMode, Modality, QueryTask
from .classifier import Classification, classify

if TYPE_CHECKING:  # typing only — keeps the router free of the geospatial import chain
    from collections.abc import Sequence

    from ..geospatial.raster import RasterData
    from .modes import NormalizedRequest

logger = get_logger(__name__)

# Optical tasks whose question is a *general description* of the scene. These are the only recognised
# tasks the router will re-point at SAR analysis when the sole input is radar, because the radar
# analyser answers the same "what does this image show" question. Grounding and land-cover
# classification are deliberately excluded: they are specific optical products a backscatter analysis
# does not reproduce, so they pass through to an honest modality refusal instead.
_GENERAL_DESCRIPTION_TASKS: frozenset[QueryTask] = frozenset(
    {QueryTask.VQA, QueryTask.CAPTIONING}
)

# Human-readable labels for routing reasons, covering every task the classifier can emit.
_TASK_LABEL: dict[QueryTask, str] = {
    QueryTask.VQA: "a visual question about the image",
    QueryTask.CAPTIONING: "an image description",
    QueryTask.GROUNDING: "a request to locate regions",
    QueryTask.OBJECT_DETECTION: "object detection",
    QueryTask.SEGMENTATION: "segmentation",
    QueryTask.CHANGE_DETECTION: "change detection",
    QueryTask.CHANGE_VQA: "a question about change",
    QueryTask.OPTICAL_SAR_ANALYSIS: "SAR / optical-SAR analysis",
    QueryTask.LAND_COVER_ANALYSIS: "land-cover analysis",
    QueryTask.REPORT_GENERATION: "a full analysis report",
}


class RouteSource(StrEnum):
    """Where a :class:`RouteDecision`'s task came from — recorded in the trace for honesty."""

    CLASSIFIER = "classifier"
    """The query text named the task; the inputs did not change it."""

    INPUT_DEFAULT = "input_default"
    """The query named no task; the task was defaulted from the inputs (§9)."""

    INPUT_OVERRIDE = "input_override"
    """The query named a task, but the input modality re-pointed it to a compatible one."""

    UNRESOLVED = "unresolved"
    """No task could be routed; the inputs fit no analysis, so the user must clarify."""


@dataclass(frozen=True)
class RouteDecision:
    """The router's verdict for one request: the task to dispatch and why.

    Attributes:
        task: The :class:`QueryTask` to dispatch. :attr:`QueryTask.UNKNOWN` only when
            :attr:`source` is :attr:`RouteSource.UNRESOLVED`.
        source: How the task was arrived at — see :class:`RouteSource`.
        reason: A concise, user-facing explanation of the routing, shown in the execution trace so a
            default or an override is visible. Never chain-of-thought; a factual statement of what
            was decided and from what.
        classification: The classifier's raw text verdict, retained so the trace can show the matched
            terms and the runners-up behind the decision.
        needs_clarification: ``True`` only when unresolved — the orchestrator turns this into an
            explicit request for the user to rephrase or adjust the inputs, not a guessed answer.
        mode: The canonical :class:`~app.core.types.InputMode` the request was normalised to
            *before* routing, when the caller went through :func:`route_request`. ``None`` only for
            the lower-level :func:`route` entry point, which takes bare rasters.
    """

    task: QueryTask
    source: RouteSource
    reason: str
    classification: Classification
    needs_clarification: bool = False
    mode: InputMode | None = None

    @property
    def is_resolved(self) -> bool:
        """Whether a concrete task was routed (i.e. the request can proceed to dispatch)."""
        return self.source is not RouteSource.UNRESOLVED

    def to_dict(self) -> dict[str, Any]:
        return {
            "task": self.task.value,
            "source": self.source.value,
            "reason": self.reason,
            "needs_clarification": self.needs_clarification,
            "mode": self.mode.value if self.mode is not None else None,
            "classification": self.classification.to_dict(),
        }


@dataclass(frozen=True)
class _InputProfile:
    """A count of the inputs by modality — all the router needs to reconcile task with images."""

    count: int
    optical: int
    sar: int
    unknown: int


def _profile(rasters: Sequence[RasterData]) -> _InputProfile:
    sar = sum(1 for r in rasters if r.modality is Modality.SAR)
    optical = sum(1 for r in rasters if r.modality is Modality.OPTICAL)
    count = len(rasters)
    return _InputProfile(count=count, optical=optical, sar=sar, unknown=count - optical - sar)


def route_request(
    request: NormalizedRequest,
    *,
    classification: Classification | None = None,
) -> RouteDecision:
    """Route an already-normalised request — the entry point the API uses (§5).

    The ordering matters and is the point of this function: the input mode is established from the
    actual rasters *first*, and the decision it produces carries that mode, so the mode in the
    trace, the database row and the response is the one routing actually saw. The previous code
    derived a mode string after classification and then discarded it, which meant nothing
    downstream could rely on it.

    Args:
        request: The normalised request, whose :attr:`~app.agents.modes.NormalizedRequest.mode` is
            already established and checked.
        classification: A pre-computed text classification, to avoid classifying twice.

    Returns:
        The :class:`RouteDecision`, with :attr:`RouteDecision.mode` set.
    """
    decision = route(request.query, request.rasters, classification=classification)
    return replace(decision, mode=request.mode)


def route(
    query: str,
    rasters: Sequence[RasterData],
    *,
    classification: Classification | None = None,
) -> RouteDecision:
    """Decide which task to dispatch for ``query`` given the loaded ``rasters``.

    Runs the classifier on the text (unless a :class:`Classification` is supplied), then reconciles
    its verdict with the input modalities per the two rules in the module docstring. Never runs a
    tool; returns a :class:`RouteDecision` for the orchestrator to dispatch.
    """
    cls = classification if classification is not None else classify(query)
    profile = _profile(rasters)
    decision = (
        _default_from_inputs(cls, profile)
        if cls.task is QueryTask.UNKNOWN
        else _reconcile(cls, profile)
    )
    logger.debug(
        "query routed",
        extra={
            "task": decision.task.value,
            "source": decision.source.value,
            "images": profile.count,
            "optical": profile.optical,
            "sar": profile.sar,
        },
    )
    return decision


def _reconcile(cls: Classification, profile: _InputProfile) -> RouteDecision:
    """Route a text-recognised task, applying the single narrow input override (rule 2)."""
    # Override: a general-description query whose only input is one SAR image -> SAR analysis. The
    # optical describer cannot run on radar, and the radar analyser answers the same question.
    if (
        cls.task in _GENERAL_DESCRIPTION_TASKS
        and profile.count == 1
        and profile.sar == 1
    ):
        return RouteDecision(
            task=QueryTask.OPTICAL_SAR_ANALYSIS,
            source=RouteSource.INPUT_OVERRIDE,
            reason=(
                f"The query reads as {_TASK_LABEL[cls.task]}, but the only input is a SAR (radar) "
                "image, so it is routed to SAR backscatter analysis rather than an optical analysis "
                "that cannot run on radar data."
            ),
            classification=cls,
        )
    # Otherwise pass the recognised task through; the registry validates the inputs and refuses
    # honestly if they do not fit, which is more truthful than substituting a different analysis.
    label = _TASK_LABEL.get(cls.task, cls.task.value)
    terms = f" (matched: {', '.join(cls.matched_terms)})" if cls.matched_terms else ""
    return RouteDecision(
        task=cls.task,
        source=RouteSource.CLASSIFIER,
        reason=f"Recognised {label} from the query{terms}.",
        classification=cls,
    )


def _default_from_inputs(cls: Classification, profile: _InputProfile) -> RouteDecision:
    """Default an UNKNOWN query from the inputs, or decline when they fit no analysis (rule 1)."""
    n = profile.count
    if n == 1:
        if profile.sar == 1:
            return _defaulted(
                QueryTask.OPTICAL_SAR_ANALYSIS,
                cls,
                "a single SAR (radar) image was provided, so a backscatter analysis is produced",
            )
        # Optical, or undetermined modality treated as optical (SAR is reliably detected, so an
        # image that evades detection is far more likely optical); the land-cover analyser verifies
        # the optical bands and refuses honestly if they are absent.
        return _defaulted(
            QueryTask.LAND_COVER_ANALYSIS,
            cls,
            "a single image was provided, so a land-cover overview is produced",
        )
    if n == 2:
        if profile.sar == 0:
            return _defaulted(
                QueryTask.CHANGE_DETECTION,
                cls,
                "two images were provided and neither is radar, so they are compared for change",
            )
        if profile.sar == 1 and profile.optical == 1:
            return _defaulted(
                QueryTask.OPTICAL_SAR_ANALYSIS,
                cls,
                "an optical and a SAR image were provided, so the two are fused",
            )
        # A SAR image is present but the pair is not one optical + one SAR: two radar images (no
        # implemented SAR change detection), or a radar image beside one of undetermined type.
        detail = (
            "two SAR (radar) images were provided, and SAR change detection is not implemented"
            if profile.sar == 2
            else "a SAR image was provided beside one of undetermined type"
        )
        return _unresolved(
            cls,
            f"{detail}. Please tell me what you would like to do, or adjust the images",
        )
    if n == 0:
        return _unresolved(
            cls, "no image was provided. Please upload an image, or rephrase your question"
        )
    # n >= 3
    return _unresolved(
        cls,
        f"{n} images were provided, but no available analysis uses more than two. Please provide "
        "one or two images, or name the task",
    )


def _defaulted(task: QueryTask, cls: Classification, detail: str) -> RouteDecision:
    return RouteDecision(
        task=task,
        source=RouteSource.INPUT_DEFAULT,
        reason=f"No specific task was recognised from the query; {detail}.",
        classification=cls,
    )


def _unresolved(cls: Classification, detail: str) -> RouteDecision:
    return RouteDecision(
        task=QueryTask.UNKNOWN,
        source=RouteSource.UNRESOLVED,
        reason=f"No specific task was recognised from the query, and {detail}.",
        classification=cls,
        needs_clarification=True,
    )
