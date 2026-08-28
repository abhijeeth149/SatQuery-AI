import type { SarData } from '@/types/api'
import { Stat, StatGrid, Swatch } from '@/components/result/stat'
import { Distribution } from '@/components/result/distribution'
import { classColor, prettifyKey } from '@/lib/classes'
import { formatPct } from '@/lib/format'

function SpeckleHistogram({
  counts,
  mean,
  p05,
  p95,
}: {
  counts: number[]
  mean: number
  p05: number
  p95: number
}) {
  const max = Math.max(...counts, 1)
  return (
    <div>
      <div className="flex h-20 items-end gap-px" role="img" aria-label="Backscatter histogram">
        {counts.map((c, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${Math.max(1, (c / max) * 100)}%` }}
            title={`${c}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>p05 {p05.toFixed(1)} dB</span>
        <span>mean {mean.toFixed(1)} dB</span>
        <span>p95 {p95.toFixed(1)} dB</span>
      </div>
    </div>
  )
}

export function SarPanel({ data }: { data: SarData }) {
  const rows = data.regimes.map((r) => ({
    key: r.regime,
    label: prettifyKey(r.regime),
    color: classColor(r.regime),
    fraction: r.fraction,
    valueLabel: formatPct(r.percentage),
    hint: `${r.mean_backscatter_db.toFixed(1)} dB`,
  }))

  return (
    <div className="space-y-5">
      <StatGrid>
        <Stat label="Polarization" value={data.polarization} />
        <Stat
          label="Speckle filter"
          value={data.speckle.filter}
          hint={`${data.speckle.window}×${data.speckle.window} window`}
        />
        <Stat label="Equiv. looks (ENL)" value={data.speckle.estimated_enl.toFixed(1)} />
        <Stat
          label="Speckle reduction"
          value={`${data.speckle.speckle_reduction_factor.toFixed(2)}×`}
          hint={`CV ${data.speckle.input_cv.toFixed(2)} → ${data.speckle.output_cv.toFixed(2)}`}
        />
      </StatGrid>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Scattering regimes</h4>
        <Distribution rows={rows} />
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Physical interpretation</h4>
        <ul className="space-y-2 text-sm">
          {data.regimes.map((r) => (
            <li key={r.regime} className="flex items-start gap-2">
              <Swatch color={classColor(r.regime)} />
              <span>
                <span className="font-medium text-foreground">{prettifyKey(r.regime)}</span>
                <span className="text-muted-foreground">
                  {' '}
                  ({r.mean_backscatter_db.toFixed(1)} dB) — likely {r.candidate_surfaces.join(', ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Backscatter thresholds ({data.thresholds_db.method}): smooth ≤{' '}
          {data.thresholds_db.smooth.toFixed(1)} dB, bright ≥ {data.thresholds_db.bright.toFixed(1)}{' '}
          dB. SAR gives scattering behaviour, not material identity — surfaces are candidates, not
          confirmed classes.
        </p>
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Backscatter distribution (dB)
        </h4>
        <SpeckleHistogram
          counts={data.histogram.counts}
          mean={data.histogram.mean}
          p05={data.histogram.p05}
          p95={data.histogram.p95}
        />
      </section>
    </div>
  )
}
