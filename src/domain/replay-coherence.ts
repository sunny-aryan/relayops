import type {
  ReplayExecutionOutcome,
  ReplayExecutionResult,
  ReplayItemStatus,
  ReplayJob,
  ReplayJobItem,
} from "@/types"

const VALID_OUTCOMES: readonly ReplayExecutionOutcome[] = [
  "accepted",
  "confirmed_rejection",
  "ambiguous",
  "skipped",
  "unavailable",
 ]

/**
 * Single canonical replay-coherence implementation.
 * Used by overlay restoration, replay-fact resolution, active/success/failed
 * detection, replay history, and replay-detail resultAvailable.
 */

function isFiniteNonNegativeNumber(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v >= 0
}

function isValidHttpStatus(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 100 && v < 600
}

function isValidIsoTimestamp(v: unknown): boolean {
  return typeof v === "string" && !isNaN(new Date(v).getTime())
}

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0
}

/**
 * Validate execution result coherence for a simulated single replay item.
 * Returns true only when the result is fully coherent with the item status
 * and parent job lifecycle.
 */
export function isCoherentExecutionResult(
  raw: unknown,
  itemStatus: ReplayItemStatus,
  jobStartedMs: number | null,
  jobCompletedMs: number | null
): raw is ReplayExecutionResult {
  if (typeof raw !== "object" || raw === null) return false
  const r = raw as Record<string, unknown>
  if (typeof r.outcome !== "string" || !VALID_OUTCOMES.includes(r.outcome as ReplayExecutionOutcome)) return false
  if (r.httpStatus !== null && !isValidHttpStatus(r.httpStatus)) return false
  if (r.sanitizedResponseSummary !== null && typeof r.sanitizedResponseSummary !== "string") return false
  if (r.latencyMs !== null && !isFiniteNonNegativeNumber(r.latencyMs)) return false
  if (r.startedAt !== null && !isValidIsoTimestamp(r.startedAt)) return false
  if (r.completedAt !== null && !isValidIsoTimestamp(r.completedAt)) return false
  if (typeof r.responseAbsent !== "boolean") return false

  const outcome = r.outcome as ReplayExecutionResult["outcome"]
  const httpStatus = r.httpStatus as number | null
  const responseAbsent = r.responseAbsent as boolean

  if (outcome === "accepted") {
    if (responseAbsent) return false
    if (httpStatus === null || httpStatus < 200 || httpStatus >= 300) return false
  } else if (outcome === "confirmed_rejection") {
    if (responseAbsent) return false
    if (httpStatus === null || httpStatus < 400 || httpStatus >= 600) return false
  } else if (outcome === "ambiguous" || outcome === "unavailable" || outcome === "skipped") {
    if (!responseAbsent) return false
    if (httpStatus !== null) return false
  }

  if (itemStatus === "failed" && outcome === "accepted") return false

  // For succeeded and failed items, execution timestamps are required
  if (itemStatus === "succeeded" || itemStatus === "failed") {
    if (r.startedAt === null || !isValidIsoTimestamp(r.startedAt)) return false
    if (r.completedAt === null || !isValidIsoTimestamp(r.completedAt)) return false
    const erStart = new Date(r.startedAt as string).getTime()
    const erEnd = new Date(r.completedAt as string).getTime()
    if (erEnd < erStart) return false
    if (jobStartedMs !== null && erStart < jobStartedMs - 1000) return false
    if (jobCompletedMs !== null && erEnd > jobCompletedMs + 1000) return false
  }

  return true
}

/**
 * Validate that a simulated single replay job has coherent state, counts,
 * and timestamps for its status.
 */
