/**
 * How a weak, non-georeferenced change run must be presented.
 *
 * Every number below was recorded from a real run (SAT-2026-000154: two non-georeferenced
 * screenshots, 82.5 px apart, confidence `insufficient` at 0.081). The run itself was honest — the
 * result page was not. It simultaneously declined to conclude and stated a conclusion, showed a
 * class that grew by 115% with a "no change" dash, called an index that rose "Decrease", and summed
 * its trace to 479 ms against a measured 380 ms. Each of those is pinned here.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnswerCard } from '@/components/result/answer-card'
import { ExecutionTrace } from '@/components/result/execution-trace'
import { ChangePanel } from '@/components/result/panels/change-panel'
import type { AnalysisResult, ChangeData, TraceStep } from '@/types/api'

/** Confidence exactly as the backend measured it for that run. */
const INSUFFICIENT = {
  level: 'insufficient' as const,
  score: 0.0806,
  sufficient: false,
  limiting_factor: 'registration',
  reasons: [
    'Image co-registration scored 0.08 (offset 82.50 px, structural NCC 0.22).',
    'Change evidence: magnitude bimodality 0.67 (two-population threshold 0.56), 18% of detected change corroborated by both detectors.',
  ],
  factors: [
    {
      name: 'registration',
      value: 0.0806,
      weight: 0.2,
      kind: 'gate' as const,
      reason: 'Image co-registration scored 0.08 (offset 82.50 px, structural NCC 0.22).',
    },
  ],
}

/** Only the fields AnswerCard reads; it never touches the panels or inputs. */
function answerResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    query: 'What changed between the two dates?',
    answer:
      'Change was detected across 66.1% of the valid area. The dominant transition is vegetation to bare soil, covering 22% of the changed area.',
    answer_withheld: null,
    status: 'partial',
    confidence: INSUFFICIENT,
    ...overrides,
  } as AnalysisResult
}

