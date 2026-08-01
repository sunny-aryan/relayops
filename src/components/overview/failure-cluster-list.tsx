import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { Mono } from "@/components/shared/mono"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCount, formatDateTime } from "@/lib/format"
import { clusterActivityLabels, failureCategoryLabels } from "@/lib/labels"
import type { OverviewClusterRow, OverviewTimeRange } from "@/types"

export function FailureClusterList({
  rows,
  endpointNames,
  timeRange,
}: {
  rows: OverviewClusterRow[]
  endpointNames: Record<string, string>
  timeRange: OverviewTimeRange
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No failure patterns observed in this time range.
      </p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map(({ cluster, snapshot }) => {
        const params = new URLSearchParams()
        params.set("endpoint", cluster.endpointId)
        params.set("range", timeRange)
        if (cluster.eventTypes.length === 1) {
          params.set("event", cluster.eventTypes[0])
        }
        params.set("category", cluster.failureCategory)

        return (
          <li key={cluster.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {failureCategoryLabels[cluster.failureCategory]}
              </span>
              <span className="text-sm text-muted-foreground">on</span>
              <span className="text-sm font-medium text-foreground">
                {endpointNames[cluster.endpointId] ?? cluster.endpointId}
              </span>
              <StatusBadge
                tone={snapshot.activity === "active" ? "warning" : "neutral"}
                label={clusterActivityLabels[snapshot.activity]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">
                <span className="font-mono font-semibold text-foreground">
                  {formatCount(snapshot.deliveryCount)}
                </span>{" "}
                affected deliveries
              </span>
              <span>
                Events:{" "}
                {cluster.eventTypes.map((type, i) => (
                  <span key={type}>
                    {i > 0 && ", "}
                    <Mono>{type}</Mono>
                  </span>
                ))}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                First observed {formatDateTime(snapshot.firstSeenAt)} · latest{" "}
                {formatDateTime(snapshot.lastSeenAt)}
              </p>
              <Link
                to={`/deliveries?${params.toString()}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View matching deliveries
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
