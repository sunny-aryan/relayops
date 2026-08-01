import { useState } from "react"
import { useParams } from "react-router-dom"
import { AlertCircle } from "lucide-react"

import { FailureClusterList } from "@/components/overview/failure-cluster-list"
import { MetricStrip } from "@/components/overview/metric-strip"
import { TimeRangeSelector } from "@/components/overview/time-range-selector"
import { TrendChart } from "@/components/overview/trend-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { EndpointHealthBadge, StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { endpointStatusLabels, timeRangeLabels } from "@/lib/labels"
import { getEndpointDetail } from "@/repositories"
import type { OverviewTimeRange } from "@/types"

function EndpointDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading endpoint detail">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function EndpointDetailPage() {
  const { endpointId } = useParams<{ endpointId: string }>()
  const { environment } = useApp()
  const [timeRange, setTimeRange] = useState<OverviewTimeRange>("24h")
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useAsync(
    () => getEndpointDetail(environment, endpointId ?? "", timeRange),
    [environment, endpointId, timeRange, reloadKey]
  )

  if (loading) return <EndpointDetailSkeleton />

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load endpoint detail"
        description="Something went wrong while loading this endpoint's operational data."
      >
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </Button>
      </EmptyState>
    )
  }

  if (!data || !data.endpoint) {
    return (
      <ResourceNotFound
        resourceLabel="Endpoint"
        resourceId={endpointId}
        backHref="/endpoints"
        backLabel="Back to endpoints"
      />
    )
  }

  const { endpoint, telemetry, metrics, trend, clusters } = data
  const disabled = endpoint.status === "disabled"
  const insufficient = !disabled && !metrics
  const endpointNames = { [endpoint.id]: endpoint.name }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Endpoints", href: "/endpoints" },
          { label: endpoint.name },
        ]}
        title={endpoint.name}
        description={endpoint.description}
        meta={
          disabled ? undefined : insufficient ? (
            <span className="text-sm text-muted-foreground">Insufficient telemetry</span>
          ) : (
            <EndpointHealthBadge health={endpoint.health} />
          )
        }
        actions={<TimeRangeSelector value={timeRange} onChange={setTimeRange} />}
      />

      <section
        aria-label="Endpoint summary"
        className="rounded-lg border border-border bg-card px-4 py-3.5 shadow-xs"
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Endpoint ID</dt>
            <dd>
              <Mono className="text-xs">{endpoint.id}</Mono>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Destination URL</dt>
            <dd className="min-w-0">
              <Mono className="block truncate text-xs">{endpoint.maskedUrl}</Mono>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge
                tone="neutral"
                label={endpointStatusLabels[endpoint.status]}
                withDot={false}
              />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Health</dt>
            <dd>
              {disabled ? (
                <span className="text-sm text-muted-foreground">Not evaluated</span>
              ) : insufficient ? (
                <span className="text-sm text-muted-foreground">Insufficient telemetry</span>
              ) : (
                <EndpointHealthBadge health={endpoint.health} />
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Environment</dt>
            <dd className="text-sm font-medium capitalize text-foreground">{environment}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Latest telemetry</dt>
            <dd className="text-sm text-foreground">
              {telemetry.latestAt ? formatDateTime(telemetry.latestAt) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {disabled ? (
        <Panel
          title="Operational metrics"
          description="This endpoint is disabled, so operational metrics are not evaluated."
        >
          <p className="text-sm text-muted-foreground">
            While an endpoint is disabled, Helio does not attempt deliveries to it and no
            success-rate, latency, or backlog figures are collected. The configuration below is
            retained for reference.
          </p>
        </Panel>
      ) : insufficient ? (
        <Panel
          title="Operational metrics"
          description="No telemetry is available for this endpoint in the selected time range."
        >
          <p className="text-sm text-muted-foreground">
            Telemetry for this endpoint is insufficient to display delivery metrics, trends, or
            failure patterns for the selected range. This may indicate the endpoint was recently
            configured or has not yet received deliveries.
          </p>
        </Panel>
      ) : (
        <>
          {metrics && <MetricStrip metrics={metrics} scope="endpoint" />}

          <Panel
            title="Delivery health trend"
            description={`Delivery outcomes for this endpoint across ${timeRangeLabels[
              timeRange
            ].toLowerCase()}.`}
          >
            <TrendChart trend={trend} timeRange={timeRange} />
          </Panel>

          <Panel
            title="Observed failure patterns"
            description="Failure clusters observed for this endpoint in the selected range, ranked by affected deliveries. These are evidence, not a root-cause determination."
          >
            <FailureClusterList rows={clusters} endpointNames={endpointNames} />
          </Panel>
        </>
      )}

      <Panel
        title="Configuration"
        description="How this endpoint receives webhooks from Helio. Read-only in this milestone."
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          <ConfigRow label="Destination URL" value={<Mono>{endpoint.maskedUrl}</Mono>} />
          <ConfigRow
            label="Subscribed events"
            value={
              <span className="flex flex-wrap gap-1.5">
                {endpoint.subscribedEventTypes.map((type) => (
                  <Mono key={type}>{type}</Mono>
                ))}
              </span>
            }
          />
          <ConfigRow
            label="Signing"
            value={
              <span className="flex items-center gap-2">
                <StatusBadge
                  tone={endpoint.signingEnabled ? "success" : "neutral"}
                  label={endpoint.signingEnabled ? "Enabled" : "Disabled"}
                  withDot={false}
                />
                {endpoint.signingEnabled && (
                  <Mono className="text-xs">{endpoint.signingAlgorithm}</Mono>
                )}
              </span>
            }
          />
          <ConfigRow label="Signing key" value={<Mono>{endpoint.signingKeyMasked}</Mono>} />
          <ConfigRow label="API version" value={<Mono>{endpoint.apiVersion}</Mono>} />
          <ConfigRow
            label="Retry policy"
            value={
              <span className="text-sm text-foreground">
                Up to {endpoint.retryMaxAttempts} attempts · {endpoint.retryBackoffStrategy}{" "}
                backoff
              </span>
            }
          />
          <ConfigRow label="Created" value={formatDateTime(endpoint.createdAt)} />
          <ConfigRow label="Last updated" value={formatDateTime(endpoint.updatedAt)} />
          {disabled && endpoint.disabledAt && (
            <ConfigRow
              label="Disabled"
              value={`${formatDateTime(endpoint.disabledAt)} — ${endpoint.disabledReason ?? "No reason recorded"}`}
            />
          )}
        </dl>
      </Panel>
    </>
  )
}
