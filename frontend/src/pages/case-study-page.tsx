import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Satellite,
  Sparkles,
  ArrowRight,
  Layers,
  Radio,
  Clock,
  Merge,
  Cpu,
  ShieldCheck,
  Activity,
  Compass,
  Target,
  ExternalLink,
  Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme/theme-toggle'

// Simulated query scenarios for the interactive hero demonstration
const DEMO_SCENARIOS = [
  {
    id: 'change',
    query: 'What changed between these two dates, and where did the change occur?',
    mode: 'BI-TEMPORAL',
    task: 'CHANGE_VQA',
    tools: ['change-cva-cv', 'change-vqa-cv'],
    confidence: '94.2%',
    confidenceLevel: 'High',
    area: '48.2 hectares',
    location: 'North-East Sector (UTM 43N)',
    answer: 'Significant built-up expansion detected in the North-East quadrant (+48.2 ha) transitioning from agricultural/bare soil to urban infrastructure between T1 and T2.',
    steps: [
      { name: 'Input Validation', desc: 'Verified GeoTIFF headers, CRS alignment, and 98.4% spatial overlap.' },
      { name: 'Task Classification', desc: 'Classified query intent as BI_TEMPORAL_CHANGE_VQA (confidence 0.98).' },
      { name: 'Change Vector Analysis', desc: 'Computed multi-spectral index difference vectors with MAD-based outlier thresholding.' },
      { name: 'Evidence Extraction', desc: 'Generated binary change polygon mask and transition matrix.' },
      { name: 'Confidence & Synthesis', desc: 'Corroborated two-detector agreement; synthesized grounded textual response.' },
    ],
  },
  {
    id: 'fusion',
    query: 'Use optical and SAR imagery together to identify built-up and water-covered regions.',
    mode: 'OPTICAL + SAR',
    task: 'OPTICAL_SAR_ANALYSIS',
    tools: ['sar-backscatter-cv', 'fusion-decision-cv'],
    confidence: '96.8%',
    confidenceLevel: 'High',
    area: '112.5 ha Urban / 34.1 ha Water',
    location: 'Central Corridor & South Canal',
    answer: 'Cross-modal decision fusion resolved built-up areas via Sentinel-1 double-bounce backscatter (> -6 dB) while Sentinel-2 SWIR/NIR absorption accurately delineated water bodies.',
    steps: [
      { name: 'Input Validation', desc: 'Validated paired Sentinel-2 optical RGB-NIR and Sentinel-1 C-band VV/VH rasters.' },
      { name: 'Task Classification', desc: 'Routed to multimodal physics-based decision fusion.' },
      { name: 'SAR Speckle Filtering', desc: 'Applied 7x7 multiplicative Lee MMSE filter in linear power domain.' },
      { name: 'Decision Arbitration', desc: 'Arbitrated vertical urban double-bounce against optical spectral reflectance.' },
      { name: 'Grounded Output', desc: 'Produced consolidated multi-class geospatial mask and conflict log.' },
    ],
  },
  {
    id: 'grounding',
    query: 'Highlight the water bodies and estimate total surface coverage.',
    mode: 'SINGLE OPTICAL',
    task: 'GROUNDING',
    tools: ['grounding-spectral-cv', 'landcover-spectral-cv'],
    confidence: '98.1%',
    confidenceLevel: 'High',
    area: '22.8% of scene (54.6 ha)',
    location: 'South-West Lake & Tributary',
    answer: 'Identified 2 primary contiguous water bodies spanning 22.8% of scene area. NDWI values exceed Otsu adaptive threshold (0.24) with zero cloud occlusion.',
    steps: [
      { name: 'Raster Ingestion', desc: 'Extracted Green (B3), NIR (B8), and SWIR (B11) bands from Sentinel-2 MSI.' },
      { name: 'Index Computation', desc: 'Calculated NDWI and Modified NDWI (MNDWI) arrays.' },
      { name: 'Otsu Adaptive Slicing', desc: 'Separated water pixels using bimodality-gated thresholding.' },
      { name: 'Vector Contouring', desc: 'Extracted closed polygon geometries and computed UTM geodesic area.' },
      { name: 'Visual Overlay', desc: 'Rendered bounding boxes, centroid pins, and geo-referenced geoJSON overlay.' },
    ],
  },
]

