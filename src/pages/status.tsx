import { Activity } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { IncidentSeverityBadge, StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { listAllIncidents } from "@/repositories"

export function StatusPage() {
  const { data, loading } = useAsync(() => listAllIncidents(), [])
  const active = (data ?? []).filter((i) => i.status !== "resolved")
  const resolved = (data ?? []).filter((i) => i.status === "resolved")

  return (
    <>
      <PageHeader
        title="Status"
        description="Helio platform incidents that may affect webhook delivery or recovery."
      />
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <>
          <Panel
            title="Current status"
            description={
              active.length === 0
                ? "All Helio delivery systems are operating normally."
                : "One or more notices are active."
            }
            contentClassName="p-0"
          >
            {active.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                No active incidents.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {active.map((incident) => (
                  <li key={incident.id} className="flex flex-col gap-1 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {incident.title}
                      </span>
                      <IncidentSeverityBadge severity={incident.severity} />
                      <StatusBadge tone="info" label={incident.status} withDot={false} />
                    </span>
                    <span className="text-xs text-muted-foreground">{incident.summary}</span>
                    <span className="text-xs text-muted-foreground">
                      Started {formatDateTime(incident.startedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {resolved.length > 0 && (
            <Panel title="Recently resolved" contentClassName="p-0">
              <ul className="flex flex-col divide-y divide-border">
                {resolved.map((incident) => (
                  <li key={incident.id} className="flex flex-col gap-1 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {incident.title}
                      </span>
                      <StatusBadge tone="success" label="Resolved" />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Resolved {formatDateTime(incident.resolvedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
      <PlaceholderPanel
        icon={Activity}
        title="Live platform status"
        items={[
          "Component-level status for delivery, retries, and replay",
          "Incident timelines with updates from Helio",
          "Subscription to status notifications",
        ]}
      />
    </>
  )
}
