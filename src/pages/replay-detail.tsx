import { useEffect, useRef } from "react"
import { ArrowLeft, Clock, RotateCcw } from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import { EnvironmentBadge } from "@/components/shared/environment-badge"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Panel } from "@/components/shared/panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { ReplayJobStatusBadge } from "@/components/shared/status-badge"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount, formatDateTime, formatLatency } from "@/lib/format"
import { getReplayJobDetail } from "@/repositories"
import { sanitizeExplorerParams } from "@/lib/delivery-filters"
import { listDeliveryEndpointOptions } from "@/repositories"
import type { Environment, ReplayJobDetailAggregate } from "@/types"

async function loadReplayJob(replayJobId: string, environment: Environment) {
  return getReplayJobDetail(environment, replayJobId)
}

export function ReplayDetailPage() {
  const { replayJobId } = useParams<{ replayJobId: string }>()
  const { environment } = useApp()
  const [searchParams] = useSearchParams()

  const { data: endpointOptions } = useAsync(
    () => listDeliveryEndpointOptions(environment),
    [environment]
  )

  const explorerQs = (() => {
    const sanitized = sanitizeExplorerParams(
      searchParams,
      (endpointOptions ?? []).map((e) => e.id)
    )
    const qs = sanitized.toString()
    return qs ? `?${qs}` : ""
  })()

  const { data, loading, reload } = useAsync(
    () => loadReplayJob(replayJobId ?? "", environment),
    [replayJobId, environment]
  )

  const isTerminal = data?.job.status === "completed" || data?.job.status === "failed" || data?.job.status === "skipped" || data?.job.status === "partially_completed" || data?.job.status === "cancelled"
  const shouldPoll = data !== null && !isTerminal

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!shouldPoll) return

    const poll = () => {
      reload()
      timerRef.current = setTimeout(poll, 800)
    }
    timerRef.current = setTimeout(poll, 800)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [shouldPoll, reload])

  if (loading && !data) return <PageSkeleton />

  if (!data) {
    return (
      <ResourceNotFound
        resourceLabel="Replay job"
        resourceId={replayJobId}
        backHref={`/deliveries${explorerQs}`}
        backLabel="Back to deliveries"
      />
    )
  }

  return <ReplayDetail data={data} explorerQs={explorerQs} />
}

