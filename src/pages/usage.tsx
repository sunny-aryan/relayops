import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount, formatDate } from "@/lib/format"
import { listUsageBuckets } from "@/repositories"

export function UsagePage() {
  const { environment } = useApp()
  const { data, loading } = useAsync(() => listUsageBuckets(environment), [environment])
  const bucket = data?.[0] ?? null

  return (
    <>
      <PageHeader
        title="Usage"
        description="Webhook volume and delivery activity for this environment."
      />
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        bucket && (
          <Panel
            title="Current period"
            description={`${formatDate(bucket.periodStart)} – ${formatDate(bucket.periodEnd)}`}
          >
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Events received", value: bucket.eventsReceived },
                { label: "Deliveries attempted", value: bucket.deliveriesAttempted },
                { label: "Deliveries succeeded", value: bucket.deliveriesSucceeded },
                { label: "Replays executed", value: bucket.replaysExecuted },
              ].map((metric) => (
                <div key={metric.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                  <dd className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
                    {formatCount(metric.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        )
      )}
      <PlaceholderPanel
        icon={BarChart3}
        title="Usage analytics"
        items={[
          "Daily volume trends by event type and endpoint",
          "Retry and replay overhead breakdowns",
          "Exportable usage reports",
        ]}
      />
    </>
  )
}
