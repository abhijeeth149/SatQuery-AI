/**
 * How the printable report must present a weak, non-georeferenced change run.
 *
 * The numbers below are recorded from a real run (SAT-2026-000199 / SAT-2026-000154: two
 * non-georeferenced screenshots, 82.5 px apart, confidence `insufficient` at 0.081). The analysis
 * was honest; the report was not. It printed "Insufficient evidence for a reliable conclusion."
 * directly above the measured answer, filled the Transitions "Area" column with nine dashes beside
 * nine measured pixel counts, headlined "Changed area —", and — worst — reported every class as
 * "Δ area +0 m²", a fabricated measurement of no change for classes that had more than doubled.
 *
 * The report is built once into a model and rendered twice (screen + downloadable file), so each
 * defect is pinned in the model and in both renderers.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildReportModel } from '@/lib/report-model'
import type { ReportBlock, ReportModel } from '@/lib/report-model'
import { renderReportHtml } from '@/lib/report-html'
import { ReportDocument } from '@/components/report/report-document'
import type { AnalysisResult, ChangeData } from '@/types/api'

const GENERATED_AT = '2026-08-29T10:00:00.000Z'

const isFields = (b: ReportBlock): b is Extract<ReportBlock, { kind: 'fields' }> =>
  b.kind === 'fields'
const isTable = (b: ReportBlock): b is Extract<ReportBlock, { kind: 'table' }> => b.kind === 'table'
const isCallout = (b: ReportBlock): b is Extract<ReportBlock, { kind: 'callout' }> =>
  b.kind === 'callout'

/**
 * The digits of a formatted number, so assertions survive any host locale.
 *
 * `formatInt` delegates to `Intl.NumberFormat`, which renders 100620 as "100,620" under en-US and
 * "1,00,620" under en-IN. What matters is that the measured count is present at all.
 */
function digits(text: string): string {
  return text.replace(/[^0-9]/g, '')
}

/** Recorded change output: every ground area is null, every pixel count is measured. */
const CHANGE: ChangeData = {
  method: 'cva-raw-bands',
  detectors: ['spectral-cva', 'land-cover-disagreement'],
  features_used: ['red', 'green', 'blue'],
  threshold: 0.27138,
  threshold_method: 'otsu',
  changed_pixels: 100620,
  valid_pixels: 152272,
  changed_fraction: 0.6608,
  changed_percentage: 66.08,
  changed_area_m2: null,
  bimodality: 0.6742,
  threshold_quality: 0.7357,
  evidence_split: {
    corroborated_pixels: 18117,
    spectral_only_pixels: 19504,
    class_only_pixels: 62999,
    corroborated_fraction: 0.1801,
  },
  dominant_transition: {
    from: 'vegetation',
    to: 'bare_soil',
    change_type: 'vegetation_loss',
    pixel_count: 22484,
    fraction_of_change: 0.2235,
    percentage_of_change: 22.35,
    area_m2: null,
    mean_magnitude: 0.3088,
    spectral_agreement: 0.63,
  },
  transitions: [
    {
      from: 'vegetation',
      to: 'bare_soil',
      change_type: 'vegetation_loss',
      pixel_count: 22484,
      fraction_of_change: 0.2235,
      percentage_of_change: 22.35,
      area_m2: null,
      mean_magnitude: 0.3088,
      spectral_agreement: 0.63,
    },
    {
      from: 'vegetation',
      to: 'water',
      change_type: 'water_gain',
      pixel_count: 15302,
      fraction_of_change: 0.1521,
      percentage_of_change: 15.21,
      area_m2: null,
      mean_magnitude: 0.2814,
      spectral_agreement: 0.41,
    },
  ],
  class_deltas: [
    {
      class: 'water',
      pixels_before: 20593,
      pixels_after: 44348,
      pixel_delta: 23755,
      area_m2_before: null,
      area_m2_after: null,
      area_m2_delta: null,
      relative_delta: 1.1535,
    },
    {
      class: 'vegetation',
      pixels_before: 65774,
      pixels_after: 45185,
      pixel_delta: -20589,
      area_m2_before: null,
      area_m2_after: null,
      area_m2_delta: null,
      relative_delta: -0.313,
    },
  ],
  index_deltas: [
    {
      index: 'red',
      mean_before: 0.2814,
      mean_after: 0.2823,
      mean_delta_overall: 0.0009,
      mean_delta_in_change: 0.0093,
      increase_fraction: 0.3966,
      direction: 'decrease',
    },
  ],
  registration: {
    offset_x_px: 78.477,
    offset_y_px: 25.457,
    offset_magnitude_px: 82.503,
    phase_response: 0.0247,
    ncc: 0.2197,
    score: 0.0806,
    warnings: ['The images appear misaligned by about 82.5 pixels.'],
  },
  warnings: [],
}

