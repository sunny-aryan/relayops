import { useState } from "react"
import { ArrowLeft, Clock, Copy, Check, FileText } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { DeliveryAssessmentSection } from "@/components/delivery/assessment-section"
import { RecoveryActionPanel } from "@/components/delivery/recovery-action-panel"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime, formatLatency } from "@/lib/format"
import {
  attemptOutcomeLabels,
  deliveryStateLabels,
  observedFailureCategoryLabels,
  retryDecisionLabels,
} from "@/lib/labels"
import { getDeliveryDetailRecord, listDeliveryEndpointOptions } from "@/repositories"
import { sanitizeExplorerParams } from "@/lib/delivery-filters"
import { cn } from "@/lib/utils"
import type {
  DeliveryAttemptRecord,
  DeliveryDetailAssessmentAggregate,
  DeliveryState,
} from "@/types"

const stateTones: Record<DeliveryState, StatusTone> = {
  delivered: "success",
  retrying: "warning",
  exhausted: "danger",
  unknown: "neutral",
}

function stateExplanation(state: DeliveryState, succeededAfterRetry: boolean): string {
  switch (state) {
    case "delivered":
      return succeededAfterRetry
        ? "The webhook was accepted successfully after one or more retries. Earlier unsuccessful attempts are retained in the timeline."
        : "The webhook was accepted successfully on the first attempt."
    case "retrying":
      return "Another delivery attempt is scheduled. The latest attempt did not result in confirmed delivery, and the retry policy has not yet reached its limit."
    case "exhausted":
      return "The retry policy has reached its configured limit without confirmed delivery. No further automatic retries are scheduled."
    case "unknown":
      return "No conclusive receiver outcome was observed. The receiver may have processed the request, but no confirmed response was recorded."
  }
}

export function DeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const { environment } = useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

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

  const backHref = `/deliveries${explorerQs}`

  const { data, loading, error } = useAsync(
    () => getDeliveryDetailRecord(environment, deliveryId ?? ""),
    [deliveryId, environment]
  )

  if (loading) return <Skeleton className="h-96 w-full rounded-lg" />

  if (error) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">Couldn't load this delivery.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </Panel>
    )
  }

  if (!data) {
    return (
      <ResourceNotFound
        resourceLabel="Delivery"
        resourceId={deliveryId}
        backHref={backHref}
        backLabel="Back to deliveries"
      />
    )
  }

  return (
    <DeliveryDetail
      data={data}
      backHref={backHref}
      onReplayRequested={(replayJobId) =>
        navigate(`/replays/${replayJobId}${explorerQs}`)
      }
      explorerQs={explorerQs}
    />
  )
}

