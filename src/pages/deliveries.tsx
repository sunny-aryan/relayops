import { ArrowRightLeft, ListFilter } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/shared/empty-state"
import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { DeliveryStatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { getEndpointById, getEventById, listDeliveries } from "@/repositories"
import type { Delivery, Endpoint, Environment, Event } from "@/types"

interface DeliveryRow {
  delivery: Delivery
  event: Event | null
  endpoint: Endpoint | null
}

async function loadRows(environment: Environment): Promise<DeliveryRow[]> {
  const deliveries = await listDeliveries(environment)
  return Promise.all(
    deliveries.map(async (delivery) => ({
      delivery,
      event: await getEventById(delivery.eventId, environment),
      endpoint: await getEndpointById(delivery.endpointId, environment),
    }))
  )
}

export function DeliveriesPage() {
  const { environment } = useApp()
  const { data, loading } = useAsync(() => loadRows(environment), [environment])

  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Individual webhook deliveries in this environment, with their latest outcome."
      />
      {loading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No deliveries in this environment"
          description="Deliveries appear here as Helio sends webhook events to your endpoints."
        />
      ) : (
        <Panel contentClassName="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {data!.map(({ delivery, event, endpoint }) => (
              <li key={delivery.id}>
                <Link
                  to={`/deliveries/${delivery.id}`}
                  className="flex flex-col gap-1 px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {event && <Mono>{event.type}</Mono>}
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-foreground">
                        {endpoint?.name ?? "Unknown endpoint"}
                      </span>
                    </span>
                    <DeliveryStatusBadge status={delivery.status} />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <Mono className="bg-transparent px-0">{delivery.id}</Mono>
                    <span>
                      Attempt {delivery.attemptCount} of {delivery.maxAttempts}
                    </span>
                    <span>Last attempt {formatDateTime(delivery.lastAttemptAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={ListFilter}
        title="Delivery explorer"
        items={[
          "Filtering by endpoint, event type, status, and failure cause",
          "Deterministic diagnosis explaining why each delivery failed",
          "Safe single and bulk replay of recoverable deliveries",
        ]}
      />
    </>
  )
}
