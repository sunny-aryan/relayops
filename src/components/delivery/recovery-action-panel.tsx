import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Link as LinkIcon, Loader2, RotateCcw, XCircle } from "lucide-react"
import { Link } from "react-router-dom"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDateTime } from "@/lib/format"
import { requestSingleDeliveryReplay } from "@/repositories"
import { roleLabels } from "@/lib/labels"
import type {
  DeliveryAssessment,
  DeliveryEndpointContext,
  DeliveryEventContext,
  DeliveryRecord,
  Environment,
  ReplayStateInfo,
  Role,
} from "@/types"

interface RecoveryActionPanelProps {
  delivery: DeliveryRecord
  event: DeliveryEventContext | null
  endpoint: DeliveryEndpointContext | null
  assessment: DeliveryAssessment
  operatorName: string
  operatorRole: Role
  replayState: ReplayStateInfo | null
  environment: Environment
  explorerQs: string
  onReplayRequested: (replayJobId: string) => void
}

export function RecoveryActionPanel({
  delivery,
  event,
  endpoint,
  assessment,
  operatorName,
  operatorRole,
  replayState,
  environment,
  explorerQs,
  onReplayRequested,
}: RecoveryActionPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState<string>("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commandError, setCommandError] = useState<string | null>(null)

  const isEligible = assessment.replayEligibility.decision === "eligible"
  const isPermitted = assessment.operatorPermission.permission === "permitted"
  const canShowButton = isEligible && isPermitted && replayState?.status !== "active" && replayState?.status !== "succeeded"

  // Generate idempotency key when dialog opens
  useEffect(() => {
    if (dialogOpen && !idempotencyKey) {
      setIdempotencyKey(
        `${delivery.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
      )
    }
  }, [dialogOpen, delivery.id, idempotencyKey])

  function handleOpenChange(open: boolean) {
    if (open) {
      setDialogOpen(true)
    } else {
      // Reset on close, but preserve idempotency key for retry
      setDialogOpen(false)
      setCommandError(null)
    }
  }

  function resetDialog() {
    setAcknowledged(false)
    setNote("")
    setCommandError(null)
    setIdempotencyKey("")
  }

  async function handleSubmit() {
    if (!acknowledged || submitting) return
    setSubmitting(true)
    setCommandError(null)

    const result = await requestSingleDeliveryReplay({
      deliveryId: delivery.id,
      environment,
      acknowledgement: acknowledged,
      note: note.trim() || null,
      idempotencyKey,
    })

    setSubmitting(false)

    if (result.ok && result.replayJobId) {
      resetDialog()
      setDialogOpen(false)
      onReplayRequested(result.replayJobId)
    } else {
      setCommandError(result.errorMessage ?? "An unexpected error occurred.")
    }
  }

  // After a failed replay, show new review button only if still eligible
  const showAfterFailed = replayState?.status === "failed" && isEligible && isPermitted

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Recovery action</h3>

            {/* Active replay */}
            {replayState?.status === "active" && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info" label="Replay in progress" />
                <Link
                  to={`/replays/${replayState.replayJobId}${explorerQs}`}
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                >
                  <LinkIcon className="size-3" />
                  <Mono className="bg-transparent px-0 text-[0.75em]">{replayState.replayJobId}</Mono>
                </Link>
              </div>
            )}

            {/* Successful replay */}
            {replayState?.status === "succeeded" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  <span className="text-sm font-medium text-foreground">Recovered by replay</span>
                  <Link
                    to={`/replays/${replayState.replayJobId}${explorerQs}`}
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  >
                    <LinkIcon className="size-3" />
                    <Mono className="bg-transparent px-0 text-[0.75em]">{replayState.replayJobId}</Mono>
                  </Link>
                </div>
                {replayState.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed {formatDateTime(replayState.completedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Failed replay */}
            {replayState?.status === "failed" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <XCircle className="size-4 text-danger" />
                  <span className="text-sm font-medium text-foreground">Latest replay failed</span>
                  <Link
                    to={`/replays/${replayState.replayJobId}${explorerQs}`}
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  >
                    <LinkIcon className="size-3" />
                    <Mono className="bg-transparent px-0 text-[0.75em]">{replayState.replayJobId}</Mono>
                  </Link>
                </div>
                {replayState.resultSummary && (
                  <p className="text-xs text-muted-foreground">{replayState.resultSummary}</p>
                )}
              </div>
            )}

            {/* Eligible and permitted — show review button */}
            {canShowButton && (
              <>
                <p className="text-xs text-muted-foreground">
                  Replay resends the stored event payload to the same endpoint. This is a simulated
                  execution for portfolio demonstration — no real webhook request is sent.
                </p>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                  >
                    <RotateCcw className="size-3.5" />
                    Review replay
                  </Button>
                </div>
              </>
            )}

            {/* After failed replay, still eligible */}
            {showAfterFailed && !canShowButton && (
              <>
                <p className="text-xs text-muted-foreground">
                  A new replay may be requested if all current safety gates still pass.
                </p>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                  >
                    <RotateCcw className="size-3.5" />
                    Review replay
                  </Button>
                </div>
              </>
            )}

            {/* Ineligible or unauthorized */}
            {!isEligible && !replayState && (
              <p className="text-xs text-muted-foreground">
                {assessment.replayEligibility.explanation}
              </p>
            )}
            {!isPermitted && !replayState && (
              <p className="text-xs text-muted-foreground">
                {assessment.operatorPermission.explanation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request replay</DialogTitle>
            <DialogDescription>
              Review the delivery details and acknowledge the risks before requesting a replay.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-col gap-3">
              {/* Canonical info */}
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Delivery ID</dt>
                  <dd className="text-sm"><MonoPlain className="text-xs">{delivery.id}</MonoPlain></dd>
                </div>
                {event && (
                  <div className="contents">
                    <dt className="text-xs text-muted-foreground">Event type</dt>
                    <dd className="text-sm"><MonoPlain className="text-xs">{event.eventType}</MonoPlain></dd>
                  </div>
                )}
                {event && (
                  <div className="contents">
                    <dt className="text-xs text-muted-foreground">Event ID</dt>
                    <dd className="text-sm"><MonoPlain className="text-xs">{event.eventId}</MonoPlain></dd>
                  </div>
                )}
                {endpoint && (
                  <div className="contents">
                    <dt className="text-xs text-muted-foreground">Endpoint</dt>
                    <dd className="text-sm">{endpoint.name}</dd>
                  </div>
                )}
                {endpoint && (
                  <div className="contents">
                    <dt className="text-xs text-muted-foreground">Destination</dt>
                    <dd className="text-sm"><MonoPlain className="text-xs">{endpoint.maskedUrl}</MonoPlain></dd>
                  </div>
                )}
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Environment</dt>
                  <dd className="text-sm capitalize">{environment}</dd>
                </div>
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Original state</dt>
                  <dd className="text-sm capitalize">{delivery.state}</dd>
                </div>
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Eligibility</dt>
                  <dd className="text-sm">{assessment.replayEligibility.decision === "eligible" ? "Eligible" : "Blocked"}</dd>
                </div>
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Operator</dt>
                  <dd className="text-sm">{operatorName} ({roleLabels[operatorRole]})</dd>
                </div>
                <div className="contents">
                  <dt className="text-xs text-muted-foreground">Recommendation</dt>
                  <dd className="text-sm">{assessment.recommendedAction.text}</dd>
                </div>
              </dl>

              {/* Warning */}
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="flex flex-col gap-1 text-xs text-foreground">
                    <p>The stored payload will be sent again to the destination endpoint.</p>
                    <p>Replay may create duplicate downstream side effects. RelayOps cannot verify receiver idempotency.</p>
                    <p>Eligibility does not guarantee success.</p>
                  </div>
                </div>
              </div>

              {/* Acknowledgement checkbox */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="replay-ack"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="replay-ack" className="text-xs text-foreground">
                  {assessment.acknowledgementText}
                </label>
              </div>

              {/* Optional note */}
              <div className="flex flex-col gap-1">
                <label htmlFor="replay-note" className="text-xs text-muted-foreground">
                  Operator note (optional, max 200 characters)
                </label>
                <Textarea
                  id="replay-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder="Add a note for the audit trail..."
                  className="text-xs"
                />
                <span className="text-right text-[0.6875rem] text-muted-foreground">
                  {note.length}/200
                </span>
              </div>


              {/* Command error */}
              {commandError && (
                <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
                  {commandError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!acknowledged || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request replay"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
