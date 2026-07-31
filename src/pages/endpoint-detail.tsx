import { ActivitySquare } from "lucide-react"
import { useParams } from "react-router-dom"

import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { EndpointHealthBadge } from "@/components/shared/status-badge"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount, formatDateTime, formatLatency, formatPercent } from "@/lib/format"
import { getEndpointById } from "@/repositories"

export function EndpointDetailPage() {
  const { endpointId } = useParams<{ endpointId: string }>()
  const { environment } = useApp()
  const { data: endpoint, loading } = useAsync(
    () => getEndpointById(endpointId ?? "", environment),
    [endpointId, environment]
  )

  if (loading) return <PageSkeleton />

  if (!endpoint) {
    return (
      <ResourceNotFound
        resourceLabel="Endpoint"
        resourceId={endpointId}
        backHref="/endpoints"
        backLabel="Back to endpoints"
      />
    )
  }

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "URL", value: <Mono>{endpoint.maskedUrl}</Mono> },
    { label: "Signing key", value: <Mono>{endpoint.signingKeyMasked}</Mono> },
    {
      label: "Subscribed events",
      value: (
        <span className="flex flex-wrap gap-1.5">
          {endpoint.subscribedEventTypes.map((type) => (
            <Mono key={type}>{type}</Mono>
          ))}
        </span>
      ),
    },
    { label: "Success rate", value: formatPercent(endpoint.successRatePct) },
    { label: "p95 latency", value: formatLatency(endpoint.p95LatencyMs) },
    { label: "Backlog", value: formatCount(endpoint.backlogCount) },
    { label: "Telemetry as of", value: formatDateTime(endpoint.telemetryFreshAsOf) },
    { label: "Created", value: formatDateTime(endpoint.createdAt) },
  ]

  if (endpoint.status === "disabled") {
    facts.push({
      label: "Disabled",
      value: `${formatDateTime(endpoint.disabledAt)} — ${endpoint.disabledReason ?? "No reason recorded"}`,
    })
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Endpoints", href: "/endpoints" },
          { label: endpoint.name },
        ]}
        title={endpoint.name}
        description={endpoint.description}
        meta={<EndpointHealthBadge health={endpoint.health} />}
      />
      <Panel title="Configuration" description="How this endpoint receives webhooks from Helio.">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="min-w-0 text-sm text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <PlaceholderPanel
        icon={ActivitySquare}
        title="Endpoint diagnostics"
        items={[
          "Health charts for success rate, latency, and backlog",
          "Failure clusters grouped by cause with sample deliveries",
          "Recent delivery activity scoped to this endpoint",
        ]}
      />
    </>
  )
}
