import { Stethoscope } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { DeliveryStatusBadge } from "@/components/shared/status-badge"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { failureCategoryLabels, replayEligibilityLabels } from "@/lib/labels"
import {
  getDeliveryById,
  getEndpointById,
  getEventById,
  listDeliveryAttempts,
} from "@/repositories"
import type { Environment } from "@/types"

async function loadDelivery(deliveryId: string, environment: Environment) {
  const delivery = await getDeliveryById(deliveryId, environment)
  if (!delivery) return null
  const [event, endpoint, attempts] = await Promise.all([
    getEventById(delivery.eventId, environment),
    getEndpointById(delivery.endpointId, environment),
    listDeliveryAttempts(delivery.id),
  ])
  return { delivery, event, endpoint, attempts }
}

export function DeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const { environment } = useApp()
  const { data, loading } = useAsync(
    () => loadDelivery(deliveryId ?? "", environment),
    [deliveryId, environment]
  )

  if (loading) return <PageSkeleton />

  if (!data) {
    return (
      <ResourceNotFound
        resourceLabel="Delivery"
        resourceId={deliveryId}
        backHref="/deliveries"
        backLabel="Back to deliveries"
      />
    )
  }

  const { delivery, event, endpoint, attempts } = data

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Deliveries", href: "/deliveries" },
          { label: delivery.id },
        ]}
        title={<Mono className="bg-transparent px-0 text-[0.9em]">{delivery.id}</Mono>}
        description={
          event
            ? `Delivery of ${event.type} to ${endpoint?.name ?? "an endpoint"}.`
            : "Webhook delivery record."
        }
        meta={<DeliveryStatusBadge status={delivery.status} />}
      />
      <Panel title="Delivery summary">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {event && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Event</dt>
              <dd className="min-w-0 text-sm text-foreground">
                <Mono>{event.type}</Mono>{" "}
                <span className="text-muted-foreground">— {event.payloadSummary}</span>
              </dd>
            </div>
          )}
          {endpoint && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Endpoint</dt>
              <dd className="text-sm">
                <Link
                  to={`/endpoints/${endpoint.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {endpoint.name}
                </Link>
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Attempts</dt>
            <dd className="text-sm text-foreground">
              {delivery.attemptCount} of {delivery.maxAttempts}
            </dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Last attempt</dt>
            <dd className="text-sm text-foreground">{formatDateTime(delivery.lastAttemptAt)}</dd>
          </div>
          {delivery.nextRetryAt && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Next retry</dt>
              <dd className="text-sm text-foreground">{formatDateTime(delivery.nextRetryAt)}</dd>
            </div>
          )}
          {delivery.failureCategory && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Failure cause</dt>
              <dd className="text-sm text-foreground">
                {failureCategoryLabels[delivery.failureCategory]}
              </dd>
            </div>
          )}
          {delivery.replayEligibility && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Replay</dt>
              <dd className="text-sm text-foreground">
                {replayEligibilityLabels[delivery.replayEligibility]}
                {delivery.replayJobId && (
                  <>
                    {" — "}
                    <Link
                      to={`/replays/${delivery.replayJobId}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      view replay job
                    </Link>
                  </>
                )}
              </dd>
            </div>
          )}
        </dl>
      </Panel>
      {attempts.length > 0 && (
        <Panel
          title="Recorded attempts"
          description="Attempts captured for this delivery. The full timeline view arrives in a later milestone."
          contentClassName="p-0"
        >
          <ul className="flex flex-col divide-y divide-border">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="font-medium">Attempt {attempt.attemptNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(attempt.startedAt)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {attempt.responseSummary}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={Stethoscope}
        title="Delivery diagnosis"
        items={[
          "Full attempt timeline with request and response evidence",
          "Deterministic diagnosis of the failure cause",
          "Guided, permission-aware replay workflow",
        ]}
      />
    </>
  )
}
