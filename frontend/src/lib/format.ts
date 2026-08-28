import type { AnalysisStatus, ConfidenceLevel, InputMode } from '@/types/api'
import type { BadgeProps } from '@/components/ui/badge'

type BadgeVariant = NonNullable<BadgeProps['variant']>

export const MODE_LABELS: Record<InputMode, string> = {
  single_optical: 'Single optical',
  single_sar: 'Single SAR',
  optical_sar_pair: 'Optical + SAR',
  bitemporal_pair: 'Bi-temporal',
}

export const TASK_LABELS: Record<string, string> = {
  vqa: 'Visual Q&A',
  captioning: 'Captioning',
  grounding: 'Grounding',
  object_detection: 'Object detection',
  segmentation: 'Segmentation',
  change_detection: 'Change detection',
  change_vqa: 'Change Q&A',
  optical_sar_analysis: 'Optical / SAR analysis',
  land_cover_analysis: 'Land-cover analysis',
  report_generation: 'Report',
  unknown: 'Unknown',
}

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode as InputMode] ?? mode
}

export function taskLabel(task: string): string {
  return TASK_LABELS[task] ?? task
}

export function confidenceBadgeVariant(level: ConfidenceLevel): BadgeVariant {
  switch (level) {
    case 'high':
      return 'success'
    case 'medium':
      return 'info'
    case 'low':
      return 'warning'
    case 'insufficient':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export function statusBadgeVariant(status: AnalysisStatus): BadgeVariant {
  switch (status) {
    case 'success':
      return 'success'
    case 'partial':
      return 'warning'
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const numberFmt = new Intl.NumberFormat(undefined)

export function formatNumber(value: number): string {
  return numberFmt.format(value)
}

export function formatInt(value: number): string {
  return numberFmt.format(Math.round(value))
}

/** Format a 0..1 fraction as a percentage string, e.g. 0.691 -> "69.1%". */
export function formatFractionPct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

/** Format an already-0..100 percentage value. */
export function formatPct(percentage: number, digits = 1): string {
  return `${percentage.toFixed(digits)}%`
}

/** Human-readable area from square metres (km² above 0.1 km², else m²). */
export function formatArea(m2: number): string {
  if (!Number.isFinite(m2)) return '—'
  const km2 = m2 / 1_000_000
  if (km2 >= 0.1) return `${km2.toFixed(2)} km²`
  return `${formatInt(m2)} m²`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
}
