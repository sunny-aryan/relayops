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
  const disabled = data.endpoints.filter((r) => r.endpoint.status === "disabled")
  const active = data.endpoints.filter((r) => r.endpoint.status !== "disabled")
  const evaluated = active.filter((r) => r.metrics !== null)
  const unevaluated = active.filter((r) => r.metrics === null)
  const attention = evaluated.filter(
    (r) =>
      r.endpoint.health === "degraded" ||
      r.endpoint.health === "failing" ||
      r.endpoint.health === "stale"
  )
  const failing = evaluated.filter((r) => r.endpoint.health === "failing")
  const healthy = evaluated.filter((r) => r.endpoint.health === "healthy")

  let headline: string
  let tone: StatusTone

  if (failing.length > 0) {
    headline = "Webhook delivery is failing"
    tone = "danger"
  } else if (attention.length > 0) {
    headline = "Webhook delivery is degraded"
    tone = "warning"
  } else if (unevaluated.length > 0) {
    headline = "Webhook delivery health is incomplete"
    tone = "neutral"
  } else {
    headline = "Webhook delivery is operating normally"
    tone = "success"
  }

  const HeadlineIcon =
    tone === "success" ? CheckCircle2 : tone === "neutral" ? Clock : AlertTriangle

  const attentionNames = attention.map((r) => r.endpoint.name).join(", ")
  const unevaluatedNames = unevaluated.map((r) => r.endpoint.name).join(", ")

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
                    : tone === "neutral"
                      ? "size-4 text-muted-foreground"
                      : "size-4 text-success"
              }
            />
            <h2 className="text-sm font-semibold text-foreground">{headline}</h2>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {attention.length > 0 && (
              <li>
                {attention.length} of {evaluated.length} evaluated{" "}
                {plural(evaluated.length, "endpoint")} {plural(attention.length, "needs", "need")}{" "}
                attention — {failing.length > 0 ? "failures are" : "degradation is"} concentrated
                in <span className="font-medium text-foreground">{attentionNames}</span>.
              </li>
            )}
            {unevaluated.length > 0 && (
              <li>
                {unevaluatedNames} {plural(unevaluated.length, "has", "have")} insufficient
                telemetry and {plural(unevaluated.length, "is", "are")} excluded from evaluated
                endpoint-health counts.
              </li>
            )}
            <li>
              {healthy.length} evaluated {plural(healthy.length, "endpoint")}{" "}
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
