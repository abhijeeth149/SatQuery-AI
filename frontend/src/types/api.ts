/**
 * SatQuery API contract — the single source of truth the frontend codes against
 * and the FastAPI backend must satisfy. Every interface here mirrors a real
 * payload produced by the analysis tools (see scripts/generate_frontend_fixtures.py
 * and the recorded fixtures in src/fixtures/*.json); the enum string values match
 * backend/app/core/types.py verbatim.
 *
 * Nothing in this file is invented: the shapes were transcribed from genuine tool
 * output, so `AnalysisResult` describes exactly what /api/analyze returns.
 */

// ---------------------------------------------------------------------------
// Enumerations (string values identical to the Python enums)
// ---------------------------------------------------------------------------
export const MODALITIES = ['optical', 'sar', 'unknown'] as const
export type Modality = (typeof MODALITIES)[number]

export const QUERY_TASKS = [
  'vqa',
  'captioning',
  'grounding',
  'object_detection',
  'segmentation',
  'change_detection',
  'change_vqa',
  'optical_sar_analysis',
  'land_cover_analysis',
  'report_generation',
  'unknown',
] as const
export type QueryTask = (typeof QUERY_TASKS)[number]

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'
export type ToolTier = 'preferred' | 'fallback' | 'classical'
export type StepStatus = 'ok' | 'warning' | 'failed' | 'skipped'
export type AnalysisStatus = 'success' | 'partial' | 'failed'

/** The four input configurations the assistant accepts (brief §1). */
export const INPUT_MODES = [
  'single_optical',
  'single_sar',
  'optical_sar_pair',
  'bitemporal_pair',
] as const
export type InputMode = (typeof INPUT_MODES)[number]

export type LandCoverClassName = 'water' | 'vegetation' | 'built_up' | 'bare_soil' | 'unclassified'
export type ScatteringRegimeName = 'smooth' | 'diffuse' | 'double_bounce' | 'unclassified'
export type ChangeType =
  | 'water_gain'
  | 'water_loss'
  | 'vegetation_gain'
  | 'vegetation_loss'
  | 'urban_expansion'
  | 'urban_loss'
  | 'spectral_only'
  | 'other'

// ---------------------------------------------------------------------------
// Confidence (evidence-based, never model-generated — brief §27)
// ---------------------------------------------------------------------------
export type ConfidenceFactorKind = 'contributor' | 'gate'

export interface ConfidenceFactor {
  name: string
  value: number
  weight: number
  kind: ConfidenceFactorKind
  reason: string
}

export interface ConfidenceReport {
  level: ConfidenceLevel
  score: number
  sufficient: boolean
  limiting_factor: string | null
  reasons: string[]
  factors: ConfidenceFactor[]
}

// ---------------------------------------------------------------------------
// Geospatial framing + rendered artifacts
// ---------------------------------------------------------------------------
export interface Wgs84Bounds {
  south: number
  west: number
  north: number
  east: number
}

export interface LegendEntry {
  label: string
  color: string
  key: string
}

export type ArtifactKind =
  'base' | 'class_map' | 'regime_map' | 'change_mask' | 'grounding' | 'overlay'

export interface Artifact {
  /** Known kinds above; kept open for forward-compatibility. */
  kind: ArtifactKind | (string & {})
  label: string
  url: string
  /** Present only for georeferenced inputs; null => plain pixel viewer (§8). */
  bounds_wgs84: Wgs84Bounds | null
  legend: LegendEntry[]
}

// ---------------------------------------------------------------------------
// Execution trace (concise, no chain-of-thought — brief §5)
// ---------------------------------------------------------------------------
export type TraceStepName = 'classify' | 'validate' | 'preprocess' | 'execute' | 'score' | 'verify'

