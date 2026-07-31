import { cn } from "@/lib/utils"
import {
  deliveryStatusLabels,
  endpointHealthLabels,
  incidentSeverityLabels,
  replayJobStatusLabels,
} from "@/lib/labels"
import type {
  DeliveryStatus,
  EndpointHealth,
  IncidentSeverity,
  ReplayJobStatus,
} from "@/types"

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info"

const toneClasses: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/30 bg-info/10 text-info",
}

interface StatusBadgeProps {
  tone: StatusTone
  label: string
  withDot?: boolean
  className?: string
}

export function StatusBadge({ tone, label, withDot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {withDot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  )
}

const endpointHealthTones: Record<EndpointHealth, StatusTone> = {
  healthy: "success",
  degraded: "warning",
  failing: "danger",
  disabled: "neutral",
  stale: "neutral",
}

export function EndpointHealthBadge({ health }: { health: EndpointHealth }) {
  return <StatusBadge tone={endpointHealthTones[health]} label={endpointHealthLabels[health]} />
}

const deliveryStatusTones: Record<DeliveryStatus, StatusTone> = {
  succeeded: "success",
  failed: "danger",
  retrying: "warning",
  exhausted: "danger",
  unknown: "warning",
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <StatusBadge tone={deliveryStatusTones[status]} label={deliveryStatusLabels[status]} />
}

const replayJobStatusTones: Record<ReplayJobStatus, StatusTone> = {
  queued: "neutral",
  running: "info",
  completed: "success",
  partially_completed: "warning",
  failed: "danger",
  cancelled: "neutral",
}

export function ReplayJobStatusBadge({ status }: { status: ReplayJobStatus }) {
  return <StatusBadge tone={replayJobStatusTones[status]} label={replayJobStatusLabels[status]} />
}

const incidentSeverityTones: Record<IncidentSeverity, StatusTone> = {
  minor: "warning",
  major: "danger",
  critical: "danger",
}

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <StatusBadge tone={incidentSeverityTones[severity]} label={incidentSeverityLabels[severity]} />
  )
}
