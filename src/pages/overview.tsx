import { Gauge } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { EndpointHealthBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount } from "@/lib/format"
import { listActiveIncidents, listEndpoints } from "@/repositories"

export function OverviewPage() {
  const { environment } = useApp()
  const endpoints = useAsync(() => listEndpoints(environment), [environment])
  const incidents = useAsync(
    () =>
      listActiveIncidents().then((all) =>
        all.filter((i) => i.affectedEnvironments.includes(environment))
      ),
    [environment]
  )

  return (
    <>
      <PageHeader
        title="Overview"
        description="A live summary of webhook health and delivery reliability for this environment."
      />
      <Panel
        title="Endpoint health"
        description="Current health of each endpoint receiving webhooks in this environment."
      >
        {endpoints.loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {(endpoints.data ?? []).map((endpoint) => (
              <li
                key={endpoint.id}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {endpoint.name}
                </span>
                <span className="flex items-center gap-3">
                  {endpoint.backlogCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Backlog {formatCount(endpoint.backlogCount)}
                    </span>
                  )}
                  <EndpointHealthBadge health={endpoint.health} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {(incidents.data?.length ?? 0) > 0 && (
        <Panel
          title="Platform notices"
          description="Active notices from Helio that may affect webhook delivery."
        >
          <ul className="flex flex-col gap-2">
            {incidents.data!.map((incident) => (
              <li key={incident.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{incident.title}.</span>{" "}
                {incident.summary}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={Gauge}
        title="Reliability dashboard"
        items={[
          "Success-rate and latency trends per endpoint",
          "Failure-cluster highlights with direct links to affected deliveries",
          "Backlog and retry-queue depth over time",
        ]}
      />
    </>
  )
}
