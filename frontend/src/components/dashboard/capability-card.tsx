import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Capability } from '@/lib/capabilities'
import { modeLabel } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CapabilityCard({ capability }: { capability: Capability }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{capability.title}</CardTitle>
          <Badge variant="outline" className="shrink-0">
            {modeLabel(capability.mode)}
          </Badge>
        </div>
        <CardDescription>{capability.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Example:</span> “{capability.exampleQuery}”
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{capability.inputs}</span>
          {capability.demoCaseId ? (
            <Button variant="link" size="sm" asChild className="h-auto gap-1 p-0">
              <Link to={`/analysis/${capability.demoCaseId}`}>
                View example
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
