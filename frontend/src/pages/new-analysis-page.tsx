import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Layers,
  Radio,
  Clock,
  Merge,
  UploadCloud,
  FileCheck2,
  FileText,
  AlertCircle,
  Cpu,
  ArrowRight,
  RefreshCw,
  Activity,
  Compass,
  Zap,
} from 'lucide-react'
import type { InputMode, AnalysisResult } from '@/types/api'
import { analyze, ApiRequestError } from '@/services/api'
import { loadFixture } from '@/services/fixtures'
import { MODE_SLOTS, MODE_EXAMPLE_QUERIES, validateFile } from '@/lib/uploads'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ResultMap } from '@/components/result/result-map'
import { ConfidenceMeter } from '@/components/result/confidence-meter'
import { EvidencePanel } from '@/components/result/evidence-panel'
import { ExecutionTrace } from '@/components/result/execution-trace'
import { DataPanel } from '@/components/result/data-panel'
import { modeLabel, taskLabel, formatDuration } from '@/lib/format'

const MODES = [
  {
    id: 'single_optical' as InputMode,
    number: '01',
    label: 'SINGLE OPTICAL',
    summary: 'Single-scene optical analysis',
    description: 'Land cover classification, spectral indices (NDVI/NDWI), region grounding, and visual QA on Sentinel-2 or optical imagery.',
    icon: Layers,
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  },
  {
    id: 'single_sar' as InputMode,
    number: '02',
    label: 'SINGLE SAR',
    summary: 'Radar backscatter analysis',
    description: 'Multiplicative Lee speckle filtering in linear power + Otsu scattering-regime segmentation (smooth, diffuse, double-bounce).',
    icon: Radio,
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'optical_sar_pair' as InputMode,
    number: '03',
    label: 'OPTICAL + SAR',
    summary: 'Cross-modal decision fusion',
    description: 'Arbitrates physics between radar double-bounce (vertical built-up) and optical SWIR/NIR absorption (surface composition).',
    icon: Merge,
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  },
  {
    id: 'bitemporal_pair' as InputMode,
    number: '04',
    label: 'BI-TEMPORAL',
    summary: 'Multi-date change detection',
    description: 'Change Vector Analysis (CVA) + transition matrices to identify what changed, where it changed, and exact affected area.',
    icon: Clock,
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  },
]

const DEMO_PRESETS: Record<InputMode, {
  name: string
  query: string
  files: { url: string; filename: string }[]
  fixtureId: string
}> = {
  single_optical: {
    name: 'Optical Grounding & Water Bodies',
    query: 'Highlight the water bodies and estimate coverage.',
    files: [{ url: '/demo-data/optical/scene_optical.tif', filename: 'scene_optical.tif' }],
    fixtureId: 'SAT-2026-000102',
  },
  single_sar: {
    name: 'Sentinel-1 SAR Backscatter Regimes',
    query: 'Describe the SAR backscatter and scattering regimes in this scene.',
    files: [{ url: '/demo-data/sar/scene_sar_vv.tif', filename: 'scene_sar_vv.tif' }],
    fixtureId: 'SAT-2026-000104',
  },
  optical_sar_pair: {
    name: 'Optical + SAR Built-up Arbitration',
    query: 'Use the optical and SAR images together to identify built-up and water-covered regions.',
    files: [
      { url: '/demo-data/optical/scene_optical.tif', filename: 'scene_optical.tif' },
      { url: '/demo-data/sar/scene_sar_vv.tif', filename: 'scene_sar_vv.tif' },
    ],
    fixtureId: 'SAT-2026-000105',
  },
  bitemporal_pair: {
    name: 'Bi-Temporal Change: Built-up Expansion',
    query: 'What changed between these two dates, and where did the change occur?',
    files: [
      { url: '/demo-data/temporal/scene_t1_optical.tif', filename: 'scene_t1_optical.tif' },
      { url: '/demo-data/temporal/scene_t2_optical.tif', filename: 'scene_t2_optical.tif' },
    ],
    fixtureId: 'SAT-2026-000106',
  },
}