export function CaseStudyPage() {
  const [activeScenario, setActiveScenario] = useState(0)
  const [simulating, setSimulating] = useState(false)
  const [simStep, setSimStep] = useState(5)
  const [activeArchTab, setActiveArchTab] = useState<'flow' | 'registry' | 'fusion' | 'trace'>('flow')
  const [activeTechFilter, setActiveTechFilter] = useState<'all' | 'live' | 'planned'>('all')

  const scenario = DEMO_SCENARIOS[activeScenario]

  function runSimulation(idx: number) {
    setActiveScenario(idx)
    setSimulating(true)
    setSimStep(1)
    setTimeout(() => setSimStep(2), 400)
    setTimeout(() => setSimStep(3), 900)
    setTimeout(() => setSimStep(4), 1400)
    setTimeout(() => {
      setSimStep(5)
      setSimulating(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* STICKY PORTFOLIO HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Satellite className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-wide text-foreground">SATQUERY AI</span>
                <span className="text-[10px] font-mono text-primary font-medium">SIH26167 · TECHNICAL CASE STUDY</span>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#overview" className="hover:text-primary transition-colors">Overview</a>
            <a href="#problem" className="hover:text-primary transition-colors">Problem</a>
            <a href="#solution" className="hover:text-primary transition-colors">Solution</a>
            <a href="#architecture" className="hover:text-primary transition-colors">Architecture</a>
            <a href="#multimodal" className="hover:text-primary transition-colors">Optical + SAR</a>
            <a href="#datasets" className="hover:text-primary transition-colors">Datasets</a>
            <a href="#technology" className="hover:text-primary transition-colors">Technology</a>
            <a href="#impact" className="hover:text-primary transition-colors">Impact</a>
            <a href="#roadmap" className="hover:text-primary transition-colors">Roadmap</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20">
              <Link to="/analyze">
                <span>Launch Workspace</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 1. HERO SECTION */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card via-card/80 to-background pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute right-0 top-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 -mb-24 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Hero Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Smart India Hackathon 2026
            </span>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              ID: SIH26167
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              Theme: Space and Technology
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
              Team: SHOURYANGULU
            </Badge>
          </div>

          {/* Hero Main Copy */}
          <div className="max-w-4xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
              Ask Your Satellite Imagery <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">Anything.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-normal leading-relaxed max-w-3xl">
              An interactive vision-language assistant for multimodal remote sensing image analysis through natural-language queries.
            </p>

            {/* Core Pipeline Statement */}
            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs font-mono text-foreground shadow-sm">
              <span className="text-primary font-bold">Natural Language</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground font-semibold">AI Agent</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-bold">Multimodal Analysis</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-emerald-500 font-bold">Spatial Evidence</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground font-semibold">Grounded Answer</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* INTERACTIVE QUERY DEMONSTRATION SIMULATOR */}
          {/* ======================================================== */}
          <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="border-b border-border bg-secondary/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Interactive Pipeline Demonstration
                </span>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
                  Conceptual Simulation
                </Badge>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {DEMO_SCENARIOS.map((s, idx) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant={activeScenario === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => runSimulation(idx)}
                    disabled={simulating}
                    className="text-xs font-medium h-7 px-2.5"
                  >
                    {s.mode}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Query + Execution Steps */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wide">
                    Input Natural Language Query
                  </span>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-foreground">
                    "{scenario.query}"
                  </div>
                </div>

                {/* Simulated Stepper */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                      Agentic Orchestration Trace
                    </span>
                    <span className="font-mono text-primary text-[11px]">
                      {simulating ? 'Processing Step ' + simStep + '/5...' : 'Analysis Complete'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {scenario.steps.map((st, i) => {
                      const isPast = simStep > i + 1 || !simulating
                      const isCurrent = simStep === i + 1 && simulating
                      return (
                        <div
                          key={i}
                          className={`rounded-md border p-2.5 transition-all text-xs flex items-start gap-3 ${
                            isPast
                              ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                              : isCurrent
                              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                              : 'border-border bg-secondary/20 text-muted-foreground opacity-50'
                          }`}
                        >
                          <span className="font-mono text-[10px] w-5 text-center mt-0.5 shrink-0 font-bold">
                            {isPast ? '✓' : isCurrent ? '●' : '0' + (i + 1)}
                          </span>
                          <div className="space-y-0.5 flex-1">
                            <span className="font-semibold text-foreground block">{st.name}</span>
                            <span className="text-[11px] text-muted-foreground block">{st.desc}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Output & Grounded Findings */}
              <div className="lg:col-span-6 space-y-5">
                <Card className="border-border bg-secondary/30 shadow-none">
                  <CardHeader className="p-4 pb-2 border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Grounded Synthesis Output
                      </CardTitle>
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                        Task: {scenario.task}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {scenario.answer}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border text-xs">
                      <div className="rounded border border-border bg-card p-2">
                        <span className="text-[10px] text-muted-foreground block">Confidence</span>
                        <span className="font-mono font-bold text-emerald-500 text-sm">{scenario.confidence}</span>
                      </div>
                      <div className="rounded border border-border bg-card p-2">
                        <span className="text-[10px] text-muted-foreground block">Measured Extent</span>
                        <span className="font-mono font-bold text-foreground text-xs">{scenario.area}</span>
                      </div>
                      <div className="rounded border border-border bg-card p-2 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-muted-foreground block">Spatial Sector</span>
                        <span className="font-mono font-bold text-primary text-xs truncate block">{scenario.location}</span>
                      </div>
                    </div>

                    <div className="rounded border border-border bg-card p-3 space-y-1.5 text-[11px]">
                      <span className="font-semibold text-foreground uppercase text-[10px] tracking-wide block">
                        Specialist Tools Invoked
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {scenario.tools.map((t) => (
                          <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Zero LLM pixel hallucination</span>
                  <Link to="/analyze" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                    Try with live GeoTIFFs <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. PROJECT OVERVIEW */}
      {/* ======================================================== */}
      <section id="overview" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              01 · Project Overview
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Making Satellite Image Analysis Conversational
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Remote-sensing imagery contains rich physical information about the Earth’s surface, atmosphere, and infrastructure. However, extracting actionable intelligence traditionally demands deep GIS domain knowledge, manual band math configuration, and complex multi-tool workflows.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                  <Compass className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">The Expertise Barrier</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  Analysts must manually select spectral bands, configure radiometric calibrations, align coordinate reference systems (CRS), and script raster operations before obtaining a basic answer.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-2">
                  <Merge className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Multimodal Complexity</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  Combining optical multispectral imagery (Sentinel-2) with synthetic aperture radar (Sentinel-1 SAR) is mathematically non-trivial. Reconciling radar speckle and backscatter with optical absorption requires specialist physics arbitration.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">Conversational Paradigm</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  SatQuery AI replaces fragmented toolchains with an orchestrating vision-language agent. Users simply state their objective in natural language, and the system executes the correct remote sensing algorithms with auditable evidence.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. THE PROBLEM & WORKFLOW COMPARISON */}
      {/* ======================================================== */}
      <section id="problem" className="py-16 lg:py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-rose-500/30 text-rose-500 uppercase tracking-widest text-[10px]">
              02 · The Problem
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Why Traditional Earth Observation Workflows Fail at Scale
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              While Earth observation satellites capture terabytes of daily acquisitions, decision-makers face steep friction translating raw pixels into reliable insights.
            </p>
          </div>

          {/* 7 Core Challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: '01', title: 'Information Density', desc: 'Satellite imagery contains 12+ spectral bands, polarimetric channels, and geodetic metadata that standard computer vision pipelines cannot interpret.' },
              { num: '02', title: 'Specialist Dependency', desc: 'Calculating NDVI, NDWI, or Change Vectors requires domain knowledge in raster algebra and remote-sensing physics.' },
              { num: '03', title: 'Multimodal Divergence', desc: 'Optical sensors struggle in cloud cover; SAR penetrates weather but requires speckle filtering and geometric terrain correction.' },
              { num: '04', title: 'Temporal Disagreement', desc: 'Bi-temporal change detection requires precise spatial co-registration, radiometric normalization, and threshold calibration.' },
              { num: '05', title: 'Fragmented Tooling', desc: 'Users must jump between QGIS, Python scripts, GDAL CLI tools, and separate reporting packages.' },
              { num: '06', title: 'Black-Box Hallucination', desc: 'Generic Vision-Language LLMs produce convincing but completely fabricated geospatial answers with no pixel connection.' },
              { num: '07', title: 'Zero Observability', desc: 'Traditional automated models produce a label without providing step-by-step verifiable evidence or confidence provenance.' },
              { num: '08', title: 'Accessibility Barrier', desc: 'Domain analysts, emergency responders, and urban planners lack accessible natural-language querying interfaces.' },
            ].map((p) => (
              <div key={p.num} className="rounded-lg border border-border bg-card p-4 space-y-2 shadow-sm">
                <span className="font-mono text-xs font-bold text-rose-500">{p.num}</span>
                <h3 className="text-sm font-bold text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Workflow Contrast Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
            {/* Traditional Workflow */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Traditional Remote Sensing Workflow</span>
                <Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[10px]">High Friction · 6-12 Steps</Badge>
              </div>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>1. Satellite Raster Download (GeoTIFF)</span>
                  <span className="text-rose-500 text-[10px]">Manual</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>2. CRS Reprojection & Grid Alignment</span>
                  <span className="text-rose-500 text-[10px]">GDAL / QGIS</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>3. Band Math Scripting (NDVI / NDWI / NDBI)</span>
                  <span className="text-rose-500 text-[10px]">Custom Python</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>4. SAR Speckle Filtering & Calibration</span>
                  <span className="text-rose-500 text-[10px]">SNAP / ENVI</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>5. Manual Thresholding & Vectorization</span>
                  <span className="text-rose-500 text-[10px]">Human Subjective</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between font-bold text-foreground">
                  <span>6. Static Report Document Assembled</span>
                  <span className="text-rose-500 text-[10px]">Hours Later</span>
                </div>
              </div>
            </div>

            {/* SatQuery AI Workflow */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">SatQuery AI Agentic Workflow</span>
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">Automated · Real-Time</Badge>
              </div>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between text-foreground font-semibold">
                  <span>1. User Natural Language Query</span>
                  <span className="text-primary text-[10px]">"What changed between T1 & T2?"</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>2. Pre-flight Metadata & CRS Gate</span>
                  <span className="text-emerald-500 text-[10px]">Automated</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>3. Agentic Controller Task Routing</span>
                  <span className="text-primary text-[10px]">MODEL_REGISTRY</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>4. Physics-Grounded Specialist Execution</span>
                  <span className="text-primary text-[10px]">Deterministic CVA / SAR</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between">
                  <span>5. Spatial Evidence Extraction & Gating</span>
                  <span className="text-emerald-500 text-[10px]">Pixel Mask + Vector</span>
                </div>
                <div className="p-2.5 rounded bg-background/80 border border-border flex items-center justify-between font-bold text-foreground">
                  <span>6. Grounded Answer + Trace + Audit Report</span>
                  <span className="text-emerald-500 text-[10px]">Instantaneous</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. OUR SOLUTION & CORE ARCHITECTURE */}
      {/* ======================================================== */}
      <section id="solution" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              03 · The Solution
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One Question. Multiple Analysis Paths.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              SatQuery AI does not rely on a monolithic generative LLM to inspect pixels. Instead, an <strong>Agentic Controller</strong> parses query intent, inspects raster metadata, and dispatches deterministic remote-sensing specialist algorithms registered in the system.
            </p>
          </div>

          {/* 11-Step Lifecycle Flowchart */}
          <div className="rounded-xl border border-border bg-card p-6 lg:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              End-to-End Analysis Request Lifecycle (§3 Architecture)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: '01', title: 'Query Ingestion', desc: 'Natural language text + GeoTIFF raster uploads.' },
                { step: '02', title: 'Input Validation', desc: 'CRS, bounds, band mapping, and pair alignment.' },
                { step: '03', title: 'Agent Routing', desc: 'QueryTask classification against MODEL_REGISTRY.' },
                { step: '04', title: 'Specialist Exec', desc: 'Deterministic spectral index / Lee SAR / CVA.' },
                { step: '05', title: 'Evidence Gating', desc: 'Verification that measured pixels support claims.' },
                { step: '06', title: 'Confidence Score', desc: 'Multi-factor calculation from signal separability.' },
                { step: '07', title: 'Answer Synthesis', desc: 'Template-grounded response generated FROM data.' },
                { step: '08', title: 'Visual Overlays', desc: 'Rendered PNG composites & GeoJSON vector contours.' },
                { step: '09', title: 'Execution Trace', desc: 'Structured wall-clock audit log of all steps.' },
                { step: '10', title: 'SQLite Persistence', desc: 'Immutable record stored in local database.' },
                { step: '11', title: 'Interactive Map', desc: 'Leaflet geospatial canvas with toggleable layers.' },
                { step: '12', title: 'Export Audit', desc: 'Self-contained HTML/PDF printable report.' },
              ].map((s) => (
                <div key={s.step} className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-primary font-bold">{s.step}</span>
                    <h4 className="text-xs font-bold text-foreground mt-0.5">{s.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. WHY SATQUERY AI IS DIFFERENT */}
      {/* ======================================================== */}
      <section className="py-16 lg:py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 uppercase tracking-widest text-[10px]">
              04 · Core Differentiation
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Beyond a Generic Vision-Language Model
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Standard multimodal models suffer from severe spatial hallucination when given high-resolution satellite imagery. SatQuery AI adheres to a strict design thesis: <strong>language never produces evidence; measurements produce language.</strong>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Zero Pixel Hallucination</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The language model is strictly prohibited from estimating area, counting pixels, or creating bounding boxes. All numbers are computed by raster arrays and geometric affine transforms.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Observable Execution Trace</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every action records input parameters, runtime durations in milliseconds, and status flags. Judges and auditors can inspect exactly which algorithm generated each result.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                <Radio className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Two-Tier Fallback Chain</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a trained deep learning model (e.g. EuroSAT ResNet-18 linear probe) is present, it is invoked first. If weights are absent, execution degrades gracefully to deterministic physical CV without breaking the API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. INTERACTIVE ARCHITECTURE & CAPABILITY EXPLORER */}
      {/* ======================================================== */}
      <section id="architecture" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              05 · System Architecture
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Engineering Architecture Deep Dive
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Explore the technical sub-systems powering SatQuery AI: from metadata validation and specialist dispatch to decision-level fusion and execution tracing.
            </p>
          </div>

          {/* Interactive Architecture Tabs */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-secondary/40 p-3 flex flex-wrap gap-2">
              {[
                { id: 'flow', label: 'System Layer Map', icon: Boxes },
                { id: 'registry', label: 'Model Registry', icon: Cpu },
                { id: 'fusion', label: 'Optical + SAR Physics', icon: Radio },
                { id: 'trace', label: 'Audit & Trace Engine', icon: Activity },
              ].map((t) => {
                const Icon = t.icon
                const active = activeArchTab === t.id
                return (
                  <Button
                    key={t.id}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveArchTab(t.id as any)}
                    className="text-xs gap-1.5 h-8"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </Button>
                )
              })}
            </div>

            <div className="p-6 lg:p-8">
              {activeArchTab === 'flow' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
                      <span className="font-mono text-[10px] text-primary font-bold">LAYER 1</span>
                      <h4 className="font-bold text-foreground text-sm">Frontend GUI</h4>
                      <p className="text-muted-foreground text-[11px]">
                        React 18 + TypeScript + Tailwind + Leaflet. Provides 3-column workspace, overlay controls, before/after slider, and printable HTML audits.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
                      <span className="font-mono text-[10px] text-primary font-bold">LAYER 2</span>
                      <h4 className="font-bold text-foreground text-sm">FastAPI Backend</h4>
                      <p className="text-muted-foreground text-[11px]">
                        REST endpoints, uniform error envelopes, raster decimation cap (200 MPx), and static artifact serving from <code>/storage</code>.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
                      <span className="font-mono text-[10px] text-primary font-bold">LAYER 3</span>
                      <h4 className="font-bold text-foreground text-sm">Agentic Controller</h4>
                      <p className="text-muted-foreground text-[11px]">
                        Intent classification, sensor reconciliation, specialist dispatch via <code>MODEL_REGISTRY</code>, and multi-factor confidence estimation.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-2">
                      <span className="font-mono text-[10px] text-primary font-bold">LAYER 4</span>
                      <h4 className="font-bold text-foreground text-sm">Geospatial Engines</h4>
                      <p className="text-muted-foreground text-[11px]">
                        Rasterio, GDAL, Shapely, and GeoPandas. Deterministic spectral indices, Lee speckle filtering, and Change Vector Analysis (CVA).
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/20 p-4 font-mono text-xs text-muted-foreground space-y-1">
                    <span className="text-primary font-semibold block mb-1 font-sans">Strict Architectural Invariants:</span>
                    <div>• <code>geospatial/</code> knows nothing about natural language or user queries.</div>
                    <div>• <code>services/</code> knows nothing about HTTP or REST routing.</div>
                    <div>• <code>agents/</code> knows nothing about SQL or database tables.</div>
                    <div>• Every measurement is independently verifiable offline on standard CPU without GPUs.</div>
                  </div>
                </div>
              )}

              {activeArchTab === 'registry' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">Registered Remote-Sensing Specialists</h4>
                    <span className="text-xs text-muted-foreground font-mono">9 Active Tools Registered</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {[
                      { name: 'landcover-spectral-cv', task: 'VQA / Land Cover', modality: 'Optical', tier: 'Classical', desc: 'NDVI, NDWI, NDBI hierarchical decision tree with Otsu & Sarle bimodality thresholding.' },
                      { name: 'grounding-spectral-cv', task: 'Grounding', modality: 'Optical', tier: 'Classical', desc: 'Text-guided category parsing to contiguous vector contours, bounding boxes, and compass sector localisation.' },
                      { name: 'vqa-landcover-cv', task: 'VQA', modality: 'Optical', tier: 'Classical', desc: 'Evaluates composition, presence, quantity, and comparisons from measured pixel fractions.' },
                      { name: 'sar-backscatter-cv', task: 'SAR Analysis', modality: 'SAR (VV/VH)', tier: 'Classical', desc: 'Multiplicative Lee speckle filtering in linear power + Otsu scattering regime segmentation.' },
                      { name: 'fusion-decision-cv', task: 'Optical + SAR', modality: 'Multimodal', tier: 'Classical', desc: 'Physics-grounded arbitration: radar double-bounce decides built-up; optical decides water/vegetation.' },
                      { name: 'change-cva-cv', task: 'Change Detection', modality: 'Bi-Temporal', tier: 'Classical', desc: 'Change Vector Analysis (CVA) + two-detector agreement and transition matrix calculation.' },
                      { name: 'change-vqa-cv', task: 'Change VQA', modality: 'Bi-Temporal', tier: 'Classical', desc: 'Answers natural-language temporal change queries grounded in verified difference masks.' },
                      { name: 'satquery-rs-visual-v1', task: 'Captioning', modality: 'Optical', tier: 'Preferred ML', desc: 'EuroSAT (RGB) trained ResNet-18 linear probe for Sentinel-2 scene classification.' },
                      { name: 'captioning-landcover-cv', task: 'Captioning', modality: 'Optical', tier: 'Classical', desc: 'Deterministic descriptive scene captioning computed from land-cover fractions.' },
                    ].map((t) => (
                      <div key={t.name} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-foreground truncate">{t.name}</span>
                            <Badge variant={t.tier === 'Preferred ML' ? 'outline' : 'secondary'} className={`text-[9px] ${t.tier === 'Preferred ML' ? 'border-purple-500/40 text-purple-400' : ''}`}>
                              {t.tier}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-primary font-mono block">{t.task} · {t.modality}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeArchTab === 'fusion' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-500" />
                        Sentinel-2 Optical Multispectral
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        Measures surface reflectance across 12 solar-reflective bands (Visible, NIR, RedEdge, SWIR). Excels at vegetative health (NDVI) and liquid water absorption (NDWI), but suffers from cloud cover and spectral confusion between built-up surfaces and dry bare soil.
                      </p>
                      <div className="font-mono text-[11px] text-foreground bg-card p-2 rounded border border-border">
                        NDVI = (B8 - B4) / (B8 + B4)<br />
                        NDWI = (B3 - B8) / (B3 + B8)
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Radio className="h-4 w-4 text-amber-500" />
                        Sentinel-1 SAR C-Band Radar
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        Measures active microwave backscatter intensity (VV, VH) in all weather conditions, day or night. Excels at detecting structural geometry, surface roughness, and dihedral double-bounce reflections characteristic of vertical buildings and urban density.
                      </p>
                      <div className="font-mono text-[11px] text-foreground bg-card p-2 rounded border border-border">
                        Lee Filter: W = 1 - (Cu² / Ci²)<br />
                        Double-Bounce: VV intensity {'>'} -6 dB
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs space-y-2">
                    <span className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Merge className="h-4 w-4 text-primary" />
                      Physics-Based Decision Arbitration Rule (§4.7)
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      When optical and radar disagree, SatQuery AI applies deterministic physical arbitration rather than a black-box blend:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li><strong>Built-up vs Bare Soil:</strong> Radar double-bounce is authoritative. If SAR backscatter confirms dihedral corner reflection, the pixel is marked built-up even if optical SWIR/NIR is ambiguous.</li>
                      <li><strong>Water vs Smooth Surface:</strong> Optical SWIR absorption is authoritative. Calm open water and smooth airport tarmac have similar specular radar returns; optical NIR/SWIR absorption definitively resolves water bodies.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeArchTab === 'trace' && (
                <div className="space-y-4 text-xs">
                  <h4 className="text-sm font-bold text-foreground">Observable Execution Trace Model</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Every API response returns a strictly typed <code>trace: TraceStep[]</code>. Unlike proprietary LLM chat assistants, every intermediate computation is recorded with exact wall-clock timing and diagnostic parameters.
                  </p>

                  <div className="rounded-lg border border-border bg-background p-4 font-mono text-[11px] text-muted-foreground space-y-2 overflow-x-auto">
                    <div className="text-emerald-500">// Sample Real Response Trace Payload</div>
                    <div>{`[`}</div>
                    <div className="pl-4">{`{ "step": "validate", "tool": "input-validator", "duration_ms": 14, "status": "ok", "parameters": { "crs": "EPSG:32643", "width": 512, "height": 512 } },`}</div>
                    <div className="pl-4">{`{ "step": "classify", "tool": "agent-classifier", "duration_ms": 3, "status": "ok", "parameters": { "intent": "change_vqa", "confidence": 0.98 } },`}</div>
                    <div className="pl-4">{`{ "step": "execute", "tool": "change-cva-cv", "duration_ms": 84, "status": "ok", "parameters": { "t1_bands": 4, "t2_bands": 4, "changed_pct": 14.8 } },`}</div>
                    <div className="pl-4">{`{ "step": "verify", "tool": "evidence-validator", "duration_ms": 6, "status": "ok", "parameters": { "corroboration": "two_detector_agreement" } }`}</div>
                    <div>{`]`}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. BI-TEMPORAL CHANGE & GROUNDING */}
      {/* ======================================================== */}
      <section id="multimodal" className="py-16 lg:py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 uppercase tracking-widest text-[10px]">
              06 · Temporal & Spatial Grounding
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Understand Change Over Time & Locate Features
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              SatQuery AI integrates Change Vector Analysis (CVA) with vector polygon extraction, enabling users to track urban development, flood inundation, and deforestation across multi-date acquisitions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Bi-Temporal Change Detection Workflow */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Bi-Temporal Change Pipeline
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    CVA + Disagreement Matrix
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] text-blue-400">1</span>
                    <span>Registration & Co-Registration Verification</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Measures normalized cross-correlation (NCC) and phase correlation across T1 and T2 rasters before analysis to guarantee sub-pixel alignment.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] text-blue-400">2</span>
                    <span>Dual-Detector Change Vector Analysis (CVA)</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Combines spectral index vector magnitude differences with categorical land-cover transition matrices (e.g. Vegetation → Built-up).
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] text-blue-400">3</span>
                    <span>Exact Geodesic Area Measurement</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Changed pixels are vectorized into Shapely polygons; area in square meters / hectares is calculated directly from the GeoTIFF affine transform.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Spatial Grounding & Localization */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    Spatial Grounding & Vector Localisation
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    Contour Extraction + Affine Map
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] text-cyan-400">1</span>
                    <span>Natural Language Entity Parsing</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Extracts target classes (e.g. "water body", "runway", "solar farm") and maps them to spectral signatures or scattering profiles.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] text-cyan-400">2</span>
                    <span>Connected Component Contouring</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Isolates contiguous pixel regions, filters speckle noise, and bounds polygons with coordinate bounding boxes.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-5 w-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] text-cyan-400">3</span>
                    <span>Compass Sector Localization</span>
                  </div>
                  <p className="text-muted-foreground pl-7 leading-relaxed">
                    Determines spatial quadrant (e.g. "North-East", "Center-West") using centroid offsets relative to the geodetic frame.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. DATASETS & RESEARCH FOUNDATION */}
      {/* ======================================================== */}
      <section id="datasets" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              07 · Datasets & Research Foundations
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Backed by Authoritative Remote Sensing Literature
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              SatQuery AI grounds its architecture on published Earth observation archives, multimodal benchmarks, and open Copernicus Sentinel standards.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-foreground">BigEarthNet.txt</CardTitle>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    Multimodal VLM Benchmark
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Published dataset & benchmark archive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Describes 464,044 co-registered Sentinel-1 SAR and Sentinel-2 multispectral scenes paired with 9.6 million natural-language annotations across 15 remote sensing tasks.
                </p>
                <div className="pt-2 border-t border-border text-[11px] font-mono text-foreground">
                  Reference: TU Berlin Earth Observation Benchmark
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-foreground">EuroSAT (RGB)</CardTitle>
                  <Badge variant="success" className="text-[10px]">
                    Live Adapted Model
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Real Sentinel-2 acquisitions (MIT License)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  27,000 georeferenced Sentinel-2 patches covering 10 distinct land-use classes. Used to adapt the ResNet-18 linear-probe classifier (<code>satquery-rs-visual-v1</code>) achieving 87.25% top-1 accuracy on held-out test splits.
                </p>
                <div className="pt-2 border-t border-border text-[11px] font-mono text-emerald-500">
                  Status: Integrated in MODEL_REGISTRY
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-foreground">reBEN / BigEarthNet v2.0</CardTitle>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    Target Research Archive
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Refined BigEarthNet Dataset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  549,488 paired Sentinel-1 / Sentinel-2 patches with pixel-level reference maps and multi-label CORINE land-cover classifications. Serves as the blueprint for future fine-tuning adapters.
                </p>
                <div className="pt-2 border-t border-border text-[11px] font-mono text-muted-foreground">
                  Status: Architecture Adapter Specified
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. TECHNOLOGY STACK */}
      {/* ======================================================== */}
      <section id="technology" className="py-16 lg:py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
                08 · Technology Stack
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Engineered for Performance & Reproducibility
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                SatQuery AI combines modern frontend ergonomics with robust Python geospatial and machine learning libraries.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1">
              {(['all', 'live', 'planned'] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  variant={activeTechFilter === f ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTechFilter(f)}
                  className="text-xs capitalize h-7 px-3"
                >
                  {f === 'all' ? 'All Tech' : f === 'live' ? 'Currently Live' : 'Planned / Future'}
                </Button>
              ))}
            </div>
          </div>

          {/* Tech Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: 'Python 3.10+', cat: 'Core Language', status: 'live' },
              { name: 'FastAPI', cat: 'REST Backend', status: 'live' },
              { name: 'React 18 + TS', cat: 'Frontend UI', status: 'live' },
              { name: 'Tailwind CSS', cat: 'Design System', status: 'live' },
              { name: 'Leaflet', cat: 'Geospatial Map', status: 'live' },
              { name: 'Rasterio', cat: 'GeoTIFF I/O', status: 'live' },
              { name: 'GDAL', cat: 'Spatial Projections', status: 'live' },
              { name: 'Shapely', cat: 'Vector Geometries', status: 'live' },
              { name: 'PyTorch', cat: 'Deep Learning', status: 'live' },
              { name: 'Transformers', cat: 'VLM & Tokenizers', status: 'live' },
              { name: 'OpenCV', cat: 'Computer Vision', status: 'live' },
              { name: 'SQLite / SQLAlchemy', cat: 'Metadata Storage', status: 'live' },
              { name: 'PEFT / LoRA', cat: 'Parameter Tuning', status: 'planned' },
              { name: 'PostGIS', cat: 'Spatial Database', status: 'planned' },
              { name: 'Redis Cache', cat: 'Tile Caching', status: 'planned' },
              { name: 'Docker / Compose', cat: 'Containerization', status: 'live' },
              { name: 'CUDA Toolkit', cat: 'GPU Acceleration', status: 'live' },
              { name: 'HTML → PDF', cat: 'Audit Reports', status: 'live' },
            ]
              .filter((t) => activeTechFilter === 'all' || t.status === activeTechFilter)
              .map((t) => (
                <div key={t.name} className="rounded-lg border border-border bg-card p-3 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${t.status === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground block">{t.cat}</span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${t.status === 'live' ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}`}>
                    {t.status === 'live' ? 'Implemented' : 'Planned'}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. REAL-WORLD IMPACT & BENEFIT PILLARS */}
      {/* ======================================================== */}
      <section id="impact" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 uppercase tracking-widest text-[10px]">
              09 · Real-World Impact
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Transforming Decision Support Across Critical Domains
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              From precision agriculture and disaster assessment to environmental conservation and urban planning, SatQuery AI accelerates operational timelines from days to seconds.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Agriculture & Crop Health', items: ['NDVI vegetative stress monitoring', 'Drought impact & soil moisture analysis', 'Crop growth stage estimation', 'Acreage classification & subsidy verification'] },
              { title: 'Disaster Management', items: ['Post-cyclone inundation mapping with SAR', 'Rapid flood extent & damage assessment', 'Landslide & structural breach identification', 'Evacuation corridor accessibility checks'] },
              { title: 'Environmental Conservation', items: ['Illegal deforestation & canopy loss tracking', 'Wetland & coastal water body shrinkage', 'Ecosystem boundary encroachment monitoring', 'Wildfire burn scar perimeter calculation'] },
              { title: 'Urban Planning & Infrastructure', items: ['Unplanned built-up expansion monitoring', 'Impervious surface & heat island detection', 'Road network & port facility development', 'Zoning & land-use transition auditing'] },
              { title: 'Geospatial Research & Education', items: ['Open benchmark dataset reproducibility', 'Conversational exploration for non-GIS students', 'Accessible Earth Observation toolchains', 'Scientific auditing with execution traces'] },
            ].map((d) => (
              <Card key={d.title} className="border-border bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground">{d.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                  <ul className="space-y-1">
                    {d.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key Benefits Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 border-t border-border">
            {[
              { title: 'Faster Analysis', desc: 'Reduces turnaround time from days of manual GIS scripting to seconds.' },
              { title: 'Natural Interaction', desc: 'No complex SQL or geospatial algebra syntax required.' },
              { title: 'Multimodal Fusion', desc: 'Synergizes SAR weather-resilience with optical multispectral accuracy.' },
              { title: 'Spatial Evidence', desc: 'Answers backed by polygons, bounding boxes, and audited masks.' },
              { title: 'Scalable Architecture', desc: 'Extensible plugin registry ready for new sensor constellations.' },
            ].map((b) => (
              <div key={b.title} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
                <span className="text-xs font-bold text-foreground block">{b.title}</span>
                <p className="text-[11px] text-muted-foreground leading-snug">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 11. FEASIBILITY & VIABILITY */}
      {/* ======================================================== */}
      <section className="py-16 lg:py-24 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              10 · Feasibility & Viability Analysis
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Practical Implementation & Deployment Viability
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feasibility Column */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground">Feasibility Dimensions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Technical and operational reality</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground block">Technical Feasibility:</span>
                  <p>Leverages established open-source geospatial standards (GDAL, Rasterio) and modern PyTorch vision foundations. Runs deterministic analysis offline without GPU clusters.</p>
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Financial Feasibility:</span>
                  <p>Zero licensing costs for core algorithms. Operates on free ESA Copernicus Sentinel-1 and Sentinel-2 data archives.</p>
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Operational Feasibility:</span>
                  <p>Low learning curve for end users. No specialized GIS installation required on client devices.</p>
                </div>
              </CardContent>
            </Card>

            {/* Viability Column */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground">Viability & Sustainability</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Long-term scalability factors</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground block">Adoption Viability:</span>
                  <p>Direct utility for government agencies, emergency management centres, agricultural cooperatives, and research universities.</p>
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Scalability & Expansion:</span>
                  <p>Modular agent registry supports onboarding new commercial constellations (PlanetScope, WorldView) and drone orthomosaics.</p>
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Regulatory & Audit Viability:</span>
                  <p>Deterministic physics-based calculations satisfy government audit and legal accountability requirements.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 12. DEVELOPMENT ROADMAP */}
      {/* ======================================================== */}
      <section id="roadmap" className="py-16 lg:py-24 border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-primary/30 text-primary uppercase tracking-widest text-[10px]">
              11 · Development Roadmap
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Phased Engineering Execution
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { phase: 'PHASE 1', title: 'Baseline Ingestion & Processing', status: 'COMPLETED', items: ['GeoTIFF & TIFF raster ingestion', 'CRS reprojection & decimation', 'Spectral index calculator (NDVI/NDWI/NDBI)', 'Leaflet interactive canvas'] },
              { phase: 'PHASE 2', title: 'Agentic Orchestration & Registry', status: 'COMPLETED', items: ['QueryTask natural language classifier', 'Specialist model registry', 'Pre-flight metadata validation gates', 'Wall-clock execution trace engine'] },
              { phase: 'PHASE 3', title: 'Multitemporal & SAR Specialists', status: 'COMPLETED', items: ['Change Vector Analysis (CVA)', 'Lee speckle filtering in linear power', 'Decision-level Optical + SAR arbitration', 'Polygon vectorization & area calculation'] },
              { phase: 'PHASE 4', title: 'Evidence Gating & Auditing', status: 'COMPLETED', items: ['EvidenceValidator truth checking', 'Multi-factor confidence scoring', 'Self-contained HTML printable report', 'Interactive 3-column analysis workspace'] },
              { phase: 'PHASE 5', title: 'Remote-Sensing VLM Adaptation', status: 'IN PROGRESS', items: ['EuroSAT ResNet-18 probe adaptation', 'BigEarthNet.txt instruction tuning', 'PEFT / LoRA adapter training', 'RSVQA & VRSBench benchmark evaluation'] },
              { phase: 'PHASE 6', title: 'Cloud & Constellation Scale', status: 'PLANNED', items: ['PostGIS persistent spatial database', 'STAC API streaming connector', 'Real-time Sentinel Hub ingestion', 'Distributed GPU batch inference'] },
            ].map((r) => (
              <Card key={r.phase} className="border-border bg-card shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-primary font-bold">{r.phase}</span>
                    <Badge
                      variant={r.status === 'COMPLETED' ? 'success' : r.status === 'IN PROGRESS' ? 'warning' : 'outline'}
                      className="text-[9px]"
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground pt-1">{r.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-1 text-muted-foreground text-[11px]">
                  {r.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      <span>{it}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 13. FINAL CALL TO ACTION & FOOTER */}
      {/* ======================================================== */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Satellite className="h-4 w-4" />
            <span>Smart India Hackathon 2026 · Problem Statement SIH26167</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Experience SatQuery AI in Action
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Test the live 3-column analysis workspace, attach your own Sentinel-1 and Sentinel-2 GeoTIFFs, or load pre-built demo scenarios with a single click.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm px-8 shadow-lg shadow-cyan-500/20">
              <Link to="/analyze">
                <span>Launch Analysis Workspace</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-card text-foreground text-sm hover:bg-accent">
              <Link to="/">
                <span>View Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card/80 py-8 px-4 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="font-bold text-foreground">
              SATQUERY AI — SIH26167
            </div>
            <div>
              Team SHOURYANGULU · Theme: Space and Technology · Category: Software
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/analyze" className="hover:text-primary transition-colors">Workspace</Link>
            <Link to="/datasets" className="hover:text-primary transition-colors">Datasets</Link>
            <Link to="/models" className="hover:text-primary transition-colors">Model Registry</Link>
            <Link to="/reports" className="hover:text-primary transition-colors">Reports</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
              API Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