const ANSWER =
  'Change was detected across 66.1% of the valid area. The dominant transition is vegetation to bare soil, covering 22% of the changed area.'

function changeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: 'SAT-2026-000199',
    request_id: 'req-000199',
    created_at: '2026-08-29T09:59:00Z',
    title: 'Bi-temporal change analysis',
    note: 'Live analysis executed via change_detection',
    status: 'partial',
    mode: 'bitemporal_pair',
    task: 'change_detection',
    tool: 'change-cva-cv',
    tier: 'classical',
    duration_ms: 362,
    fixture: false,
    query: 'What changed between the two dates?',
    answer: ANSWER,
    answer_withheld: null,
    confidence: {
      level: 'insufficient',
      score: 0.0806,
      sufficient: false,
      limiting_factor: 'registration',
      reasons: ['Image co-registration scored 0.08 (offset 82.50 px, structural NCC 0.22).'],
      factors: [
        {
          name: 'registration',
          value: 0.0806,
          weight: 0.2,
          kind: 'gate',
          reason: 'Image co-registration scored 0.08 (offset 82.50 px, structural NCC 0.22).',
        },
      ],
    },
    data: CHANGE,
    artifacts: [],
    evidence: ['66.1% of valid pixels changed (Otsu threshold 0.271).'],
    warnings: ['The images appear misaligned by about 82.5 pixels.'],
    inputs: [
      {
        filename: 't1.png',
        modality: 'unknown',
        width: 512,
        height: 384,
        bands: 3,
        dtype: 'uint8',
        crs: null,
        crs_epsg: null,
        pixel_size: null,
        georeferenced: false,
      },
    ],
    trace: [
      {
        step: 'execute',
        tool: 'change-cva-cv',
        status: 'warning',
        duration_ms: 324,
        summary: 'Executed',
        parameters: {},
        warnings: ['Images misaligned by 82.5 px'],
      },
    ],
    ...overrides,
  } as AnalysisResult
}

function findings(model: ReportModel) {
  const section = model.sections.find((s) => s.id === 'findings')
  expect(section).toBeDefined()
  return section!
}

function classTable(model: ReportModel) {
  const table = findings(model)
    .blocks.filter(isTable)
    .find((b) => /class (area|extent) change/i.test(b.table.caption ?? ''))
  expect(table).toBeDefined()
  return table!.table
}

describe('report findings for a non-georeferenced change run', () => {
  const model = buildReportModel(changeResult(), GENERATED_AT)

  it('never manufactures a "+0 m²" delta out of a null ground area', () => {
    const { columns, rows } = classTable(model)
    // Ground area is unknown, so the column is labelled for what it actually reports.
    expect(columns.find((c) => c.key === 'delta')!.label).toBe('Δ extent')

    const water = rows.find((r) => /water/i.test(r.class))!
    expect(water.delta).not.toBe('+0 m²')
    for (const row of rows) {
      // The old expression was `area_m2_delta >= 0 ? '+' : '−'` with `Math.abs(area_m2_delta)`;
      // `null >= 0` is true and `Math.abs(null)` is 0, so every row claimed a measured zero.
      expect(row.delta).not.toMatch(/m²/)
      expect(digits(row.delta)).not.toBe('0')
    }

    // What is measured is the pixel delta, signed off the pixel count.
    expect(water.delta.startsWith('+')).toBe(true)
    expect(digits(water.delta)).toBe('23755')
    expect(water.delta.endsWith(' px')).toBe(true)

    const vegetation = rows.find((r) => /vegetation/i.test(r.class))!
    expect(vegetation.delta.startsWith('-')).toBe(true)
    expect(digits(vegetation.delta)).toBe('20589')
  })

  it('signs the relative change so growth cannot read as loss', () => {
    const { rows } = classTable(model)
    // Water more than doubled; unsigned "115.3%" beside a "—" was indistinguishable from a fall.
    expect(rows.find((r) => /water/i.test(r.class))!.relative).toMatch(/^\+115\.\d%$/)
    expect(rows.find((r) => /vegetation/i.test(r.class))!.relative).toMatch(/^-31\.3%$/)
  })

  it('falls back to the measured pixel counts for before and after', () => {
    const water = classTable(model).rows.find((r) => /water/i.test(r.class))!
    expect(digits(water.before)).toBe('20593')
    expect(digits(water.after)).toBe('44348')
    expect(water.before).not.toBe('—')
    expect(water.after).not.toBe('—')
  })

  it('reports transition extents in pixels instead of a column of dashes', () => {
    const table = findings(model)
      .blocks.filter(isTable)
      .find((b) => /transitions/i.test(b.table.caption ?? ''))!.table
    expect(table.columns.find((c) => c.key === 'area')!.label).toBe('Extent')
    expect(table.rows.map((r) => r.area)).not.toContain('—')
    expect(table.rows.map((r) => digits(r.area))).toEqual(['22484', '15302'])
  })

  it('headlines the measured extent and says why there is no ground area', () => {
    const field = findings(model)
      .blocks.filter(isFields)
      .flatMap((b) => b.fields)
      .find((f) => /changed (area|extent)/i.test(f.label))!
    expect(field.label).toBe('Changed extent')
    expect(digits(field.value)).toBe('100620')
    expect(field.value).not.toBe('—')
    expect(field.hint).toMatch(/no georeference, so no ground area/i)
  })

  it('states the dominant transition extent rather than "(—)"', () => {
    const callout = findings(model)
      .blocks.filter(isCallout)
      .find((c) => c.title === 'Dominant change')!
    expect(callout.body).not.toMatch(/\(—\)/)
    expect(callout.body).toMatch(/22\.4% of the changed area/)
    expect(callout.body).toMatch(/\d px\)\./)
  })

  it('keeps ground areas when the pair is georeferenced', () => {
    const georeferenced = buildReportModel(
      changeResult({
        data: {
          ...CHANGE,
          changed_area_m2: 10_062_000,
          class_deltas: [
            {
              ...CHANGE.class_deltas[0],
              area_m2_before: 2_059_300,
              area_m2_after: 4_434_800,
              area_m2_delta: 2_375_500,
            },
          ],
        } as ChangeData,
      }),
      GENERATED_AT,
    )
    const { columns, rows } = classTable(georeferenced)
    expect(columns.find((c) => c.key === 'delta')!.label).toBe('Δ area')
    expect(rows[0].delta).toBe('+2.38 km²')
    expect(rows[0].before).toBe('2.06 km²')
  })
})