export function NewAnalysisPage() {
  const [searchParams] = useSearchParams()
  const initialMode = (searchParams.get('mode') as InputMode) || 'single_optical'
  const initialQuery = searchParams.get('q') || ''

  const [mode, setMode] = useState<InputMode>(initialMode)
  const [files, setFiles] = useState<(File | null)[]>(() => MODE_SLOTS[initialMode].map(() => null))
  const [fileErrors, setFileErrors] = useState<(string | null)[]>(() => MODE_SLOTS[initialMode].map(() => null))
  const [query, setQuery] = useState(initialQuery)
  const [submitting, setSubmitting] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [submitError, setSubmitError] = useState<ApiRequestError | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [agentStep, setAgentStep] = useState<number>(0)

  const slots = MODE_SLOTS[mode]

  // Synchronize when mode changes
  function handleModeChange(next: InputMode) {
    setMode(next)
    setFiles(MODE_SLOTS[next].map(() => null))
    setFileErrors(MODE_SLOTS[next].map(() => null))
    setSubmitError(null)
    setResult(null)
    if (!query || MODE_EXAMPLE_QUERIES[mode]?.includes(query)) {
      setQuery(DEMO_PRESETS[next].query)
    }
  }

  // Pre-load demo dataset files
  async function loadDemoPreset() {
    setLoadingDemo(true)
    setSubmitError(null)
    const preset = DEMO_PRESETS[mode]
    setQuery(preset.query)

    try {
      const loadedFiles: File[] = []
      for (const item of preset.files) {
        const resp = await fetch(item.url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        const f = new File([blob], item.filename, { type: 'image/tiff' })
        loadedFiles.push(f)
      }
      setFiles(loadedFiles)
      setFileErrors(loadedFiles.map(() => null))
    } catch {
      // If fetching static file fails, try loading fixture
      try {
        const fx = await loadFixture(preset.fixtureId)
        if (fx) {
          setResult(fx)
        }
      } catch {
        // Ignore
      }
    } finally {
      setLoadingDemo(false)
    }
  }

  function handleFile(index: number, file: File | null) {
    setFiles((prev) => {
      const copy = [...prev]
      copy[index] = file
      return copy
    })
    setFileErrors((prev) => {
      const copy = [...prev]
      copy[index] = file ? validateFile(file) : null
      return copy
    })
    setSubmitError(null)
  }

  const allFilesProvided = slots.every((_, i) => Boolean(files[i] && typeof (files[i] as any).name === 'string'))
  const anyFileError = fileErrors.some((e) => e !== null)
  const queryProvided = query.trim().length > 0
  const canSubmit = allFilesProvided && !anyFileError && queryProvided && !submitting

  // Simulated agent visual progression during live execution
  useEffect(() => {
    if (!submitting) {
      setAgentStep(0)
      return
    }
    setAgentStep(1)
    const t1 = setTimeout(() => setAgentStep(2), 500)
    const t2 = setTimeout(() => setAgentStep(3), 1200)
    const t3 = setTimeout(() => setAgentStep(4), 2200)
    const t4 = setTimeout(() => setAgentStep(5), 3200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [submitting])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    const selected = files.filter((f): f is File => Boolean(f && typeof (f as any).name === 'string'))
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await analyze({ mode, query: query.trim(), files: selected })
      setResult(res)
    } catch (err: any) {
      if (err instanceof ApiRequestError || (err && (err.errorCode || err.error_code))) {
        setSubmitError(err as ApiRequestError)
      } else {
        setSubmitError(
          new ApiRequestError({
            message: err?.message || 'Execution error. Check backend connection.',
            error_code: err?.errorCode || err?.error_code || 'unknown_error',
            recoverable: true,
          }),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const agentPhases = [
    { step: 1, name: 'Understanding Query', desc: 'Weighted lexicon classification' },
    { step: 2, name: 'Validating Imagery', desc: 'CRS, bounds, & pair compatibility' },
    { step: 3, name: 'Selecting Specialist', desc: 'Agent Router contract check' },
    { step: 4, name: 'Executing Remote Sensing Tool', desc: 'Physics-based spectral/SAR CVA' },
    { step: 5, name: 'Evidence & Confidence Scoring', desc: 'Gated corroboration & separability' },
    { step: 6, name: 'Generating Spatial Grounding', desc: 'Artifact rendering & response synthesis' },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analysis Workspace</h1>
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[10px]">
              3-COLUMN INTERACTIVE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Multimodal Satellite Vision-Language Assistant · Mode-Driven Specialist Orchestration
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDemoPreset}
            disabled={loadingDemo || submitting}
            className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs gap-1.5 font-medium"
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>{loadingDemo ? 'Loading...' : '1-Click Load Demo Data'}</span>
          </Button>
          {result && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-border bg-card text-foreground text-xs gap-1.5"
            >
              <Link to={`/analysis/${result.id}/report`}>
                <FileText className="h-3.5 w-3.5" />
                <span>Export Report</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 3-COLUMN DESKTOP WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* COLUMN 1: INPUTS (COL-SPAN 4) */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          {/* ANALYSIS MODE SELECTOR */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-border">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>01 · Analysis Mode</span>
                <span className="font-mono text-[10px] text-primary">4 Supported</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const Icon = m.icon
                  const active = mode === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeChange(m.id)}
                      className={`flex flex-col text-left p-2.5 rounded-lg border transition-all ${
                        active
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/40 font-semibold'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-mono text-[10px] text-muted-foreground">{m.number}</span>
                        <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <span className="text-xs font-bold truncate">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{m.summary}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground p-2 rounded bg-secondary/50 border border-border leading-tight">
                {MODES.find((m) => m.id === mode)?.description}
              </p>
            </CardContent>
          </Card>

          {/* FILE UPLOAD SLOTS */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  02 · Imagery Inputs
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  GeoTIFF / TIFF / PNG
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {slots.map((slot, index) => {
                const currentFile = files[index]
                const err = fileErrors[index]
                return (
                  <div
                    key={slot.role}
                    className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{slot.label}</span>
                      <span className="font-mono text-[10px] text-primary uppercase font-medium">{slot.role}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{slot.hint}</p>

                    {/* Upload Field */}
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-secondary/60 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept=".tif,.tiff,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null
                          handleFile(index, selected)
                        }}
                        className="hidden"
                      />
                      {currentFile ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium truncate w-full">
                          <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="truncate">{currentFile.name}</span>
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground shrink-0">
                            {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UploadCloud className="h-4 w-4 text-muted-foreground" />
                          <span>Choose or drop raster file</span>
                        </div>
                      )}
                    </label>

                    {err && <p className="text-[11px] text-rose-500 font-medium">{err}</p>}
                  </div>
                )
              })}

              {/* Pre-flight Validation Checklist */}
              <div className="rounded-lg border border-border bg-secondary/40 p-2.5 text-[11px] space-y-1">
                <div className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wide mb-1">
                  Pre-flight Validation
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Required slots:</span>
                  <span className={allFilesProvided ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                    {files.filter(Boolean).length} / {slots.length} Ready
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">File format & bounds:</span>
                  <span className="text-emerald-500 font-mono font-medium">GeoTIFF / Rasterio Gate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modality resolution:</span>
                  <span className="text-primary font-mono font-medium">{modeLabel(mode)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI QUERY COMPOSER */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-border">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>03 · Natural Language Query</span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your satellite imagery..."
                rows={3}
                className="bg-background border-border text-xs text-foreground placeholder:text-muted-foreground resize-none focus-visible:ring-primary"
              />

              {/* Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                  Suggested Questions:
                </span>
                <div className="flex flex-col gap-1">
                  {(MODE_EXAMPLE_QUERIES[mode] || []).slice(0, 3).map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuery(ex)}
                      className="text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-secondary/80 p-1.5 rounded transition-colors truncate"
                    >
                      • {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error banner */}
              {submitError && (
                <Alert variant="destructive" className="p-3 text-xs bg-destructive/10 border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold">Execution Failed</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">
                    {submitError.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs py-2.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ANALYZING SATELLITE DATA...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>ANALYZE SATELLITE DATA</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: SATELLITE VIEWER / AGENT STATE (COL-SPAN 5) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Satellite Viewer & Spatial Canvas
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Interactive multi-layer geospatial projection
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                {result ? 'Result Overlays' : 'Canvas Idle'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {/* ACTIVE AGENT VISUALIZATION (DURING SUBMIT) */}
              {submitting ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-6 min-h-[420px] rounded-lg border border-primary/30 bg-card">
                  <div className="relative flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <Cpu className="absolute h-8 w-8 text-primary animate-pulse" />
                  </div>

                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-foreground tracking-wide">
                      SATQUERY AGENT IN EXECUTION
                    </h3>
                    <p className="text-xs text-primary font-mono">
                      Query intent: "{query.slice(0, 40)}..."
                    </p>
                  </div>

                  <div className="w-full max-w-sm space-y-2 border-t border-border pt-4">
                    {agentPhases.map((phase) => {
                      const isDone = agentStep > phase.step
                      const isCurrent = agentStep === phase.step
                      return (
                        <div
                          key={phase.step}
                          className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                            isDone
                              ? 'text-emerald-500 font-medium'
                              : isCurrent
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className="font-mono text-[10px] w-4">
                            {isDone ? '✓' : isCurrent ? '●' : '○'}
                          </span>
                          <span className="flex-1">{phase.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isDone ? 'DONE' : isCurrent ? 'RUNNING' : 'WAIT'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : result && result.artifacts && result.artifacts.length > 0 ? (
                /* LIVE MAP VIEWER WITH ARTIFACTS */
                <ResultMap artifacts={result.artifacts} />
              ) : (
                /* IDLE / PREVIEW STATE */
                <div className="flex flex-col items-center justify-center p-8 space-y-4 min-h-[420px] rounded-lg border border-dashed border-border bg-secondary/20 text-center">
                  <div className="p-4 rounded-full bg-secondary border border-border text-muted-foreground">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-semibold text-foreground">
                      Satellite Canvas Ready
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select an analysis mode, attach your satellite rasters (or click{' '}
                      <span className="text-primary font-medium">1-Click Load Demo Data</span>), and ask a question.
                      The agent will render the base composite and task overlays here.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadDemoPreset}
                    disabled={loadingDemo}
                    className="border-border bg-card text-xs text-foreground hover:bg-accent"
                  >
                    Quick Load {DEMO_PRESETS[mode].name}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quantitative Breakdown when result available */}
          {result && result.data && Object.keys(result.data).length > 0 && (
            <DataPanel data={result.data} />
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: AI ANALYSIS & FINDINGS (COL-SPAN 3) */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Answer Card */}
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      SatQuery Findings
                    </CardTitle>
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                      {taskLabel(result.task)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-foreground leading-relaxed font-medium">
                      {result.answer}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border text-muted-foreground">
                    <span>Specialist Tool:</span>
                    <span className="font-mono text-primary font-semibold">{result.tool}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Execution Tier:</span>
                    <span className="font-mono uppercase text-foreground">{result.tier}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Duration:</span>
                    <span className="font-mono text-foreground">{formatDuration(result.duration_ms)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Meter */}
              <ConfidenceMeter confidence={result.confidence} />

              {/* Spatial Evidence */}
              <EvidencePanel evidence={result.evidence} warnings={result.warnings} />
            </div>
          ) : (
            /* Mode Guidance Card */
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Mode Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-foreground">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">Active Mode:</div>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {modeLabel(mode)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  SatQuery AI routes queries through deterministic remote-sensing algorithms. All claims are supported by spectral indices, radar backscatter analysis, or spatial vector masks.
                </p>
                <div className="space-y-1.5 pt-2 border-t border-border text-[11px]">
                  <div className="font-medium text-foreground">Physics Guarantee:</div>
                  <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                    <li>Zero generative LLM pixel hallucination</li>
                    <li>Otsu & Sarle adaptive thresholding</li>
                    <li>Lee multiplicative speckle filtering</li>
                    <li>Dual-detector CVA agreement</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM SECTION: AGENT EXECUTION TRACE */}
      {/* ======================================================== */}
      {result && result.trace && result.trace.length > 0 && (
        <div className="border-t border-border pt-6">
          <ExecutionTrace trace={result.trace} />
        </div>
      )}
    </div>
  )
}