export function isCoherentSimulatedJob(job: ReplayJob): boolean {
  if (job.scope !== "single" || job.executionMode !== "simulated") return false
  if (!isNonNegativeInt(job.totalItems) || !isNonNegativeInt(job.succeededCount) ||
      !isNonNegativeInt(job.failedCount) || !isNonNegativeInt(job.skippedCount)) return false
  if (job.totalItems !== 1) return false
  if (!isValidIsoTimestamp(job.createdAt)) return false

  const status = job.status
  const { succeededCount, failedCount, skippedCount } = job

  if (status === "queued") {
    if (succeededCount !== 0 || failedCount !== 0 || skippedCount !== 0) return false
    if (job.startedAt !== null || job.completedAt !== null) return false
  } else if (status === "running") {
    if (succeededCount !== 0 || failedCount !== 0 || skippedCount !== 0) return false
    if (job.startedAt === null || job.completedAt !== null) return false
  } else if (status === "completed") {
    if (succeededCount !== 1 || failedCount !== 0 || skippedCount !== 0) return false
    if (job.startedAt === null || job.completedAt === null) return false
  } else if (status === "failed") {
    if (succeededCount !== 0 || failedCount !== 1 || skippedCount !== 0) return false
    if (job.startedAt === null || job.completedAt === null) return false
  } else if (status === "skipped") {
    if (succeededCount !== 0 || failedCount !== 0 || skippedCount !== 1) return false
    if (job.startedAt === null || job.completedAt === null) return false
  } else {
    // partially_completed, cancelled — not valid for simulated single
    return false
  }

  // Timestamp chronology
  const createdAt = new Date(job.createdAt).getTime()
  if (job.startedAt !== null) {
    const startedAt = new Date(job.startedAt).getTime()
    if (startedAt < createdAt - 1000) return false
  }
  if (job.completedAt !== null) {
    if (job.startedAt === null) return false
    const completedAt = new Date(job.completedAt).getTime()
    const startedAt = new Date(job.startedAt).getTime()
    if (completedAt < startedAt) return false
  }

  return true
}

/**
 * Validate that a simulated single replay item is coherent with its parent job
 * and has the required execution evidence for its status.
 */
export function isCoherentSimulatedItem(job: ReplayJob, item: ReplayJobItem): boolean {
  if (item.replayJobId !== job.id) return false
  if (job.sourceDeliveryId !== null && item.deliveryId !== job.sourceDeliveryId) return false

  const itemStatus = item.status
  const jobStatus = job.status

  // Coherent job/item status combinations
  if (jobStatus === "queued" && itemStatus !== "pending") return false
  if (jobStatus === "running" && itemStatus !== "running") return false
  if (jobStatus === "completed" && itemStatus !== "succeeded") return false
  if (jobStatus === "failed" && itemStatus !== "failed") return false
  if (jobStatus === "skipped" && itemStatus !== "skipped") return false

  const isTerminal = itemStatus === "succeeded" || itemStatus === "failed" || itemStatus === "skipped"
  if (isTerminal && item.processedAt === null) return false
  if (!isTerminal && item.processedAt !== null) return false

  // Queued and running items have no result summary or execution result
  if (itemStatus === "pending" || itemStatus === "running") {
    if (item.executionResult !== null) return false
    if (item.resultSummary !== null) return false
  }

  const jobStartedMs = job.startedAt ? new Date(job.startedAt).getTime() : null
  const jobCompletedMs = job.completedAt ? new Date(job.completedAt).getTime() : null

  if (itemStatus === "succeeded") {
    if (item.executionResult === null) return false
    if (!isCoherentExecutionResult(item.executionResult, itemStatus, jobStartedMs, jobCompletedMs)) return false
    if (item.executionResult.outcome !== "accepted") return false
    if (item.processedAt !== null && item.executionResult.completedAt !== null) {
      if (new Date(item.processedAt).getTime() !== new Date(item.executionResult.completedAt).getTime()) return false
    }
  }
  if (itemStatus === "failed") {
    if (item.executionResult === null) return false
    if (!isCoherentExecutionResult(item.executionResult, itemStatus, jobStartedMs, jobCompletedMs)) return false
    if (item.executionResult.outcome === "accepted") return false
    if (item.processedAt !== null && item.executionResult.completedAt !== null) {
      if (new Date(item.processedAt).getTime() !== new Date(item.executionResult.completedAt).getTime()) return false
    }
  }
  if (itemStatus === "skipped") {
    if (item.executionResult !== null) return false
    if (item.resultSummary === null || item.resultSummary.trim().length === 0) return false
    if (item.processedAt !== null && jobCompletedMs !== null) {
      if (Math.abs(new Date(item.processedAt).getTime() - jobCompletedMs) > 1000) return false
    }
  }

  return true
}