describe('report answer and weak-evidence caveat', () => {
  const model = buildReportModel(changeResult(), GENERATED_AT)

  it('separates "cannot conclude" from "no answer given"', () => {
    expect(model.withheld).toBe(false)
    expect(model.unreliable).toBe(true)
    expect(model.caveat).not.toBeNull()
    expect(model.caveat!.title).toMatch(/do not support a reliable conclusion/i)
    // Says which measurement was limiting, instead of leaving the reader to guess.
    expect(model.caveat!.body).toMatch(/limiting factor: registration/i)
    expect(model.caveat!.body).toMatch(/offset 82\.50 px/)
    // The old flag was `answer_withheld !== null || !sufficient`, and its banner asserted that no
    // conclusion was possible immediately above a measured one.
    expect(model.caveat!.title).not.toMatch(/insufficient evidence for a reliable conclusion/i)
  })

  it('adds no caveat when the backend called the evidence sufficient', () => {
    const ok = buildReportModel(
      changeResult({
        confidence: {
          level: 'low',
          score: 0.494,
          sufficient: true,
          limiting_factor: 'evidence_strength',
          reasons: ['Spectral separability is weak.'],
          factors: [],
        },
      }),
      GENERATED_AT,
    )
    expect(ok.unreliable).toBe(false)
    expect(ok.caveat).toBeNull()
  })

  it('marks a withheld answer as withheld, with no weak-evidence caveat on top of it', () => {
    const held = buildReportModel(
      changeResult({ answer_withheld: 'There are 42 buildings.', answer: 'Withheld.' }),
      GENERATED_AT,
    )
    expect(held.withheld).toBe(true)
    expect(held.caveat).toBeNull()
    expect(held.withheldDraft).toBe('There are 42 buildings.')
  })

  it('renders the answer before the caveat on screen, and drops the old heading', () => {
    render(<ReportDocument model={model} />)
    expect(screen.getByText(ANSWER)).toBeInTheDocument()
    expect(screen.getByText(model.caveat!.title)).toBeInTheDocument()
    expect(screen.queryByText(/insufficient evidence for a reliable conclusion/i)).toBeNull()
  })

  it('renders the answer before the caveat in the downloadable file too', () => {
    const html = renderReportHtml(model)
    expect(html).not.toMatch(/Insufficient evidence for a reliable conclusion/)
    const answerAt = html.indexOf('Change was detected across 66.1%')
    const caveatAt = html.indexOf('do not support a reliable conclusion')
    expect(answerAt).toBeGreaterThan(-1)
    expect(caveatAt).toBeGreaterThan(answerAt)
    // And the fabricated zero never reaches the file.
    expect(html).not.toMatch(/\+0 m²/)
  })
})