export interface TraceStep {
  step: TraceStepName | (string & {})
  tool: string | null
  status: StepStatus
  duration_ms: number
  summary: string
  parameters: Record<string, unknown>
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Per-input raster metadata (RasterMetadata.to_dict + modality/roles/wgs84)
// ---------------------------------------------------------------------------
export interface InputMeta {
  filename: string
  driver: string
  width: number
  height: number
  bands: number
  dtype: string
  crs: string | null
  crs_epsg: number | null
  transform: number[] | null
  bounds: number[] | null
  nodata: number | null
  pixel_size: [number, number] | null
  georeferenced: boolean
  band_descriptions: string[]
  decimation: number
  modality: Modality
  band_roles: string[]
  bounds_wgs84: Wgs84Bounds | null
}

// ---------------------------------------------------------------------------
// Per-task `data` payloads
// ---------------------------------------------------------------------------
export interface IndexSummary {
  name: string
  formula: string
  bands_used: string[]
  valid_fraction: number
  mean: number
  min: number
  max: number
}

export interface LandCoverClassStat {
  class: string
  pixel_count: number
  fraction: number
  percentage: number
  area_m2: number
  mean_evidence: number
}

export interface LandCoverData {
  method: string
  indices_used: string[]
  separability: number
  classes: LandCoverClassStat[]
  dominant: LandCoverClassStat
  warnings: string[]
  index_summaries: Record<string, IndexSummary>
}

export interface GroundingQuery {
  raw: string
  target: string | null
  target_phrase: string | null
  sector: string | null
  sector_phrase: string | null
  sector_interpretation: string | null
  min_area_m2: number | null
  max_area_m2: number | null
  min_pixels: number | null
  max_pixels: number | null
  superlative: string | null
  limit: number | null
  wants_count: boolean
  wants_area: boolean
}

export interface GroundingRegion {
  id: number
  pixel_area: number
  area_m2: number
  bbox_pixel: number[]
  bbox_geo: number[] | null
  polygon_pixel: number[][]
  polygon_geo: number[][] | null
  centroid_geo: number[] | null
  score: number
  sector_overlap: number | null
}

export interface GroundingEvidence {
  classification_method: string
  indices_used: string[]
  class_separability: number
  region_score_index: string | null
  candidate_regions: number
  min_region_pixels: number
  min_region_area_m2: number
  sector_selection: unknown
}

export interface GroundingData {
  query: GroundingQuery
  target: string
  count: number | null
  count_reportable: boolean
  count_caveat: string | null
  region_semantics: string
  source: string
  selected_pixels: number
  selected_area_m2: number
  class_pixels: number
  class_coverage_fraction: number
  georeferenced: boolean
  regions: GroundingRegion[]
  excluded: Record<string, unknown>
  evidence: GroundingEvidence
  warnings: string[]
}

export interface SarRegime {
  regime: string
  candidate_surfaces: string[]
  pixel_count: number
  fraction: number
  percentage: number
  area_m2: number
  mean_backscatter_db: number
}

export interface SpeckleStats {
  filter: string
  window: number
  estimated_enl: number
  input_cv: number
  output_cv: number
  speckle_reduction_factor: number
  warnings: string[]
}

export interface SarHistogram {
  bins: number[]
  counts: number[]
  mean: number
  std: number
  p05: number
  p95: number
}

export interface SarData {
  polarization: string
  thresholds_db: { smooth: number; bright: number; method: string }
  mode_prominence: { smooth: number; bright: number; threshold: number }
  separated_regimes: string[]
  regimes: SarRegime[]
  speckle: SpeckleStats
  histogram: SarHistogram
  warnings: string[]
}

export interface Registration {
  offset_x_px: number
  offset_y_px: number
  offset_magnitude_px: number
  phase_response: number
  ncc: number
  score: number
  warnings: string[]
}

export interface FusionClassStat {
  class: string
  pixel_count: number
  fraction: number
  percentage: number
  area_m2: number
  corroborated_fraction: number
  /** e.g. { both: 180336, conflict: 2787 } */
  evidence: Record<string, number>
}

export interface FusionConflict {
  optical_class: string
  sar_regime: string
  pixel_count: number
  fraction: number
  area_m2: number
  resolved_as: string
  /** which sensor decided: 'sar' | 'optical' */
  arbiter: string
  reason: string
  radar_candidate_surfaces: string[]
}

export interface FusionData {
  method: string
  classes: FusionClassStat[]
  dominant_class: string
  agreement_fraction: number
  corroborated_fraction: number
  evidence_breakdown: Record<string, number>
  evidence_fractions: Record<string, number>
  conflicts: FusionConflict[]
  registration: Registration
  optical_only: { method: string; indices_used: string[]; classes: string[] }
  sar_only: { polarization: string; separated_regimes: string[] }
  warnings: string[]
}

export interface ChangeTransition {
  from: string
  to: string
  change_type: ChangeType | (string & {})
  pixel_count: number
  fraction_of_change: number
  percentage_of_change: number
  area_m2: number
  mean_magnitude: number
  spectral_agreement: number
}

export interface ChangeClassDelta {
  class: string
  pixels_before: number
  pixels_after: number
  pixel_delta: number
  area_m2_before: number
  area_m2_after: number
  area_m2_delta: number
  relative_delta: number
}

export interface ChangeIndexDelta {
  index: string
  mean_before: number
  mean_after: number
  mean_delta_overall: number
  mean_delta_in_change: number
  increase_fraction: number
  direction: string
}

export interface ChangeEvidenceSplit {
  corroborated_pixels: number
  spectral_only_pixels: number
  class_only_pixels: number
  corroborated_fraction: number
}

export interface ChangeData {
  method: string
  detectors: string[]
  features_used: string[]
  threshold: number
  threshold_method: string
  changed_pixels: number
  valid_pixels: number
  changed_fraction: number
  changed_percentage: number
  changed_area_m2: number
  bimodality: number
  threshold_quality: number
  evidence_split: ChangeEvidenceSplit
  dominant_transition: ChangeTransition | null
  transitions: ChangeTransition[]
  class_deltas: ChangeClassDelta[]
  index_deltas: ChangeIndexDelta[]
  registration: Registration
  warnings: string[]
}

export type AnalysisData = LandCoverData | GroundingData | SarData | FusionData | ChangeData

// ---------------------------------------------------------------------------
// The envelope
// ---------------------------------------------------------------------------
export interface AnalysisResult {
  /** Report identifier, format SAT-2026-000123 (brief §13). */
  id: string
  request_id: string
  created_at: string
  status: AnalysisStatus
  mode: InputMode | (string & {})
  title: string
  note: string
  query: string
  task: QueryTask
  tool: string
  tier: ToolTier
  duration_ms: number
  /** The released answer, or the §28 decline sentence when withheld. */
  answer: string
  /** When evidence is insufficient, the phrasing that was withheld (else null). */
  answer_withheld: string | null
  confidence: ConfidenceReport
  evidence: string[]
  warnings: string[]
  data: AnalysisData
  inputs: InputMeta[]
  trace: TraceStep[]
  artifacts: Artifact[]
  /** True when served from a recorded fixture rather than a live backend run. */
  fixture?: boolean
}

/** Row shape in fixtures/index.json and GET /api/analyses. */
export interface AnalysisSummary {
  id: string
  title: string
  mode: InputMode | (string & {})
  task: QueryTask
  query: string
  created_at: string
  status: AnalysisStatus
  confidence: ConfidenceLevel
  answer: string
}

// ---------------------------------------------------------------------------
// Ops endpoints (brief §30) — fields optional so the UI degrades gracefully.
// ---------------------------------------------------------------------------
export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down' | (string & {})
  detail?: string
}

