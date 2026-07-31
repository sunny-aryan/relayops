import { Table2, Webhook } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/shared/empty-state"
import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { EndpointHealthBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatLatency, formatPercent } from "@/lib/format"
import { listEndpoints } from "@/repositories"

export function EndpointsPage() {
  const { environment } = useApp()
  const { data, loading } = useAsync(() => listEndpoints(environment), [environment])

  return (
    <>
      <PageHeader
        title="Endpoints"
        description="The webhook receivers configured for this environment and their current health."
      />
      {loading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No endpoints in this environment"
          description="Endpoints receive webhook events from Helio. Endpoint creation arrives in a later milestone."
        />
      ) : (
        <Panel contentClassName="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {data!.map((endpoint) => (
              <li key={endpoint.id}>
                <Link
                  to={`/endpoints/${endpoint.id}`}
                  className="flex flex-col gap-1.5 px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {endpoint.name}
                    </span>
                    <EndpointHealthBadge health={endpoint.health} />
                  </span>
                  <Mono className="w-fit max-w-full truncate bg-transparent px-0 text-muted-foreground">
                    {endpoint.maskedUrl}
                  </Mono>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Success {formatPercent(endpoint.successRatePct)}</span>
                    <span>p95 {formatLatency(endpoint.p95LatencyMs)}</span>
                    <span>Backlog {endpoint.backlogCount}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={Table2}
        title="Full endpoint management"
        items={[
          "Sortable endpoint table with health trends and event-type filters",
          "Endpoint configuration, signing-key rotation, and pause controls",
          "Per-endpoint failure-cluster analysis",
        ]}
      />
    </>
  )
}
