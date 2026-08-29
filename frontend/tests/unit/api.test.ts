import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  analyze,
  ApiRequestError,
  apiConfig,
  getAnalysis,
  getHealth,
  getMetrics,
  listAnalyses,
} from '@/services/api'
import {
  isChangeData,
  isFusionData,
  isGroundingData,
  isLandCoverData,
  isSarData,
} from '@/types/api'

// Tests run with VITE_USE_FIXTURES unset -> offline fixtures mode.
describe('api client (offline fixtures mode)', () => {
  it('defaults to offline in the test environment', () => {
    expect(apiConfig.offline).toBe(true)
  })

  it('lists the demo catalog newest-first', async () => {
    const rows = await listAnalyses()
    expect(rows).toHaveLength(6)
    expect(rows[0].id).toBe('SAT-2026-000106')
    expect(rows.map((r) => r.id)).toContain('SAT-2026-000101')
  })

  it('loads a full envelope and marks it as a fixture', async () => {
    const result = await getAnalysis('SAT-2026-000101')
    expect(result.id).toBe('SAT-2026-000101')
    expect(result.fixture).toBe(true)
    expect(result.trace.length).toBeGreaterThan(0)
    expect(result.confidence.level).toBe('high')
  })

  it('rejects an unknown id with a not_found ApiRequestError', async () => {
    await expect(getAnalysis('SAT-2026-999999')).rejects.toMatchObject({
      name: 'ApiRequestError',
      errorCode: 'not_found',
    })
  })

  it('replays a demo case through analyze()', async () => {
    const result = await analyze({
      mode: 'single_optical',
      query: 'What land cover types are present?',
      files: [],
      demoCaseId: 'SAT-2026-000101',
    })
    expect(result.id).toBe('SAT-2026-000101')
  })

  it('refuses to fabricate a result for uploaded imagery when offline', async () => {
    const err = await analyze({
      mode: 'single_optical',
      query: 'classify this',
      files: [new File([new Uint8Array([1, 2, 3])], 'scene.tif')],
    }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiRequestError)
    expect((err as ApiRequestError).errorCode).toBe('backend_required')
    expect((err as ApiRequestError).recoverable).toBe(true)
  })

  it('reports honest offline health', async () => {
    const health = await getHealth()
    expect(health.status).toBe('degraded')
    expect(health.checks?.backend.status).toBe('down')
  })

  it('reports only demo-catalog metrics offline (no invented throughput)', async () => {
    const metrics = await getMetrics()
    expect(metrics.source).toBe('demo_catalog')
    expect(metrics.requests_total).toBe(6)
    expect(metrics.avg_duration_ms).toBeUndefined()
  })
})

/**
 * What the live mappers are allowed to claim.
 *
 * Every assertion here pins a field the client used to invent rather than read. The symptom the
 * user saw was one result page that simultaneously said "Tool ModeNormalizer", "Success", and
 * "Insufficient evidence for a reliable conclusion" — over a real, measured answer. None of those
 * three came from the backend: `tool` was read from whichever component happened to occupy trace
 * step 1, `status` was the literal `'success'`, and the whole confidence report was manufactured
 * (three fixed reason strings and a `score >= 0.5` sufficiency rule of the UI's own making).
 */
const BACKEND_CONFIDENCE = {
  level: 'low',
  score: 0.494,
  // The backend considers `low` sufficient to state with caveats; only `insufficient` is not. The
  // old `score >= 0.5` rule disagreed with it on exactly this value.
  sufficient: true,
  limiting_factor: 'evidence_strength',
  reasons: ['Spectral separability is weak', 'Co-registration is approximate'],
  factors: [
    {
      name: 'evidence_strength',
      value: 0.494,
      weight: 1.0,
      kind: 'gate',
      reason: 'Spectral separability is weak',
    },
    {
      name: 'registration',
      value: 0.78,
      weight: 1.0,
      kind: 'contributor',
      reason: 'Co-registration is approximate',
    },
  ],
}

/** The three strings the client used to emit no matter what the backend measured. */
const FABRICATED_REASONS = [
  'Valid radiometric bounds',
  'Sensor metadata verified',
  'Measured spectral indices',
]

function backendEnvelope(id: string, overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: id,
    query: 'Combine the optical and radar images to map land cover.',
    mode: 'optical_sar_pair',
    task: 'optical_sar_analysis',
    tool: 'fusion-decision-cv',
    tier: 'classical',
    status: 'partial',
    answer: 'Built-up cover dominates the scene.',
    confidence_score: BACKEND_CONFIDENCE.score,
    confidence_level: BACKEND_CONFIDENCE.level,
    confidence: BACKEND_CONFIDENCE,
    evidence: ['Backscatter mean -13.8 dB'],
    structured_evidence: [],
    execution_trace: {
      trace_id: `trace-${id}`,
      total_duration_ms: 812,
      steps: [
        {
          step_index: 0,
          step_name: 'preprocess',
          tool_name: 'RasterPreprocessor',
          status: 'ok',
          details: 'Loaded 2 rasters',
          duration_ms: 40,
          warnings: [],
        },
        {
          // The step that gave the page its wrong headline: second in the trace, and not the analyst.
          step_index: 1,
          step_name: 'classify',
          tool_name: 'ModeNormalizer',
          status: 'ok',
          details: 'Normalised to optical_sar_pair',
          duration_ms: 5,
          warnings: [],
        },
        {
          step_index: 2,
          step_name: 'execute',
          tool_name: 'fusion-decision-cv',
          status: 'warning',
          details: 'Fused both sensors',
          duration_ms: 700,
          warnings: ['Co-registration is approximate'],
        },
      ],
    },
    data: {},
    warnings: ['Co-registration is approximate'],
    created_at: '2026-08-29T10:00:00Z',
    ...overrides,
  }
}

