import { Cpu, Info } from 'lucide-react'
import { getModels } from '@/services/api'
import { useAsync } from '@/lib/use-async'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function ModelsPage() {
  const { data: models, loading } = useAsync(() => getModels(), [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Model & Tool Registry</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered remote-sensing specialists, fallback chains, input contracts, and ML adaptation rungs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">
            ● 8 Classical Tools Active
          </Badge>
          <Badge variant="outline" className="border-purple-500/30 text-purple-500 text-xs">
            1 EuroSAT Adapted ML (ResNet-18)
          </Badge>
        </div>
      </div>

      {/* Architecture Rung Explanation */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Two-Tier Fallback Architecture (SIH §18)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-2">
          <p className="leading-relaxed">
            The registry implements an ordered fallback chain for each task: a trained remote-sensing visual model (
            <span className="text-primary font-semibold font-mono">PREFERRED</span>) is tried first. If its weights are absent, it automatically degrades without error to the deterministic physical remote-sensing analyser (
            <span className="text-emerald-500 font-semibold font-mono">CLASSICAL</span>). No caller code changes.
          </p>
        </CardContent>
      </Card>

      {/* Model Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-1/2" />
            </Card>
          ))
        ) : (models || []).length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No tools reported by registry. Check backend connectivity.
          </div>
        ) : (
          models?.map((tool) => {
            const isReady = tool.status === 'ready' || tool.available
            const isPreferred = tool.tier === 'preferred'
            return (
              <Card
                key={tool.name}
                className={`border-border bg-card flex flex-col justify-between transition-all hover:border-primary/50 shadow-sm ${
                  isPreferred ? 'ring-1 ring-purple-500/30' : ''
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-foreground tracking-wide truncate">
                      {tool.name}
                    </span>
                    <Badge
                      variant={isReady ? 'success' : 'outline'}
                      className={`text-[10px] shrink-0 ${
                        isReady
                          ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {isReady ? 'READY' : 'UNAVAILABLE'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
                      Task: {tool.task}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-mono ${
                        isPreferred ? 'border-purple-500/40 text-purple-500' : 'border-border text-muted-foreground'
                      }`}
                    >
                      Tier: {tool.tier}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tool.summary}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Supported Modes:</span>
                      <span className="font-mono text-foreground font-medium">
                        {tool.contract?.supported_modes?.join(', ') || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Required Modality:</span>
                      <span className="font-mono text-primary font-medium">
                        {tool.contract?.required_modalities?.join(' + ') || 'Any'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Images Required:</span>
                      <span className="font-mono text-foreground font-medium">
                        {tool.contract?.min_images} to {tool.contract?.max_images}
                      </span>
                    </div>

                    {tool.runtime && tool.runtime.reason && (
                      <div className="p-2 rounded bg-secondary/60 border border-border text-[10px] text-amber-500 font-mono leading-tight">
                        Note: {tool.runtime.reason}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
