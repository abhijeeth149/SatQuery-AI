import type { ChangeData, Artifact } from '@/types/api'
import { ComparisonSlider } from '@/components/result/comparison-slider'
import { Stat, StatGrid } from '@/components/result/stat'
import { Distribution } from '@/components/result/distribution'
import { RegistrationSummary } from '@/components/result/panels/fusion-panel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { changeTypeColor, changeTypeLabel, prettifyKey } from '@/lib/classes'
import { formatArea, formatFractionPct, formatInt, formatPct } from '@/lib/format'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function signed(n: number, digits = 0): string {
  const s = n.toFixed(digits)
  return n > 0 ? `+${s}` : s
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0)
    return <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
  if (value < 0)
    return <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
}

export function ChangePanel({ data, artifacts }: { data: ChangeData; artifacts?: Artifact[] }) {
  const transitions = [...data.transitions].sort(
    (a, b) => b.fraction_of_change - a.fraction_of_change,
  )
  const rows = transitions.map((t, i) => ({
    key: `${t.from}-${t.to}-${i}`,
    label: `${prettifyKey(t.from)} → ${prettifyKey(t.to)}`,
    color: changeTypeColor(t.change_type),
    fraction: t.fraction_of_change,
    valueLabel: formatPct(t.percentage_of_change),
    hint: formatArea(t.area_m2),
  }))

  const es = data.evidence_split
  const totalEv = es.corroborated_pixels + es.spectral_only_pixels + es.class_only_pixels || 1

  // Extract before/after images from artifacts for the comparison slider
  const baseArtifact = artifacts?.find((a) => a.kind === 'base')
  const overlayArtifact = artifacts?.find((a) => a.kind === 'change_mask' || a.kind === 'overlay')

  return (
    <div className="space-y-5">
      {/* Before/After comparison slider */}
      {baseArtifact && overlayArtifact && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Before / After comparison</h4>
          <ComparisonSlider
            beforeSrc={baseArtifact.url}
            afterSrc={overlayArtifact.url}
            beforeLabel="Original"
            afterLabel="Change overlay"
          />
        </section>
      )}

      <StatGrid>
        <Stat
          label="Changed area"
          value={formatArea(data.changed_area_m2)}
          hint={`${formatInt(data.changed_pixels)} px`}
        />
        <Stat label="Changed" value={formatPct(data.changed_percentage)} hint="of valid pixels" />
        <Stat
          label="Bimodality"
          value={formatFractionPct(data.bimodality)}
          hint="change/no-change split"
        />
        <Stat
          label="Threshold quality"
          value={formatFractionPct(data.threshold_quality)}
          hint={data.threshold_method}
        />
      </StatGrid>

      {data.dominant_transition && (
        <div className="rounded-lg border-l-4 border-primary bg-accent/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Largest transition
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground">
              {prettifyKey(data.dominant_transition.from)}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold text-foreground">
              {prettifyKey(data.dominant_transition.to)}
            </span>
            <span
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${changeTypeColor(data.dominant_transition.change_type)}22`,
                color: changeTypeColor(data.dominant_transition.change_type),
              }}
            >
              {changeTypeLabel(data.dominant_transition.change_type)}
            </span>
            <span className="text-muted-foreground">
              — {formatPct(data.dominant_transition.percentage_of_change)} of change ·{' '}
              {formatArea(data.dominant_transition.area_m2)}
            </span>
          </p>
        </div>
      )}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Transitions</h4>
        <Distribution rows={rows} />
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Change evidence</h4>
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
          <div
            className="bg-success"
            style={{ width: `${(es.corroborated_pixels / totalEv) * 100}%` }}
            title="Corroborated (class + spectral)"
          />
          <div
            className="bg-info"
            style={{ width: `${(es.spectral_only_pixels / totalEv) * 100}%` }}
            title="Spectral magnitude only"
          />
          <div
            className="bg-warning"
            style={{ width: `${(es.class_only_pixels / totalEv) * 100}%` }}
            title="Class change only"
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            Corroborated · {formatFractionPct(es.corroborated_fraction)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-info" aria-hidden="true" />
            Spectral only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
            Class only
          </span>
        </div>
      </section>

      {data.class_deltas.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Class area change</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.class_deltas.map((d) => (
                <TableRow key={d.class}>
                  <TableCell className="font-medium text-foreground">
                    {prettifyKey(d.class)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatArea(d.area_m2_before)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatArea(d.area_m2_after)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center justify-end gap-1">
                      <DeltaIcon value={d.area_m2_delta} />
                      {formatFractionPct(d.relative_delta)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {data.index_deltas.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Index change</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Δ in change</TableHead>
                <TableHead>Direction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.index_deltas.map((d) => (
                <TableRow key={d.index}>
                  <TableCell className="font-medium uppercase text-foreground">{d.index}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {d.mean_before.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {d.mean_after.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {signed(d.mean_delta_in_change, 3)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prettifyKey(d.direction)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Co-registration</h4>
        <RegistrationSummary reg={data.registration} />
        <p className="mt-2 text-xs text-muted-foreground">
          Method: {data.method}. Detectors: {data.detectors.join(', ')}. Features:{' '}
          {data.features_used.map((f) => f.toUpperCase()).join(', ')}.
        </p>
      </section>
    </div>
  )
}
