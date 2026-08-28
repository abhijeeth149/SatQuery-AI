import { useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, ImageOverlay, ZoomControl } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'
import type { Artifact, LegendEntry, Wgs84Bounds } from '@/types/api'
import { Swatch } from '@/components/result/stat'
import { Layers, MapPin, ImageOff } from 'lucide-react'

function toLeafletBounds(b: Wgs84Bounds): LatLngBoundsExpression {
  return [
    [b.south, b.west],
    [b.north, b.east],
  ]
}

function fmtCoord(n: number): string {
  return n.toFixed(4)
}

/** Merge legends from the currently-visible overlays, de-duplicated by key. */
function mergeLegends(overlays: Artifact[], visible: Record<string, boolean>): LegendEntry[] {
  const seen = new Map<string, LegendEntry>()
  for (const o of overlays) {
    if (!visible[o.kind]) continue
    for (const entry of o.legend) {
      if (!seen.has(entry.key)) seen.set(entry.key, entry)
    }
  }
  return [...seen.values()]
}

interface ResultMapProps {
  artifacts: Artifact[]
}

/**
 * Renders the georeferenced scene: a base image plus one or more classified
 * overlays, each toggleable, with an opacity control and a legend. When the
 * inputs are not georeferenced (bounds_wgs84 === null) we fall back to a plain
 * pixel viewer (brief §8) rather than pretending to know world coordinates.
 */
export function ResultMap({ artifacts }: ResultMapProps) {
  const base = useMemo(() => artifacts.find((a) => a.kind === 'base') ?? null, [artifacts])
  const overlays = useMemo(() => artifacts.filter((a) => a.kind !== 'base'), [artifacts])

  // Default: first overlay visible, the rest off.
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(overlays.map((o, i) => [o.kind, i === 0])),
  )
  const [opacity, setOpacity] = useState(0.75)

  const sceneBounds = useMemo(() => {
    const withBounds = artifacts.find((a) => a.bounds_wgs84)
    return withBounds?.bounds_wgs84 ?? null
  }, [artifacts])

  const legend = useMemo(() => mergeLegends(overlays, visible), [overlays, visible])

  if (artifacts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground">
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        <p className="text-sm">No rendered imagery for this analysis.</p>
      </div>
    )
  }

  const georeferenced = sceneBounds !== null

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border">
        {georeferenced ? (
          <div className="h-[360px] w-full md:h-[440px]">
            <MapContainer
              bounds={toLeafletBounds(sceneBounds)}
              boundsOptions={{ padding: [10, 10] }}
              zoomControl={false}
              attributionControl={false}
              scrollWheelZoom
              className="h-full w-full"
            >
              <ZoomControl position="topright" />
              {base?.bounds_wgs84 && (
                <ImageOverlay url={base.url} bounds={toLeafletBounds(base.bounds_wgs84)} />
              )}
              {overlays.map(
                (o) =>
                  o.bounds_wgs84 &&
                  visible[o.kind] && (
                    <ImageOverlay
                      key={o.kind}
                      url={o.url}
                      bounds={toLeafletBounds(o.bounds_wgs84)}
                      opacity={opacity}
                    />
                  ),
              )}
            </MapContainer>
          </div>
        ) : (
          // Non-georeferenced: plain stacked pixel viewer.
          <div className="relative h-[360px] w-full bg-muted md:h-[440px]">
            {base && (
              <img
                src={base.url}
                alt={base.label}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
            {overlays.map(
              (o) =>
                visible[o.kind] && (
                  <img
                    key={o.kind}
                    src={o.url}
                    alt={o.label}
                    style={{ opacity }}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ),
            )}
          </div>
        )}
      </div>

      {/* Layer + opacity controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          Layers
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {base && (
            <span className="text-xs text-muted-foreground">
              Base: <span className="font-medium text-foreground">{base.label}</span>
            </span>
          )}
          {overlays.map((o) => (
            <label
              key={o.kind}
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={!!visible[o.kind]}
                onChange={(e) => setVisible((prev) => ({ ...prev, [o.kind]: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {o.label}
            </label>
          ))}
        </div>
        {overlays.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Overlay opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1.5 w-32 cursor-pointer accent-primary"
              aria-label="Overlay opacity"
            />
            <span className="tabular-nums">{Math.round(opacity * 100)}%</span>
          </label>
        )}
      </div>

      {/* Legend */}
      {legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border p-3 text-sm">
          {legend.map((entry) => (
            <span key={entry.key} className="inline-flex items-center gap-1.5">
              <Swatch color={entry.color} />
              <span className="text-foreground">{entry.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Georeferencing readout */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        {georeferenced && sceneBounds ? (
          <span>
            WGS84 bounds — S {fmtCoord(sceneBounds.south)}, W {fmtCoord(sceneBounds.west)} → N{' '}
            {fmtCoord(sceneBounds.north)}, E {fmtCoord(sceneBounds.east)}
          </span>
        ) : (
          <span>Non-georeferenced input — showing pixel view (no world coordinates).</span>
        )}
      </p>
    </div>
  )
}
