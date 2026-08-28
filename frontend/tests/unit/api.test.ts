import { describe, it, expect } from 'vitest'
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
