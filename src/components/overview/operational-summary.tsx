import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { formatDateTime } from "@/lib/format"
import { telemetryStateLabels } from "@/lib/labels"
import type { OverviewData, TelemetryState } from "@/types"

const telemetryTones: Record<TelemetryState, StatusTone> = {
  current: "success",
  stale: "warning",
  insufficient: "neutral",
}

function plural(count: number, singular: string, pluralWord?: string): string {
  return count === 1 ? singular : (pluralWord ?? `${singular}s`)
}

export function OperationalSummary({ data }: { data: OverviewData }) {
  const active = data.endpoints.filter((r) => r.endpoint.status !== "disabled")
  const disabled = data.endpoints.filter((r) => r.endpoint.status === "disabled")
  const attention = active.filter(
    (r) => r.endpoint.health === "degraded" || r.endpoint.health === "failing"
  )
  const failing = attention.filter((r) => r.endpoint.health === "failing")
  const healthy = active.filter((r) => r.endpoint.health === "healthy")

  const headline =
    failing.length > 0
      ? "Webhook delivery is failing"
      : attention.length > 0
        ? "Webhook delivery is degraded"
        : "Webhook delivery is operating normally"

  const tone: StatusTone =
    failing.length > 0 ? "danger" : attention.length > 0 ? "warning" : "success"

  const HeadlineIcon = tone === "success" ? CheckCircle2 : AlertTriangle

  const attentionNames = attention.map((r) => r.endpoint.name).join(", ")

  return (
    <section
      aria-label="Operational summary"
      className="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <HeadlineIcon
              aria-hidden="true"
              className={
                tone === "danger"
                  ? "size-4 text-destructive"
                  : tone === "warning"
                    ? "size-4 text-warning"
                    : "size-4 text-success"
              }
            />
            <h2 className="text-sm font-semibold text-foreground">{headline}</h2>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {attention.length > 0 && (
              <li>
                {attention.length} of {active.length} active{" "}
                {plural(active.length, "endpoint")} {plural(attention.length, "needs", "need")}{" "}
                attention — {failing.length > 0 ? "failures are" : "degradation is"} concentrated
                in <span className="font-medium text-foreground">{attentionNames}</span>.
              </li>
            )}
            <li>
              {healthy.length} active {plural(healthy.length, "endpoint")}{" "}
              {plural(healthy.length, "is", "are")} operating normally.
            </li>
            {disabled.length > 0 && (
              <li>
                {disabled.map((r) => r.endpoint.name).join(", ")}{" "}
                {plural(disabled.length, "is", "are")} intentionally disabled and excluded from
                delivery metrics.
              </li>
            )}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-3.5" />
            Latest telemetry {formatDateTime(data.telemetry.latestAt)}
          </span>
          <StatusBadge
            tone={telemetryTones[data.telemetry.state]}
            label={`Telemetry ${telemetryStateLabels[data.telemetry.state].toLowerCase()}`}
          />
        </div>
      </div>
    </section>
  )
}
