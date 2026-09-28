import { Link } from 'react-router-dom'
import {
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { listAnalyses } from '@/services/api'
import { useAsync } from '@/lib/use-async'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { modeLabel, taskLabel, formatDate, confidenceBadgeVariant } from '@/lib/format'
import type { InputMode } from '@/types/api'

export function ReportsPage() {
  const { data: analyses, loading } = useAsync(() => listAnalyses(), [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytical Reports</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Persisted execution summaries, evidence tables, spatial grounding logs, and exportable HTML audits
          </p>
        </div>
        <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs">
          <Link to="/analyze">Generate New Analysis</Link>
        </Button>
      </div>

      {/* Report Info Banner */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Self-Contained Audit Architecture (§1, §32)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1.5">
          <p className="leading-relaxed">
            Every report is generated directly from the persisted SQLite analysis record with HTML-escaped text content. Reports include complete input raster metadata, the canonical input mode, query intent, tool rungs, measured confidence factors, and step-by-step wall-clock execution traces.
          </p>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Generated Analysis Reports
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (analyses || []).length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No reports generated yet. Execute an analysis to view its report.
          </div>
        ) : (
          <div className="grid gap-3">
            {analyses?.map((item) => (
              <Card
                key={item.id}
                className="border-border bg-card hover:bg-card/90 transition-colors p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{item.id}</span>
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                      {modeLabel(item.mode as InputMode)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {taskLabel(item.task)}
                    </Badge>
                    <Badge variant={confidenceBadgeVariant(item.confidence)} className="text-[10px] capitalize">
                      {item.confidence} confidence
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-foreground">
                    "{item.query}"
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.answer}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                    <span>Generated: {formatDate(item.created_at)}</span>
                    <span>Status: {item.status.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline" className="border-border bg-card text-xs hover:bg-accent text-foreground">
                    <Link to={`/analysis/${item.id}${item.fixture ? '?demo=1' : ''}`}>
                      View Canvas
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 text-xs gap-1.5 font-medium"
                  >
                    <Link to={`/analysis/${item.id}/report${item.fixture ? '?demo=1' : ''}`}>
                      <FileText className="h-3.5 w-3.5" />
                      <span>Open Report</span>
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
