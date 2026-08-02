import type {
  Environment,
  ReplayHistoryEntry,
  ReplayJob,
  ReplayJobItem,
} from "@/types"
import {
  isCoherentActive,
  isCoherentFailed,
  isCoherentSimulatedFact,
  isCoherentSkipped,
  isCoherentSuccess,
  isSimulatedResultAvailable,
} from "@/domain/replay-coherence"

export interface CoherentReplayFact {
  job: ReplayJob
  item: ReplayJobItem
}

export interface ReplayFacts {
  activeReplayJobIds: string[]
  hasSuccessfulReplay: boolean
  successfulReplay: CoherentReplayFact | null
  failedReplays: CoherentReplayFact[]
  replayHistory: ReplayHistoryEntry[]
  allCoherentFacts: CoherentReplayFact[]
}

function toHistoryEntry(job: ReplayJob, item: ReplayJobItem): ReplayHistoryEntry {
  return {
    replayJobId: job.id,
    deliveryId: item.deliveryId,
    environment: job.environment,
    status: job.status,
    itemStatus: item.status,
    outcome: item.executionResult?.outcome ?? null,
    completedAt: item.executionResult?.completedAt ?? item.processedAt,
    resultSummary: item.executionResult?.sanitizedResponseSummary ?? item.resultSummary,
  }
}

/**
 * Pure resolver: takes arrays of jobs and items, returns coherent replay facts.
 * Uses the shared canonical replay-coherence implementation for all checks.
 */
export function resolveReplayFacts(
  environment: Environment,
  workspaceId: string,
  deliveryId: string,
  jobs: ReplayJob[],
  items: ReplayJobItem[],
  excludeJobId?: string
): ReplayFacts {
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  // Gather all candidate facts for this delivery
  const candidateFacts: CoherentReplayFact[] = []
  for (const item of items) {
    if (item.deliveryId !== deliveryId) continue
    const job = jobById.get(item.replayJobId)
    if (!job) continue
    if (job.workspaceId !== workspaceId) continue
    if (job.environment !== environment) continue
    if (excludeJobId && job.id === excludeJobId) continue
    candidateFacts.push({ job, item })
  }

  // Only genuinely coherent facts enter allCoherentFacts
  const coherentFacts = candidateFacts.filter((f) => {
    if (f.job.executionMode === "simulated" && f.job.scope === "single") {
      return isCoherentSimulatedFact(f.job, f.item)
    }
    // Recorded historical: use recorded evidence, active, or skipped coherence
    if (f.job.executionMode === "recorded") {
      const s = f.job.status
      if (s === "queued" || s === "running") {
        return isCoherentActive(f.job, f.item)
      }
      if (s === "completed" || s === "partially_completed" || s === "failed") {
        if (f.item.status === "succeeded") return isCoherentSuccess(f.job, f.item)
        if (f.item.status === "failed") return isCoherentFailed(f.job, f.item)
        if (f.item.status === "skipped") return isCoherentSkipped(f.job, f.item)
        return false
      }
      if (s === "cancelled") {
        return f.item.status === "skipped" && isCoherentSkipped(f.job, f.item)
      }
      return false
    }
    return false
  })

  const activeReplayJobIds = coherentFacts
    .filter((f) => isCoherentActive(f.job, f.item))
    .map((f) => f.job.id)

  const successfulReplay = coherentFacts.find((f) =>
    isCoherentSuccess(f.job, f.item)
  ) ?? null

  const failedReplays = coherentFacts.filter((f) =>
    isCoherentFailed(f.job, f.item)
  )

  // Only coherent facts enter replayHistory
  const coherentHistoryFacts = coherentFacts.filter((f) => {
    const s = f.job.status
    if (s === "queued" || s === "running") return isCoherentActive(f.job, f.item)
    if (s === "completed") return isCoherentSuccess(f.job, f.item)
    if (s === "failed") return isCoherentFailed(f.job, f.item)
    if (s === "skipped") return isCoherentSkipped(f.job, f.item)
    if (s === "partially_completed") {
      return isCoherentSuccess(f.job, f.item) || isCoherentFailed(f.job, f.item) || isCoherentSkipped(f.job, f.item)
    }
    if (s === "cancelled") return isCoherentSkipped(f.job, f.item)
    return false
  })

  const replayHistory = coherentHistoryFacts.map((f) => toHistoryEntry(f.job, f.item))

  return {
    activeReplayJobIds,
    hasSuccessfulReplay: successfulReplay !== null,
    successfulReplay,
    failedReplays,
    replayHistory,
    allCoherentFacts: coherentFacts,
  }
}

export { isSimulatedResultAvailable }
