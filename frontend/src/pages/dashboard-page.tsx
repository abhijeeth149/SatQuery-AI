import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { CAPABILITIES } from '@/lib/capabilities'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { CapabilityCard } from '@/components/dashboard/capability-card'
import { SystemStatus } from '@/components/dashboard/system-status'
import { RecentAnalyses } from '@/components/dashboard/recent-analyses'

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="An interactive vision-language assistant for multimodal remote-sensing imagery. Ask questions across optical, SAR, fused, and bi-temporal inputs — every answer is backed by measured evidence."
        actions={
          <Button asChild>
            <Link to="/analyze">
              <Plus />
              New analysis
            </Link>
          </Button>
        }
      />

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          What you can ask
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <CapabilityCard key={capability.id} capability={capability} />
          ))}
        </div>
      </section>

      <SystemStatus />

      <RecentAnalyses />
    </div>
  )
}
