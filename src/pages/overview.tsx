import { useState } from "react"
import { AlertCircle, Inbox } from "lucide-react"

import { EndpointHealthTable } from "@/components/overview/endpoint-health-table"
import { FailureClusterList } from "@/components/overview/failure-cluster-list"
import { MetricStrip } from "@/components/overview/metric-strip"
import { OperationalSummary } from "@/components/overview/operational-summary"
import { TimeRangeSelector } from "@/components/overview/time-range-selector"
import { TrendChart } from "@/components/overview/trend-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { Panel } from "@/components/shared/panel"
import { IncidentSeverityBadge } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { timeRangeLabels } from "@/lib/labels"
import { getOverview } from "@/repositories"
import type { OverviewTimeRange } from "@/types"

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading overview">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

export function OverviewPage() {
  const { environment } = useApp()
  const [timeRange, setTimeRange] = useState<OverviewTimeRange>("24h")
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useAsync(
    () => getOverview(environment, timeRange),
    [environment, timeRange, reloadKey]
  )

  const endpointNames = Object.fromEntries(
    (data?.endpoints ?? []).map((r) => [r.endpoint.id, r.endpoint.name])
  )

  return (
    <>
      <PageHeader
        title="Overview"
        description="Webhook health and delivery reliability for this environment."
        actions={<TimeRangeSelector value={timeRange} onChange={setTimeRange} />}
      />

      {loading && <OverviewSkeleton />}

      {!loading && error && (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load overview data"
          description="Something went wrong while loading telemetry for this environment."
        >
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </EmptyState>
      )}

      {!loading && !error && data && data.endpoints.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No endpoints in this environment"
          description="Once an endpoint is receiving webhooks here, its health and delivery telemetry will appear on this page."
        />
      )}

      {!loading && !error && data && data.endpoints.length > 0 && (
        <>
          <OperationalSummary data={data} />

          <MetricStrip metrics={data.metrics} />

          <Panel
            title="Delivery health trend"
            description={`Delivery outcomes across ${timeRangeLabels[timeRange].toLowerCase()}, ending at the latest telemetry timestamp.`}
          >
            <TrendChart trend={data.trend} timeRange={timeRange} />
          </Panel>

          <Panel
            title="Endpoint health"
            description="Endpoints needing attention are listed first. Select an endpoint to open its detail page."
          >
            <EndpointHealthTable rows={data.endpoints} />
          </Panel>

          <Panel
            title="Observed failure patterns"
            description="Failure clusters observed in the selected range, ranked by affected deliveries. These are evidence, not a root-cause determination."
          >
            <FailureClusterList rows={data.clusters} endpointNames={endpointNames} />
          </Panel>

          <Panel
            title="Helio platform status"
            description="Provider-side notices are separate from the health of your own endpoints."
          >
            {data.deliveryIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active Helio platform incidents are affecting webhook delivery in this
                environment.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.deliveryIncidents.map((incident) => (
                  <li key={incident.id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {incident.title}
                      </span>
                      <IncidentSeverityBadge severity={incident.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground">{incident.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatDateTime(incident.startedAt)} · This notice does not
                      establish the cause of the endpoint-level failures shown above.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  )
}