function ReplayDetail({
  data,
  explorerQs,
}: {
  data: ReplayJobDetailAggregate
  explorerQs: string
}) {
  const { job, items, endpoint, requestedBy, requesterRoleLabel, sourceDelivery, sourceEvent, isSimulated, resultAvailable } = data
  const item = items[0]

  const backToDeliveryHref = sourceDelivery
    ? `/deliveries/${sourceDelivery.id}${explorerQs}`
    : `/deliveries${explorerQs}`

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Deliveries", href: `/deliveries${explorerQs}` },
          { label: job.id },
        ]}
        title={<Mono className="bg-transparent px-0 text-[0.9em]">{job.id}</Mono>}
        description={
          endpoint
            ? `Replay of missed deliveries to ${endpoint.name}.`
            : "Replay job record."
        }
        meta={
          <div className="flex items-center gap-2">
            <EnvironmentBadge environment={job.environment} />
            <ReplayJobStatusBadge status={job.status} />
          </div>
        }
      />

      <Panel title="Replay summary">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {isSimulated && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Execution</dt>
              <dd className="text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-info/30 bg-info/5 px-2 py-0.5 text-xs text-info">
                  <RotateCcw className="size-3" />
                  Simulated execution
                </span>
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Scope</dt>
            <dd className="text-sm">
              {job.scope === "single" ? "Single delivery" : "Bulk"}
            </dd>
          </div>
          {endpoint && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Endpoint</dt>
              <dd className="text-sm">
                <Link
                  to={`/endpoints/${endpoint.endpointId}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {endpoint.name}
                </Link>
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Requested by</dt>
            <dd className="text-sm text-foreground">
              {requestedBy?.name ?? "—"}
              {requestedBy && (
                <span className="text-muted-foreground">
                  {" "}({requesterRoleLabel})
                </span>
              )}
            </dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Requested</dt>
            <dd className="text-sm text-foreground">{formatDateTime(job.createdAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Started</dt>
            <dd className="text-sm text-foreground">{formatDateTime(job.startedAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Completed</dt>
            <dd className="text-sm text-foreground">{formatDateTime(job.completedAt)}</dd>
          </div>
          {job.idempotencyKey && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Request ID</dt>
              <dd className="text-sm">
                <MonoPlain className="text-xs break-all">{job.idempotencyKey}</MonoPlain>
              </dd>
            </div>
          )}
          {job.note && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Note</dt>
              <dd className="text-sm text-foreground">{job.note}</dd>
            </div>
          )}
        </dl>
      </Panel>

      {/* Recorded acknowledgement for new single replays */}
      {job.scope === "single" && job.acknowledgement && (
        <Panel title="Safety acknowledgement">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-foreground">{job.acknowledgement.text}</p>
            <p className="text-xs text-muted-foreground">
              Acknowledged {formatDateTime(job.acknowledgement.acknowledgedAt)}
            </p>
          </div>
        </Panel>
      )}

      {/* Progress for queued/running */}
      {(job.status === "queued" || job.status === "running") && (
        <Panel title="Progress">
          <div className="flex items-center gap-2" aria-live="polite">
            <Clock className="size-4 text-info animate-pulse" />
            <span className="text-sm text-foreground">
              {job.status === "queued"
                ? "Simulated replay execution is queued."
                : "Simulated replay execution is running."}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            1 item — {job.status === "queued" ? "pending" : "in progress"}
          </p>
        </Panel>
      )}

      {/* Result for terminal single replay */}
      {job.scope === "single" && item && (job.status === "completed" || job.status === "failed" || job.status === "skipped") && resultAvailable && (
        <Panel title="Replay result">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Item status</dt>
              <dd className="text-sm capitalize">{item.status}</dd>
            </div>
            {sourceDelivery && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Source delivery</dt>
                <dd className="text-sm">
                  <Link
                    to={`/deliveries/${sourceDelivery.id}${explorerQs}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <MonoPlain className="text-xs">{sourceDelivery.id}</MonoPlain>
                  </Link>
                </dd>
              </div>
            )}
            {sourceEvent && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Event type</dt>
                <dd className="text-sm"><MonoPlain className="text-xs">{sourceEvent.eventType}</MonoPlain></dd>
              </div>
            )}
            {item.resultSummary && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Outcome</dt>
                <dd className="text-sm text-foreground">{item.resultSummary}</dd>
              </div>
            )}
            {item.executionResult?.httpStatus != null && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">HTTP status</dt>
                <dd className="text-sm text-foreground">{item.executionResult.httpStatus}</dd>
              </div>
            )}
            {item.executionResult?.latencyMs != null && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Latency</dt>
                <dd className="text-sm text-foreground">{formatLatency(item.executionResult.latencyMs)}</dd>
              </div>
            )}
            {item.processedAt && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Processed</dt>
                <dd className="text-sm text-foreground">{formatDateTime(item.processedAt)}</dd>
              </div>
            )}
            {item.executionResult?.responseAbsent && (
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Response</dt>
                <dd className="text-sm text-foreground">No receiver response was recorded.</dd>
              </div>
            )}
          </dl>
        </Panel>
      )}

      {/* Result unavailable for terminal single replay with missing/inconsistent data */}
      {job.scope === "single" && (job.status === "completed" || job.status === "failed" || job.status === "skipped") && !resultAvailable && (
        <Panel title="Replay result">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-foreground">Result unavailable</p>
            <p className="text-xs text-muted-foreground">
              Coherent execution evidence could not be resolved for this replay job.
            </p>
          </div>
        </Panel>
      )}

      {/* Historical bulk job — limited item detail */}
      {job.scope === "bulk" && (
        <Panel title="Items">
          <p className="text-sm text-muted-foreground">
            {formatCount(job.totalItems)} total — {formatCount(job.succeededCount)} succeeded,{" "}
            {formatCount(job.failedCount)} failed, {formatCount(job.skippedCount)} skipped
          </p>
          {items.length > 0 && (
            <ul className="mt-3 space-y-1">
              {items.map((it) => (
                <li key={it.id} className="text-xs text-muted-foreground">
                  <MonoPlain className="text-xs">{it.deliveryId}</MonoPlain> — {it.status}
                  {it.resultSummary ? ` — ${it.resultSummary}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Audit trail */}
      {data.auditTrail.length > 0 && (
        <Panel title="Audit trail" description="Lifecycle events for this replay job.">
          <ol className="flex flex-col gap-0">
            {data.auditTrail.map((entry, i) => (
              <li key={`${entry.action}-${i}`} className="border-b border-border last:border-b-0">
                <Link
                  to={entry.detailHref}
                  className="flex flex-col gap-1 px-1 py-2.5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{entry.actionLabel}</span>
                    {entry.isSimulated && (
                      <span className="inline-flex items-center gap-1 rounded border border-info/30 bg-info/5 px-1.5 py-0.5 text-[0.6875rem] text-info">
                        Simulated
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(entry.occurredAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.summary}</p>
                  <span className="text-[0.6875rem] text-muted-foreground/70">{entry.actorLabel}</span>
                </Link>
              </li>
            ))}
          </ol>
          <Link
            to={`/audit?q=${encodeURIComponent(job.id)}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            View in Audit log
          </Link>
        </Panel>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={backToDeliveryHref}
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to delivery
        </Link>
        {endpoint && (
          <Link
            to={`/endpoints/${endpoint.endpointId}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            {endpoint.name}
          </Link>
        )}
      </div>
    </>
  )
}