/**
 * A simulated single replay fact is coherent when both the job and item
 * pass strict coherence checks.
 */
export function isCoherentSimulatedFact(job: ReplayJob, item: ReplayJobItem): boolean {
  return isCoherentSimulatedJob(job) && isCoherentSimulatedItem(job, item)
}

/**
 * Validate that a recorded job has coherent terminal state: valid
 * chronological timestamps, positive integer totalItems, non-negative
 * integer counts that sum to totalItems, and a status consistent with those
 * counts. Does not require all bulk items to be present.
 */
export function isCoherentRecordedTerminalJob(job: ReplayJob): boolean {
  const s = job.status
  if (s !== "completed" && s !== "partially_completed" && s !== "failed" && s !== "cancelled") return false

  if (!isValidIsoTimestamp(job.createdAt)) return false
  if (job.startedAt === null || !isValidIsoTimestamp(job.startedAt)) return false
  if (job.completedAt === null || !isValidIsoTimestamp(job.completedAt)) return false

  const createdAt = new Date(job.createdAt).getTime()
  const startedAt = new Date(job.startedAt).getTime()
  const completedAt = new Date(job.completedAt).getTime()
  if (startedAt < createdAt - 1000) return false
  if (completedAt < startedAt) return false

  if (!isNonNegativeInt(job.totalItems) || job.totalItems <= 0) return false
  if (!isNonNegativeInt(job.succeededCount)) return false
  if (!isNonNegativeInt(job.failedCount)) return false
  if (!isNonNegativeInt(job.skippedCount)) return false

  const sum = job.succeededCount + job.failedCount + job.skippedCount
  if (sum !== job.totalItems) return false

  // Status/count consistency
  if (s === "completed") {
    if (job.succeededCount !== job.totalItems || job.failedCount !== 0 || job.skippedCount !== 0) return false
  }
  if (s === "failed") {
    if (job.succeededCount !== 0 || job.skippedCount !== 0) return false
  }
  // partially_completed and cancelled allow any mix that sums to totalItems

  return true
}

/**
 * Check if a recorded historical job/item pair can serve as delivery-specific
 * success or failed evidence. Requires a coherently terminal parent with
 * strict counts and timestamps, a supported item status, and a valid
 * processedAt within the parent lifecycle.
 */
export function isCoherentRecordedEvidence(job: ReplayJob, item: ReplayJobItem): boolean {
  if (job.executionMode !== "recorded") return false
  if (item.replayJobId !== job.id) return false
  if (!isCoherentRecordedTerminalJob(job)) return false

  const itemStatus = item.status

  // Skipped items never become success or failed evidence
  if (itemStatus === "skipped") return false
  // Pending/running items are not terminal evidence
  if (itemStatus === "pending" || itemStatus === "running") return false

  // Cancelled jobs cannot produce success or failed evidence
  if (job.status === "cancelled") return false

  // Item must have a valid processedAt within parent lifecycle
  if (item.processedAt === null || !isValidIsoTimestamp(item.processedAt)) return false
  const processedMs = new Date(item.processedAt).getTime()
  const startedMs = new Date(job.startedAt!).getTime()
  const completedMs = new Date(job.completedAt!).getTime()
  if (processedMs < startedMs - 1000 || processedMs > completedMs + 1000) return false

  if (itemStatus === "succeeded") {
    return job.succeededCount > 0
  }
  if (itemStatus === "failed") {
    return job.failedCount > 0
  }

  return false
}

/**
 * Validate a recorded active (queued or running) job/item pair.
 * Queued: pending item, no startedAt/completedAt, zero processed counts.
 * Running: running item, valid chronological createdAt/startedAt, null completedAt,
 * processed counts not exceeding totalItems.
 * Both require positive totalItems and no item processedAt/result/executionResult.
 */
