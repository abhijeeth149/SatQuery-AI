/**
 * Fixture loader. The bundled fixtures are recorded REAL tool output (brief
 * §32/§42 — dev fixtures must be genuine analysis output, never fabricated), so
 * serving them offline is replaying a real run, not simulating one.
 */
import indexJson from '@/fixtures/index.json'
import type { AnalysisResult, AnalysisSummary } from '@/types/api'

const summaries = indexJson as AnalysisSummary[]

// Lazy per-id loaders keyed by report id. Glob keys arrive as written
// ('../fixtures/SAT-2026-000101.json'); we key the map on the bare id.
const loaders = import.meta.glob<{ default: unknown }>('../fixtures/SAT-*.json')

function idFromPath(path: string): string {
  const match = /([^/\\]+)\.json$/.exec(path)
  return match ? match[1] : path
}

const loaderById = new Map<string, () => Promise<{ default: unknown }>>()
for (const [path, loader] of Object.entries(loaders)) {
  loaderById.set(idFromPath(path), loader)
}

/** Catalog rows, newest first — what a real listing endpoint would return. */
export function listFixtureSummaries(): AnalysisSummary[] {
  return [...summaries].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function hasFixture(id: string): boolean {
  return loaderById.has(id)
}

export async function loadFixture(id: string): Promise<AnalysisResult | null> {
  const loader = loaderById.get(id)
  if (!loader) return null
  const mod = await loader()
  return { ...(mod.default as AnalysisResult), fixture: true }
}

export const FIXTURE_IDS: string[] = summaries.map((s) => s.id)
