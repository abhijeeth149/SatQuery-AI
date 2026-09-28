import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  Search,
  Filter,
  FileText,
} from 'lucide-react'
import { listAnalyses } from '@/services/api'
import { useAsync } from '@/lib/use-async'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { modeLabel, taskLabel, formatDate, confidenceBadgeVariant } from '@/lib/format'
import type { InputMode } from '@/types/api'

export function HistoryPage() {
  const { data: items, loading } = useAsync(() => listAnalyses(), [])
  const [searchTerm, setSearchTerm] = useState('')
  const [modeFilter, setModeFilter] = useState<string>('all')

  const filtered = (items || []).filter((item) => {
    const matchesSearch =
      item.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMode = modeFilter === 'all' || item.mode === modeFilter
    return matchesSearch && matchesMode
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analysis History</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Persisted remote sensing analyses, spatial groundings, and execution traces
          </p>
        </div>
        <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs">
          <Link to="/analyze">New Analysis</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queries, analysis IDs, or findings..."
            className="pl-9 bg-background border-border text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Modes</option>
            <option value="single_optical">Single Optical</option>
            <option value="single_sar">Single SAR</option>
            <option value="optical_sar_pair">Optical + SAR</option>
            <option value="bitemporal_pair">Bi-Temporal</option>
          </select>
        </div>
      </div>

      {/* Analysis List */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Recorded Records ({filtered.length})
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">Stored in SQLite /storage/satquery.db</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <History className="h-8 w-8 text-muted-foreground mx-auto" />
              <div className="text-sm font-semibold text-foreground">No analyses found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No analyses matched your filters. Execute a new satellite analysis from the workspace.
              </p>
              <Button asChild size="sm" variant="outline" className="border-border bg-card text-xs text-foreground hover:bg-accent">
                <Link to="/analyze">Start New Analysis</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-secondary/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-primary font-semibold">{item.id}</span>
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        {modeLabel(item.mode as InputMode)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {taskLabel(item.task)}
                      </Badge>
                      {item.fixture && (
                        <Badge variant="secondary" className="text-[10px]">
                          Demo Recording
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      "{item.query}"
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.answer}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center justify-end gap-1.5">
                        <Badge variant={confidenceBadgeVariant(item.confidence)} className="text-[10px] capitalize">
                          {item.confidence} confidence
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button asChild size="sm" variant="outline" className="border-border bg-card text-xs hover:bg-accent text-foreground">
                        <Link to={`/analysis/${item.id}${item.fixture ? '?demo=1' : ''}`}>
                          View Result
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="text-xs text-primary hover:text-primary/80">
                        <Link to={`/analysis/${item.id}/report${item.fixture ? '?demo=1' : ''}`} title="Printable Report">
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
