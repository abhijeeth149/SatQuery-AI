import { Link } from 'react-router-dom'
import {
  PlusCircle,
  GitCompare,
  Database,
  FileText,
  Sparkles,
  ArrowRight,
  Layers,
  Radio,
  Clock,
  Merge,
  Target,
  HelpCircle,
  Cpu,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SystemStatus } from '@/components/dashboard/system-status'
import { RecentAnalyses } from '@/components/dashboard/recent-analyses'

const CAPABILITY_CARDS = [
  {
    id: 'single_optical',
    mode: 'single_optical',
    title: 'OPTICAL',
    subtitle: 'Land cover & spectral analysis',
    description: 'Hierarchical spectral decision tree using NDVI, NDWI, MNDWI, and NDBI with Otsu/Sarle adaptive thresholding.',
    icon: Layers,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    badge: 'Spectral Indices',
    example: 'What land cover types are present in this scene?',
  },
  {
    id: 'single_sar',
    mode: 'single_sar',
    title: 'SAR',
    subtitle: 'Radar / structural analysis',
    description: 'Multiplicative Lee speckle filtering in linear power + Otsu scattering regime segmentation (smooth, diffuse, double-bounce).',
    icon: Radio,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    badge: 'Lee Filtered',
    example: 'Describe the SAR backscatter in this image.',
  },
  {
    id: 'bitemporal_pair',
    mode: 'bitemporal_pair',
    title: 'BI-TEMPORAL',
    subtitle: 'Detect changes over time',
    description: 'Change Vector Analysis (CVA) with MAD-based outlier thresholding and two-detector spectral agreement across dates.',
    icon: Clock,
    color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30',
    badge: 'Dual Detector',
    example: 'What changed between these two dates and where?',
  },
  {
    id: 'optical_sar_pair',
    mode: 'optical_sar_pair',
    title: 'OPTICAL + SAR',
    subtitle: 'Multimodal fusion',
    description: 'Physics-grounded decision-level arbitration: radar double-bounce decides built-up, optical SWIR/NIR decides water and vegetation.',
    icon: Merge,
    color: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
    badge: 'Physics Rules',
    example: 'Combine optical and radar to identify built-up areas.',
  },
  {
    id: 'grounding',
    mode: 'single_optical',
    title: 'GROUNDING',
    subtitle: 'Find requested regions',
    description: 'Natural-language target parsing to contiguous vector contours, bounding boxes, and compass sector localisation.',
    icon: Target,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    badge: 'Vector Polygons',
    example: 'Highlight the water bodies and estimate coverage.',
  },
  {
    id: 'vqa',
    mode: 'single_optical',
    title: 'VQA',
    subtitle: 'Ask questions about imagery',
    description: 'Evaluates presence, quantity, comparison, and composition grounded strictly in measured land-cover statistics.',
    icon: HelpCircle,
    color: 'from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30',
    badge: 'Grounded Query',
    example: 'Is there more vegetation or built-up land in this scene?',
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card via-card/90 to-secondary/60 p-6 lg:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Smart India Hackathon 2026 · Problem Statement SIH26167</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            Remote Sensing Intelligence
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Ask natural-language questions about satellite imagery and receive spatially grounded answers backed by physical spectral indices, radar backscatter analysis, and auditable execution traces.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white gap-2 font-medium shadow-lg shadow-cyan-500/20">
              <Link to="/analyze">
                <PlusCircle className="h-4 w-4" />
                New Analysis
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 gap-2 font-medium">
              <Link to="/case-study">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                Technical Case Study
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border bg-card hover:bg-accent text-foreground gap-2">
              <Link to="/analyze?mode=bitemporal_pair">
                <GitCompare className="h-4 w-4 text-primary" />
                Compare Images (Bi-temporal)
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border bg-card hover:bg-accent text-foreground gap-2">
              <Link to="/datasets">
                <Database className="h-4 w-4 text-emerald-500" />
                Datasets & Sensors
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border bg-card hover:bg-accent text-foreground gap-2">
              <Link to="/reports">
                <FileText className="h-4 w-4 text-purple-500" />
                View Reports
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* CORE DIFFERENTIATOR STORY BANNER */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide text-foreground uppercase flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Agentic Orchestration Pipeline (Zero Hallucination)
            </CardTitle>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Deterministic + Adapted ML
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            How SatQuery AI arbitrates between satellite sensor modalities and dispatches specialist tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
            {[
              { step: '01', title: 'USER QUERY', desc: 'Natural text' },
              { step: '02', title: 'VALIDATION', desc: 'CRS & GeoTIFF' },
              { step: '03', title: 'CLASSIFIER', desc: 'Weighted intent' },
              { step: '04', title: 'AGENT ROUTER', desc: 'Sensor reconciliation' },
              { step: '05', title: 'SPECIALIST', desc: '9 Remote tools' },
              { step: '06', title: 'SPATIAL EVIDENCE', desc: 'Bitemporal/SAR' },
              { step: '07', title: 'CONFIDENCE', desc: 'Gated metrics' },
              { step: '08', title: 'AUDIT TRACE', desc: 'Wall-clock steps' },
            ].map((p, i) => (
              <div key={i} className="flex flex-col items-center rounded-lg border border-border bg-secondary/50 p-2 relative">
                <span className="font-mono text-[10px] text-primary font-bold">{p.step}</span>
                <span className="font-semibold text-foreground mt-1 text-[11px]">{p.title}</span>
                <span className="text-[10px] text-muted-foreground">{p.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 6 CAPABILITY CARDS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Core Remote Sensing Capabilities
          </h2>
          <span className="text-xs text-muted-foreground">SIH26167 Supported Workflows</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_CARDS.map((cap) => {
            const Icon = cap.icon
            return (
              <Card
                key={cap.id}
                className="group relative flex flex-col justify-between border-border bg-card hover:bg-card/90 transition-all duration-200 hover:border-primary/50 shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg border ${cap.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                      {cap.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground pt-2">
                    {cap.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-primary font-medium">
                    {cap.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                  <div className="rounded-md border border-border bg-secondary/50 p-2 text-[11px]">
                    <span className="text-muted-foreground font-mono block mb-0.5">Example Query:</span>
                    <span className="text-foreground italic">"{cap.example}"</span>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs text-primary hover:text-primary/80 hover:bg-primary/10 p-2 h-auto"
                  >
                    <Link to={`/analyze?mode=${cap.mode}&q=${encodeURIComponent(cap.example)}`}>
                      <span>Launch Analysis</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* SYSTEM STATUS */}
      <SystemStatus />

      {/* RECENT ANALYSES */}
      <RecentAnalyses />
    </div>
  )
}
