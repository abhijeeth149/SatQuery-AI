import { useState, useEffect } from 'react'
import {
  Settings,
  Server,
  Database,
  Cpu,
  Palette,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { apiConfig, getHealth } from '@/services/api'
import type { HealthStatus } from '@/types/api'

export function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(false)

  function refresh() {
    setLoading(true)
    getHealth()
      .then(setHealth)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Environment configuration, API endpoints, remote sensing parameters, and runtime diagnostics
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="border-border bg-card text-foreground text-xs gap-1.5 hover:bg-accent"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backend & API */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Backend Configuration
              </CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px]">
                FastAPI 0.115+
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              REST API service status and ports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Backend URL:</span>
              <span className="font-mono text-foreground">http://localhost:8000</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Frontend Dev Server:</span>
              <span className="font-mono text-foreground">http://localhost:5173</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">API Documentation:</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                /docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Python Environment:</span>
              <span className="font-mono text-foreground">D:\SatQuery-AI\.venv</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">API Mode:</span>
              <span className="font-mono text-emerald-500 font-medium">
                {apiConfig.offline ? 'Demo Fixtures' : 'Live Inference (Active)'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Live Health Status:</span>
              <span className="font-mono text-primary uppercase font-medium">
                {health?.status ? `${health.status} (${health.version || 'v0.1.0'})` : 'Checking...'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Storage & Database */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                Storage & Database
              </CardTitle>
              <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                SQLite Local
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Persistent storage paths and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Database Engine:</span>
              <span className="font-mono text-foreground">SQLAlchemy 2.0 (SQLite 3)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Database File:</span>
              <span className="font-mono text-foreground">storage/satquery.db</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Artifacts Directory:</span>
              <span className="font-mono text-foreground">storage/artifacts/</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Upload Limit:</span>
              <span className="font-mono text-foreground">200 MB per file</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Pixel Decompression Cap:</span>
              <span className="font-mono text-foreground">200,000,000 px</span>
            </div>
          </CardContent>
        </Card>

        {/* Remote Sensing Processing Parameters */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-500" />
                Remote Sensing Thresholds
              </CardTitle>
              <Badge variant="outline" className="border-purple-500/30 text-purple-500 text-[10px]">
                Deterministic GIS
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Physics-based algorithms and detection constants
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Max Longest Edge (Decimation):</span>
              <span className="font-mono text-foreground">1024 px</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Min Pair Overlap:</span>
              <span className="font-mono text-foreground">30% (IoU Gate)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">SAR Speckle Filter Window:</span>
              <span className="font-mono text-foreground">7x7 local statistics (Lee)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Bimodality Sarle Threshold:</span>
              <span className="font-mono text-foreground">0.555 (Gated Otsu)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">ResNet-18 Adaptation Head:</span>
              <span className="font-mono text-purple-500">EuroSAT 10-Class Linear Probe</span>
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Workspace */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Appearance & Theme
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Theme and workspace presentation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Theme Mode:</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">UI Aesthetic:</span>
              <span className="text-foreground">Orbital / Geospatial Intelligence</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">SIH Team:</span>
              <span className="font-mono text-primary font-medium">Team SHOURYANGULU</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
