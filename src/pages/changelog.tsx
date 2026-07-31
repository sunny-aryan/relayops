import { ScrollText } from "lucide-react"

import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { auditActorTypeLabels } from "@/lib/labels"
import { listRecentAuditEvents } from "@/repositories"

export function ChangelogPage() {
  const { data, loading } = useAsync(() => listRecentAuditEvents(10), [])

  return (
    <>
      <PageHeader
        title="Changelog"
        description="Recent configuration changes, recovery actions, and system events in this workspace."
      />
      {loading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : (
        <Panel title="Recent activity" contentClassName="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {(data ?? []).map((event) => (
              <li key={event.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {event.actorLabel}
                  </span>
                  <StatusBadge
                    tone="neutral"
                    label={auditActorTypeLabels[event.actorType]}
                    withDot={false}
                  />
                  <Mono>{event.action}</Mono>
                </span>
                <span className="text-sm text-muted-foreground">{event.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={ScrollText}
        title="Full audit trail"
        items={[
          "Filterable history of every configuration and recovery action",
          "Links from each entry to the affected resource",
          "Export for compliance review",
        ]}
      />
    </>
  )
}
