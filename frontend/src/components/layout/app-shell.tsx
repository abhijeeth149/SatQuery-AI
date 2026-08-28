import { LayoutDashboard, Plus, BarChart2 } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { apiConfig } from '@/services/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analyze', label: 'New analysis', icon: Plus, end: false },
  { to: '/evaluation', label: 'Evaluation', icon: BarChart2, end: false },
] as const

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <img src="/satquery.svg" alt="" className="h-7 w-7" />
            <span>SatQuery&nbsp;AI</span>
          </NavLink>
          <nav className="ml-4 flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {apiConfig.offline ? (
              <Badge
                variant="warning"
                title="Serving recorded analysis fixtures. Live inference needs the API backend."
              >
                Demo · fixtures
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                ● Live
              </Badge>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto w-full max-w-6xl px-4 text-xs leading-relaxed text-muted-foreground">
          SatQuery AI — an interactive vision-language assistant for multimodal remote-sensing image
          analysis (SIH26167). Answers are grounded in measured evidence; the assistant declines
          when evidence is insufficient rather than guessing.
        </div>
      </footer>
    </div>
  )
}