describe('api client (live backend mapping)', () => {
  afterEach(() => {
    apiConfig.offline = true
    vi.unstubAllGlobals()
  })

  /** Serve a fixed JSON body for every request, and record where the client went. */
  function stubBackend(bodyFor: (url: string) => unknown) {
    apiConfig.offline = false
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        return new Response(JSON.stringify(bodyFor(url)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    )
    return calls
  }

  it('credits the tool the backend names, not whichever component sits at trace step 1', async () => {
    stubBackend(() => backendEnvelope('SAT-LIVE-000001'))
    const result = await getAnalysis('SAT-LIVE-000001')
    // Never 'ModeNormalizer' — that step is present in the trace and must stay there...
    expect(result.tool).toBe('fusion-decision-cv')
    expect(result.trace.map((s) => s.tool)).toContain('ModeNormalizer')
    // ...but it is not the analyst, and 'remote-sensing-specialist' (the old fallback) is not a
    // registered tool at all.
    expect(result.tool).not.toBe('ModeNormalizer')
    expect(result.tool).not.toBe('remote-sensing-specialist')
  })

  it('reads tier, status and duration instead of hardcoding them', async () => {
    stubBackend(() => backendEnvelope('SAT-LIVE-000002'))
    const result = await getAnalysis('SAT-LIVE-000002')
    expect(result.tier).toBe('classical')
    // A run that finished with warnings is 'partial'. Hardcoded 'success' painted it green.
    expect(result.status).toBe('partial')
    expect(result.duration_ms).toBe(812)
  })

  it('passes the measured confidence report through untouched', async () => {
    stubBackend(() => backendEnvelope('SAT-LIVE-000003'))
    const result = await getAnalysis('SAT-LIVE-000003')
    expect(result.confidence.score).toBeCloseTo(0.494, 5)
    expect(result.confidence.level).toBe('low')
    // The verdict is the backend's: a measured `low` is sufficient, so no "Insufficient evidence"
    // banner. The old `score >= 0.5` rule inverted this exact value.
    expect(result.confidence.sufficient).toBe(true)
    expect(result.confidence.limiting_factor).toBe('evidence_strength')
    expect(result.confidence.reasons).toEqual(BACKEND_CONFIDENCE.reasons)
    expect(result.confidence.factors.map((f) => f.name)).toEqual([
      'evidence_strength',
      'registration',
    ])
    expect(result.confidence.factors.map((f) => f.kind)).toEqual(['gate', 'contributor'])
    for (const invented of FABRICATED_REASONS) {
      expect(result.confidence.reasons).not.toContain(invented)
    }
    expect(result.confidence.factors.map((f) => f.name)).not.toContain('model_confidence')
  })

  it('claims nothing beyond score and level when a row predates the report', async () => {
    stubBackend(() => {
      const { confidence: _dropped, ...withoutReport } = backendEnvelope('SAT-LIVE-000004')
      return withoutReport
    })
    const result = await getAnalysis('SAT-LIVE-000004')
    expect(result.confidence.score).toBeCloseTo(0.494, 5)
    expect(result.confidence.level).toBe('low')
    // Derived from the level the way the confidence engine derives it, not from a threshold.
    expect(result.confidence.sufficient).toBe(true)
    // Nothing is back-filled with plausible-sounding text.
    expect(result.confidence.reasons).toEqual([])
    expect(result.confidence.factors).toEqual([])
    expect(result.confidence.limiting_factor).toBeNull()
  })

  it('withholds sufficiency only when the backend measured "insufficient"', async () => {
    stubBackend(() =>
      backendEnvelope('SAT-LIVE-000005', {
        confidence_level: 'insufficient',
        confidence: { ...BACKEND_CONFIDENCE, level: 'insufficient', sufficient: false },
      }),
    )
    const result = await getAnalysis('SAT-LIVE-000005')
    expect(result.confidence.level).toBe('insufficient')
    expect(result.confidence.sufficient).toBe(false)
  })

  it('maps the same fields the same way through analyze()', async () => {
    const calls = stubBackend((url) =>
      url.includes('/api/analyze') ? backendEnvelope('SAT-LIVE-000006') : {},
    )
    const result = await analyze({
      mode: 'optical_sar_pair',
      query: 'Combine the optical and radar images to map land cover.',
      files: [],
    })
    expect(calls.some((u) => u.includes('/api/analyze'))).toBe(true)
    expect(result.tool).toBe('fusion-decision-cv')
    expect(result.tier).toBe('classical')
    expect(result.status).toBe('partial')
    // The mode the backend normalised to wins over the mode the UI selected.
    expect(result.mode).toBe('optical_sar_pair')
    expect(result.confidence.sufficient).toBe(true)
    expect(result.confidence.reasons).toEqual(BACKEND_CONFIDENCE.reasons)
    expect(result.fixture).toBe(false)
  })

  it('reports the backend-normalised mode even when it contradicts the selection', async () => {
    stubBackend((url) =>
      url.includes('/api/analyze')
        ? backendEnvelope('SAT-LIVE-000007', { mode: 'optical_sar_pair' })
        : {},
    )
    const result = await analyze({
      mode: 'bitemporal_pair',
      query: 'What changed?',
      files: [],
    })
    expect(result.mode).toBe('optical_sar_pair')
  })

  /**
   * The trace timings are measurements, so they survive the trip verbatim.
   *
   * Both mappers used to write `s.duration_ms || 25` (30 on the detail path), which caught two
   * distinct real values: a step that finished in under half a millisecond (`0`) and one the backend
   * does not time separately (`null`, mode normalisation — its cost is inside routing). In a change
   * run that is four of six steps, so the trace summed to 479 ms beside a measured 380 ms.
   */
  it('passes measured step durations through, including 0 and null', async () => {
    const trace = {
      trace_id: 'trace-durations',
      total_duration_ms: 380,
      steps: [
        {
          step_index: 0,
          step_name: 'preprocess',
          tool_name: 'RasterPreprocessor',
          status: 'ok',
          details: 'Loaded 2 rasters',
          duration_ms: 55,
          warnings: [],
        },
        {
          step_index: 1,
          step_name: 'classify',
          tool_name: 'ModeNormalizer',
          status: 'ok',
          details: 'Normalised',
          duration_ms: null,
          warnings: [],
        },
        {
          step_index: 2,
          step_name: 'classify',
          tool_name: 'AgentRouter',
          status: 'ok',
          details: 'Routed',
          duration_ms: 0,
          warnings: [],
        },
        {
          step_index: 3,
          step_name: 'execute',
          tool_name: 'change-cva-cv',
          status: 'ok',
          details: 'Executed',
          duration_ms: 324,
          warnings: [],
        },
      ],
    }

    stubBackend(() => backendEnvelope('SAT-LIVE-000008', { execution_trace: trace }))
    const result = await getAnalysis('SAT-LIVE-000008')

    expect(result.trace.map((s) => s.duration_ms)).toEqual([55, null, 0, 324])
    // The two substituted constants, neither of which was ever measured.
    expect(result.trace.map((s) => s.duration_ms)).not.toContain(25)
    expect(result.trace.map((s) => s.duration_ms)).not.toContain(30)
    // And the steps still cannot outweigh the run they belong to.
    const summed = result.trace.reduce((n, s) => n + (s.duration_ms ?? 0), 0)
    expect(summed).toBeLessThanOrEqual(result.duration_ms)
  })

  it('passes measured step durations through analyze() the same way', async () => {
    stubBackend((url) =>
      url.includes('/api/analyze')
        ? backendEnvelope('SAT-LIVE-000009', {
            execution_trace: {
              trace_id: 'trace-durations-analyze',
              total_duration_ms: 55,
              steps: [
                {
                  step_index: 0,
                  step_name: 'classify',
                  tool_name: 'ModeNormalizer',
                  status: 'ok',
                  details: 'Normalised',
                  duration_ms: null,
                  warnings: [],
                },
                {
                  step_index: 1,
                  step_name: 'validate',
                  tool_name: 'ToolRegistry',
                  status: 'ok',
                  details: 'Contract satisfied',
                  duration_ms: 0,
                  warnings: [],
                },
                {
                  step_index: 2,
                  step_name: 'execute',
                  tool_name: 'change-cva-cv',
                  status: 'ok',
                  details: 'Executed',
                  duration_ms: 55,
                  warnings: [],
                },
              ],
            },
          })
        : {},
    )
    const result = await analyze({ mode: 'bitemporal_pair', query: 'What changed?', files: [] })
    expect(result.trace.map((s) => s.duration_ms)).toEqual([null, 0, 55])
  })
})

describe('AnalysisData type guards against real fixtures', () => {
  it('identifies each task payload uniquely', async () => {
    const cases = [
      { id: 'SAT-2026-000101', guard: isLandCoverData },
      { id: 'SAT-2026-000102', guard: isGroundingData },
      { id: 'SAT-2026-000104', guard: isSarData },
      { id: 'SAT-2026-000105', guard: isFusionData },
      { id: 'SAT-2026-000106', guard: isChangeData },
    ] as const

    const allGuards = [isLandCoverData, isGroundingData, isSarData, isFusionData, isChangeData]

    for (const { id, guard } of cases) {
      const { data } = await getAnalysis(id)
      // The intended guard matches...
      expect(guard(data)).toBe(true)
      // ...and no other guard also matches (mutual exclusivity).
      const matches = allGuards.filter((g) => g(data))
      expect(matches).toHaveLength(1)
    }
  })
})
