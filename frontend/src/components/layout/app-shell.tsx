import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Database,
  Cpu,
  BarChart2,
  FileText,
  Settings,
  Satellite,
  Activity,
  CheckCircle2,
  Menu,
  X,
  BookOpen,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { apiConfig, getHealth } from '@/services/api'
import type { HealthStatus } from '@/types/api'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/analyze', label: 'New Analysis', icon: PlusCircle, end: false },
  { to: '/case-study', label: 'Case Study & Portfolio', icon: BookOpen, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/datasets', label: 'Datasets', icon: Database, end: false },
  { to: '/models', label: 'Models & Tools', icon: Cpu, end: false },
  { to: '/evaluation', label: 'Evaluation', icon: BarChart2, end: false },
  { to: '/reports', label: 'Reports', icon: FileText, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
] as const

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null))
  }, [])

  const isLive = health?.status === 'ok' && !apiConfig.offline
  const modelsCount = health?.models?.length ?? 9

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/95 backdrop-blur transition-transform duration-200 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <NavLink to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Satellite className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wide text-foreground">SATQUERY AI</span>
              <span className="text-[10px] font-mono text-primary">SIH26167 · ORBITAL</span>
            </div>
          </NavLink>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Tag */}
        <div className="px-4 py-3">
          <div className="rounded-md border border-border bg-secondary/50 p-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SIH 2026 Workspace
              </span>
              <span className="font-mono text-[10px] text-primary">v0.1.0</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground truncate">
              Team SHOURYANGULU
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm border border-primary/30 font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Bottom Status */}
        <div className="border-t border-border bg-card p-4">
          <div className="space-y-2 rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">API Connection</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isLive ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Analysis Engine</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-primary font-medium">
                <CheckCircle2 className="h-3 w-3" />
                {modelsCount} Active Tools
              </span>
            </div>
            <div className="pt-1 text-[10px] text-muted-foreground flex items-center justify-between border-t border-border">
              <span>Port: 8000 (FastAPI)</span>
              <span className="font-mono">GeoTIFF/SAR</span>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT AREA: TOPBAR + WORKSPACE */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="text-foreground font-semibold tracking-wide">SatQuery AI</span>
              <span>/</span>
              <span className="text-primary font-medium">Multimodal Remote Sensing Intelligence</span>
            </div>
          </div>

          {/* Right Top Status & Actions */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-foreground font-medium">System Operational</span>
            </div>

            {/* Models Active Pill */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs text-foreground">
              <Activity className="h-3 w-3 text-primary" />
              <span className="font-mono text-primary font-semibold">{modelsCount} Tools</span>
              <span className="text-muted-foreground">Ready</span>
            </div>

            {/* Case Study Button */}
            <NavLink
              to="/case-study"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-all"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Case Study</span>
            </NavLink>

            {/* Quick Action Button */}
            <NavLink
              to="/analyze"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>New Analysis</span>
            </NavLink>

            <ThemeToggle />

            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary border border-border">
                SH
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium text-foreground">SHOURYANGULU</span>
                <span className="text-[10px] text-muted-foreground">SIH 2026</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 bg-background">
          <Outlet />
        </main>

        {/* Compact Footer */}
        <footer className="border-t border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div>
              SatQuery AI · SIH26167 · Joint Optical & SAR Remote Sensing Intelligence Platform
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              Deterministic GIS Engines + Evidence Grounding + Fallback ML
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