describe('AnswerCard with insufficient evidence', () => {
  it('states the measurements and the caveat separately, naming the limiting factor', () => {
    render(<AnswerCard result={answerResult()} />)

    // The measured answer is present as the answer, not as the body of a refusal.
    expect(screen.getByText(/change was detected across 66\.1%/i)).toBeInTheDocument()

    // The caveat is about the support for a conclusion, and it says what limited it.
    expect(
      screen.getByText(/these measurements do not support a reliable conclusion/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Registration')).toBeInTheDocument()
    expect(screen.getByText(/offset 82\.50 px/i)).toBeInTheDocument()

    // The old heading asserted no conclusion was possible and then printed one underneath it.
    expect(screen.queryByText(/insufficient evidence for a reliable conclusion/i)).toBeNull()
  })

  it('adds no caveat when the backend called the evidence sufficient', () => {
    render(
      <AnswerCard
        result={answerResult({
          confidence: { ...INSUFFICIENT, level: 'low', score: 0.494, sufficient: true },
        })}
      />,
    )
    expect(screen.getByText(/change was detected across 66\.1%/i)).toBeInTheDocument()
    expect(screen.queryByText(/do not support a reliable conclusion/i)).toBeNull()
  })

  it('marks a withheld answer as withheld rather than as weak evidence', () => {
    render(
      <AnswerCard
        result={answerResult({ answer_withheld: 'There are 42 buildings.', answer: 'Withheld.' })}
      />,
    )
    expect(screen.getByText('Answer withheld')).toBeInTheDocument()
    expect(screen.getByText(/there are 42 buildings/i)).toBeInTheDocument()
  })
})

describe('ExecutionTrace timings', () => {
  // The real six steps: one 55 ms, one untimed, three sub-millisecond, one 324 ms.
  const steps: TraceStep[] = [
    {
      step: 'preprocess',
      tool: 'RasterPreprocessor',
      status: 'ok',
      duration_ms: 55,
      summary: 'Loaded 2 raster(s)',
      parameters: {},
      warnings: [],
    },
    {
      step: 'classify',
      tool: 'ModeNormalizer',
      status: 'ok',
      duration_ms: null,
      summary: 'Mode resolved',
      parameters: {},
      warnings: [],
    },
    {
      step: 'classify',
      tool: 'AgentRouter',
      status: 'ok',
      duration_ms: 0,
      summary: 'Routed',
      parameters: {},
      warnings: [],
    },
    {
      step: 'validate',
      tool: 'ToolRegistry',
      status: 'ok',
      duration_ms: 0,
      summary: 'Contract satisfied',
      parameters: {},
      warnings: [],
    },
    {
      step: 'execute',
      tool: 'change-cva-cv',
      status: 'warning',
      duration_ms: 324,
      summary: 'Executed',
      parameters: {},
      warnings: ['Images misaligned by 82.5 px'],
    },
    {
      step: 'score',
      tool: 'ConfidenceEngine',
      status: 'ok',
      duration_ms: 0,
      summary: 'Scored',
      parameters: {},
      warnings: [],
    },
  ]

  it('sums only measured steps, so the total cannot exceed the run', () => {
    render(<ExecutionTrace trace={steps} />)
    // 55 + 0 + 0 + 324 + 0 = 379 ms against a measured run total of 380 ms. Substituting 25 ms for
    // each of the four untimed/zero steps used to report 479 ms.
    expect(screen.getByText(/379 ms measured/)).toBeInTheDocument()
    expect(screen.queryByText(/479 ms/)).toBeNull()
  })

  it('distinguishes a sub-millisecond step from one that was never timed', () => {
    render(<ExecutionTrace trace={steps} />)
    expect(screen.getByText(/1 not timed separately/)).toBeInTheDocument()
    // Three steps genuinely measured 0; exactly one is not timed separately at all.
    expect(screen.getAllByText(/^OK · <1 ms$/)).toHaveLength(3)
    expect(screen.getByText(/^OK · not timed separately$/)).toBeInTheDocument()
    // Nothing reports the substituted constant.
    expect(screen.queryByText(/25 ms/)).toBeNull()
  })

  it('renders step warnings at full contrast, not in the on-chip warning colour', () => {
    render(<ExecutionTrace trace={steps} />)
    const warning = screen.getByText('Images misaligned by 82.5 px').closest('li')
    // `text-warning-foreground` is near-black in dark mode; over a dark card it was invisible.
    expect(warning?.className).not.toMatch(/text-warning-foreground/)
    expect(warning?.className).toMatch(/text-foreground/)
  })
})

describe('ChangePanel without a georeference', () => {
  /** Recorded from SAT-2026-000154: every area is null, every pixel count is measured. */
  const data: ChangeData = {
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

  function renderPanel() {
    return render(
      <TooltipProvider>
        <ChangePanel data={data} />
      </TooltipProvider>,
    )
  }

  /**
   * A "<n> px" cell, whatever the host locale does to group separators.
   *
   * `formatInt` delegates to `Intl.NumberFormat`, so 100620 renders "100,620" under en-US and
   * "1,00,620" under en-IN. What matters is that the measured count is shown at all.
   */
  function pixelCount(n: number) {
    // Locale group separators vary (comma, dot, NBSP), so compare digits and require the unit.
    return (content: string) =>
      content.endsWith(' px') && content.replace(/[^0-9]/g, '') === String(n)
  }

  it('signs a class change so growth cannot read as loss', () => {
    renderPanel()
    // Water grew by 23,755 px (+115.35%). With the arrow driven off the null ground area, this row
    // rendered as "— 115.3%", visually identical to a decrease.
    expect(screen.getByText(/^\+115\.\d%$/)).toBeInTheDocument()
    expect(screen.getByText(/^-31\.3%$/)).toBeInTheDocument()
  })

  it('falls back to the measured pixel counts instead of three dashes', () => {
    renderPanel()
    expect(screen.getByText(pixelCount(20593))).toBeInTheDocument()
    expect(screen.getByText(pixelCount(44348))).toBeInTheDocument()
    // The headline stat too: it used to read "—" with the measured 100,620 pixels buried in the hint.
    expect(screen.getAllByText(pixelCount(100620)).length).toBeGreaterThan(0)
    expect(screen.getByText(/no georeference, so no ground area/i)).toBeInTheDocument()
  })

  it('shows the count behind a direction that disagrees with the mean', () => {
    renderPanel()
    // +0.009 mean but only 39.7% of changed pixels rose, so the direction is a decrease. Shown
    // alone, the two columns read as a contradiction.
    expect(screen.getByText('+0.009')).toBeInTheDocument()
    expect(screen.getByText('Decrease')).toBeInTheDocument()
    expect(screen.getByText(/39\.7% of changed px rose/)).toBeInTheDocument()
  })
})