function isCoherentRecordedActive(job: ReplayJob, item: ReplayJobItem): boolean {
  if (job.executionMode !== "recorded") return false
  if (item.replayJobId !== job.id) return false
  if (!isValidIsoTimestamp(job.createdAt)) return false
  if (!isNonNegativeInt(job.totalItems) || job.totalItems <= 0) return false
  if (!isNonNegativeInt(job.succeededCount)) return false
  if (!isNonNegativeInt(job.failedCount)) return false
  if (!isNonNegativeInt(job.skippedCount)) return false
  if (job.succeededCount + job.failedCount + job.skippedCount > job.totalItems) return false

  if (job.status === "queued") {
    if (job.startedAt !== null || job.completedAt !== null) return false
    if (job.succeededCount !== 0 || job.failedCount !== 0 || job.skippedCount !== 0) return false
    if (item.status !== "pending") return false
  } else if (job.status === "running") {
    if (job.startedAt === null || !isValidIsoTimestamp(job.startedAt)) return false
    if (job.completedAt !== null) return false
    const createdAt = new Date(job.createdAt).getTime()
    const startedAt = new Date(job.startedAt).getTime()
    if (startedAt < createdAt - 1000) return false
    if (item.status !== "running") return false
  } else {
    return false
  }

  // Active items have no processedAt, result summary, or execution result
  if (item.processedAt !== null) return false
  if (item.resultSummary !== null) return false
  if (item.executionResult !== null) return false

  return true
}

/**
 * Active replay: job is queued or running with a coherent active item.
 * Simulated single replays use simulated job coherence; recorded replays
 * use strict recorded active coherence.
 */
export function isCoherentActive(job: ReplayJob, item: ReplayJobItem): boolean {
  if (job.executionMode === "simulated" && job.scope === "single") {
    if (!isCoherentSimulatedJob(job)) return false
    if (job.status !== "queued" && job.status !== "running") return false
    if (job.status === "queued" && item.status !== "pending") return false
    if (job.status === "running" && item.status !== "running") return false
    return true
  }
  if (job.executionMode === "recorded") {
    return isCoherentRecordedActive(job, item)
  }
  return false
}

/**
 * Successful replay: item succeeded with coherent parent and accepted evidence.
 */
export function isCoherentSuccess(job: ReplayJob, item: ReplayJobItem): boolean {
  if (item.status !== "succeeded") return false

  if (job.executionMode === "simulated" && job.scope === "single") {
    return isCoherentSimulatedFact(job, item)
  }

  // Recorded historical: use recorded evidence rules
  if (job.executionMode === "recorded") {
    return isCoherentRecordedEvidence(job, item)
  }

  return false
}

/**
 * Failed replay: item failed with coherent parent and compatible non-success result.
 */
export function isCoherentFailed(job: ReplayJob, item: ReplayJobItem): boolean {
  if (item.status !== "failed") return false

  if (job.executionMode === "simulated" && job.scope === "single") {
    return isCoherentSimulatedFact(job, item)
  }

  // Recorded historical: use recorded evidence rules
  if (job.executionMode === "recorded") {
    return isCoherentRecordedEvidence(job, item)
  }

  return false
}

/**
 * Skipped replay: both job and item are skipped, no fabricated receiver acceptance.
 * For recorded historical jobs with a terminal parent, a skipped item is
 * coherent history when the parent is coherently terminal and skippedCount > 0.
 */
export function isCoherentSkipped(job: ReplayJob, item: ReplayJobItem): boolean {
  if (item.status !== "skipped") return false

  if (job.executionMode === "simulated" && job.scope === "single") {
    if (job.status !== "skipped") return false
    return isCoherentSimulatedFact(job, item)
  }

  if (job.executionMode === "recorded") {
    if (!isCoherentRecordedTerminalJob(job)) return false
    if (job.skippedCount <= 0) return false
    if (item.executionResult !== null) return false
    if (item.processedAt !== null) {
      if (!isValidIsoTimestamp(item.processedAt)) return false
      const processedMs = new Date(item.processedAt).getTime()
      const startedMs = new Date(job.startedAt!).getTime()
      const completedMs = new Date(job.completedAt!).getTime()
      if (processedMs < startedMs - 1000 || processedMs > completedMs + 1000) return false
    }
    return true
  }

  return false
}

/**
 * Strict result availability for a simulated terminal single replay.
 */
export function isSimulatedResultAvailable(
  job: ReplayJob,
  item: ReplayJobItem | undefined
): boolean {
  if (!item) return false
  return isCoherentSimulatedFact(job, item) &&
    (job.status === "completed" || job.status === "failed" || job.status === "skipped")
}