export interface ModelRegistryEntry {
  task: string
  tool: string
  tier: ToolTier | (string & {})
  available: boolean
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down' | (string & {})
  version?: string
  uptime_s?: number
  checks?: Record<string, HealthCheck>
  models?: ModelRegistryEntry[]
}

export interface Metrics {
  requests_total?: number
  requests_succeeded?: number
  requests_partial?: number
  requests_failed?: number
  requests_by_task?: Record<string, number>
  avg_duration_ms?: number
  p95_duration_ms?: number
  uptime_s?: number
  [key: string]: unknown
}

/** Uniform error envelope (brief §29). Never carries a stack trace. */
export interface ApiErrorEnvelope {
  success: false
  error_code: string
  message: string
  request_id: string
  recoverable: boolean
}

// ---------------------------------------------------------------------------
// Type guards — narrow AnalysisData by distinctive keys. The `task` field alone
// cannot discriminate (single-SAR and fusion both report `optical_sar_analysis`),
// so we key off structure.
// ---------------------------------------------------------------------------
export function isLandCoverData(d: AnalysisData): d is LandCoverData {
  return 'separability' in d && 'index_summaries' in d
}

export function isGroundingData(d: AnalysisData): d is GroundingData {
  return 'regions' in d && 'region_semantics' in d
}

export function isSarData(d: AnalysisData): d is SarData {
  return 'polarization' in d && 'regimes' in d && 'speckle' in d
}

export function isFusionData(d: AnalysisData): d is FusionData {
  return 'conflicts' in d && 'evidence_breakdown' in d
}

export function isChangeData(d: AnalysisData): d is ChangeData {
  return 'transitions' in d && 'detectors' in d
}