function DeliveryDetail({
  data,
  backHref,
  explorerQs,
  onReplayRequested,
}: {
  data: DeliveryDetailAssessmentAggregate
  backHref: string
  explorerQs: string
  onReplayRequested: (replayJobId: string) => void
}) {
  const { delivery, event, endpoint, attempts } = data
  const [selectedAttempt, setSelectedAttempt] = useState(attempts.length - 1)
  const [copied, setCopied] = useState(false)

  const attempt = attempts[selectedAttempt]

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Deliveries", href: backHref },
          { label: delivery.id },
        ]}
        title={<Mono className="bg-transparent px-0 text-[0.9em]">{delivery.id}</Mono>}
        description={
          event
            ? `Delivery of ${event.eventType} to ${endpoint?.name ?? "an endpoint"}.`
            : "Webhook delivery record."
        }
        meta={<StatusBadge tone={stateTones[delivery.state]} label={deliveryStateLabels[delivery.state]} />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={backHref}>
              <ArrowLeft className="size-3.5" />
              Back to deliveries
            </Link>
          </Button>
        }
      />

      {/* Summary */}
      <Panel title="Delivery summary">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Delivery state</dt>
            <dd className="text-sm text-foreground">
              <StatusBadge tone={stateTones[delivery.state]} label={deliveryStateLabels[delivery.state]} />
            </dd>
          </div>
          {event && (
            <>
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Event type</dt>
                <dd className="text-sm text-foreground">
                  <Mono className="bg-transparent px-0">{event.eventType}</Mono>
                </dd>
              </div>
              <div className="contents">
                <dt className="text-sm text-muted-foreground">Event ID</dt>
                <dd className="text-sm text-foreground">
                  <MonoPlain className="text-xs">{event.eventId}</MonoPlain>
                </dd>
              </div>
            </>
          )}
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
          {endpoint && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Destination</dt>
              <dd className="text-sm text-foreground">
                <MonoPlain className="text-xs">{endpoint.maskedUrl}</MonoPlain>
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Environment</dt>
            <dd className="text-sm capitalize text-foreground">{delivery.environment}</dd>
          </div>
          {event && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Event received</dt>
              <dd className="text-sm text-foreground">{formatDateTime(event.occurredAt)}</dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">First attempt</dt>
            <dd className="text-sm text-foreground">{formatDateTime(delivery.firstAttemptAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Latest activity</dt>
            <dd className="text-sm text-foreground">{formatDateTime(delivery.lastAttemptAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Attempts</dt>
            <dd className="text-sm text-foreground">
              {delivery.attemptCount} of {delivery.maxAttempts}
            </dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {stateExplanation(delivery.state, delivery.succeededAfterRetry)}
        </p>
      </Panel>

      {/* Operational assessment */}
      {data.assessment && <DeliveryAssessmentSection assessment={data.assessment} operatorName={data.operatorName} />}
      {!data.assessment && (
        <Panel title="Operational assessment">
          <p className="text-sm text-muted-foreground">
            Assessment unavailable. Required delivery or endpoint references could not be resolved.
          </p>
        </Panel>
      )}

      {/* Recovery action */}
      {data.assessment && (
        <RecoveryActionPanel
          delivery={delivery}
          event={event}
          endpoint={endpoint}
          assessment={data.assessment}
          operatorName={data.operatorName}
          operatorRole={data.operatorRole}
          replayState={data.replayState}
          environment={delivery.environment}
          explorerQs={explorerQs}
          onReplayRequested={onReplayRequested}
        />
      )}

      {/* Timeline */}
      <Panel title="Attempt timeline" description="Chronological record of every delivery attempt.">
        <ol className="flex flex-col gap-0" aria-label="Delivery attempts">
          {attempts.map((att, i) => (
            <AttemptTimelineItem
              key={att.id}
              attempt={att}
              isSelected={i === selectedAttempt}
              onSelect={() => setSelectedAttempt(i)}
            />
          ))}
        </ol>
      </Panel>

      {/* Evidence inspector */}
      <Panel
        title={`Evidence — attempt ${attempt.attemptNumber}`}
        description="Sanitized request and response evidence for the selected attempt."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              copyToClipboard(
                attempt.request.sanitizedPayload ?? attempt.response.sanitizedBody ?? ""
              )
            }
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Request evidence */}
          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Request</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
              <div className="contents">
                <dt className="text-xs text-muted-foreground">Method</dt>
                <dd className="text-sm text-foreground">{attempt.request.method}</dd>
              </div>
              <div className="contents">
                <dt className="text-xs text-muted-foreground">URL</dt>
                <dd className="text-sm text-foreground">
                  <MonoPlain className="text-xs">{attempt.request.maskedUrl}</MonoPlain>
                </dd>
              </div>
              <div className="contents">
                <dt className="text-xs text-muted-foreground">Content type</dt>
                <dd className="text-sm text-foreground">{attempt.request.contentType}</dd>
              </div>
              {attempt.request.apiVersion && (
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">API version</dt>
                  <dd className="text-sm text-foreground">
                    <MonoPlain className="text-xs">{attempt.request.apiVersion}</MonoPlain>
                  </dd>
                </div>
              )}
            </dl>
            {Object.keys(attempt.request.safeHeaders).length > 0 && (
              <div className="mt-2">
                <p className="mb-1 text-xs text-muted-foreground">Headers</p>
                <div className="overflow-x-auto rounded-md border border-border bg-muted/50 p-2">
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(attempt.request.safeHeaders).map(([key, value]) => (
                        <tr key={key}>
                          <td className="whitespace-nowrap py-0.5 pr-3 font-medium text-muted-foreground">
                            {key}
                          </td>
                          <td className="py-0.5">
                            <MonoPlain className="text-xs">{value}</MonoPlain>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-2">
              <p className="mb-1 text-xs text-muted-foreground">
                Payload{attempt.request.payloadTruncated && " (truncated)"}
                {attempt.request.payloadMalformed && " (malformed)"}
              </p>
              {attempt.request.sanitizedPayload ? (
                <pre
                  aria-label="Sanitized request payload"
                  className="max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed"
                >
                  <code className="font-mono">{attempt.request.sanitizedPayload}</code>
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">No payload available.</p>
              )}
            </div>
          </div>

          {/* Response evidence */}
          <div className="border-t border-border pt-3">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
              Response or transport result
            </h3>
            {attempt.response.responseAbsent ? (
              <div className="rounded-md border border-border bg-muted/50 p-3">
                <p className="text-sm text-foreground">
                  <Clock className="mr-1.5 inline size-3.5 text-muted-foreground" />
                  No HTTP response was recorded.
                </p>
                {attempt.response.transportResult && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {attempt.response.transportResult}
                  </p>
                )}
                {attempt.outcome === "outcome_unknown" && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    The receiver's final acceptance could not be confirmed.
                  </p>
                )}
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
                  {attempt.response.httpStatus !== null && (
                    <div className="contents">
                      <dt className="text-xs text-muted-foreground">HTTP status</dt>
                      <dd className="text-sm text-foreground">{attempt.response.httpStatus}</dd>
                    </div>
                  )}
                </dl>
                {Object.keys(attempt.response.safeHeaders).length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-muted-foreground">Headers</p>
                    <div className="overflow-x-auto rounded-md border border-border bg-muted/50 p-2">
                      <table className="w-full text-xs">
                        <tbody>
                          {Object.entries(attempt.response.safeHeaders).map(([key, value]) => (
                            <tr key={key}>
                              <td className="whitespace-nowrap py-0.5 pr-3 font-medium text-muted-foreground">
                                {key}
                              </td>
                              <td className="py-0.5">
                                <MonoPlain className="text-xs">{value}</MonoPlain>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Body{attempt.response.bodyTruncated && " (truncated)"}
                  </p>
                  {attempt.response.sanitizedBody ? (
                    <pre
                      aria-label="Sanitized response body"
                      className="max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed"
                    >
                      <code className="font-mono">{attempt.response.sanitizedBody}</code>
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No response body available.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Panel>
    </>
  )
}

function AttemptTimelineItem({
  attempt,
  isSelected,
  onSelect,
}: {
  attempt: DeliveryAttemptRecord
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-current={isSelected ? "true" : undefined}
        aria-label={`Attempt ${attempt.attemptNumber}${isSelected ? " — evidence shown" : " — view evidence"}`}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-sm px-1 py-3 text-left transition-colors",
          "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
          isSelected
            ? "bg-muted/70 ring-1 ring-inset ring-border"
            : "hover:bg-muted/50"
        )}
      >
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground"
          )}
        >
          {attempt.attemptNumber}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {attemptOutcomeLabels[attempt.outcome]}
            </span>
            {attempt.httpStatusCode !== null && (
              <MonoPlain className="text-xs text-muted-foreground">
                HTTP {attempt.httpStatusCode}
              </MonoPlain>
            )}
            {attempt.observedFailureCategory && (
              <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">
                {observedFailureCategoryLabels[attempt.observedFailureCategory]}
              </span>
            )}
            <span
              className={cn(
                "ml-auto inline-flex shrink-0 items-center gap-1 text-[0.6875rem] font-medium",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            >
              <FileText className="size-3" />
              {isSelected ? "Evidence shown" : "View evidence"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{attempt.responseSummary}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{formatDateTime(attempt.startedAt)}</span>
            {attempt.latencyMs !== null && <span>{formatLatency(attempt.latencyMs)}</span>}
            <span>{retryDecisionLabels[attempt.retryDecision]}</span>
            {attempt.nextRetryAt && (
              <span>Next: {formatDateTime(attempt.nextRetryAt)}</span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
