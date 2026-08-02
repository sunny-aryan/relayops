import {
  canonicalAcknowledgementText,
  canonicalAcknowledgementRuleId,
  canonicalAcknowledgementTypes,
} from "@/domain/replay-acknowledgement"
import { isCoherentSimulatedFact } from "@/domain/replay-coherence"
import type {
  Environment,
  ReplayAcknowledgement,
  ReplayAcknowledgementType,
  ReplayJob,
  ReplayJobItem,
  ReplayJobStatus,
} from "@/types"

const SCHEMA_VERSION = 1
const MAX_NOTE_LENGTH = 200
const MAX_IDEMPOTENCY_KEY_LENGTH = 200
const ACK_TOLERANCE_MS = 5000

interface OverlayData {
  schemaVersion: number
  workspaceId: string
  environment: Environment
  jobs: ReplayJob[]
  items: ReplayJobItem[]
}

const VALID_OVERLAY_JOB_STATUSES: readonly ReplayJobStatus[] = [
  "queued", "running", "completed", "failed", "skipped",
]

function storageKey(workspaceId: string, environment: Environment): string {
  return `relayops:replay-overlay:v${SCHEMA_VERSION}:${workspaceId}:${environment}`
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function isValidEnvironment(v: unknown): v is Environment {
  return v === "production" || v === "sandbox"
}

function isValidIsoTimestamp(v: unknown): boolean {
  if (!isString(v)) return false
  return !isNaN(new Date(v).getTime())
}

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0
}

function isValidIdempotencyKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) return false
  return /^[a-zA-Z0-9._-]+$/.test(key)
}

function validateAcknowledgement(
  raw: unknown,
  createdAtMs: number
): raw is ReplayAcknowledgement {
  if (!isObject(raw)) return false
  if (!isString(raw.type) || !canonicalAcknowledgementTypes.includes(raw.type as ReplayAcknowledgementType)) return false
  const type = raw.type as ReplayAcknowledgementType
  if (!isString(raw.ruleId) || raw.ruleId !== canonicalAcknowledgementRuleId(type)) return false
  if (!isString(raw.text) || raw.text !== canonicalAcknowledgementText(type)) return false
  if (!isValidIsoTimestamp(raw.acknowledgedAt)) return false
  const ackMs = new Date(raw.acknowledgedAt as string).getTime()
  if (ackMs < createdAtMs - ACK_TOLERANCE_MS) return false
  if (ackMs > createdAtMs + ACK_TOLERANCE_MS) return false
  return true
}

/**
 * Structural validation of a raw job object — checks types, field presence,
 * and format. Does NOT duplicate coherence checks (state/count invariants,
 * timestamp chronology) — those are delegated to the shared coherence helper.
 */
function validateJobStructure(
  raw: unknown,
  workspaceId: string,
  environment: Environment
): raw is ReplayJob {
  if (!isObject(raw)) return false
  const j = raw as Record<string, unknown>

  if (!isString(j.id) || j.id.length === 0) return false
  if (!isString(j.workspaceId) || j.workspaceId !== workspaceId) return false
  if (!isValidEnvironment(j.environment) || j.environment !== environment) return false
  if (!isString(j.endpointId) || j.endpointId.length === 0) return false
  if (!isString(j.status) || !VALID_OVERLAY_JOB_STATUSES.includes(j.status as ReplayJobStatus)) return false
  if (!isString(j.requestedByUserId) || j.requestedByUserId.length === 0) return false

  if (!isNonNegativeInt(j.totalItems)) return false
  if (!isNonNegativeInt(j.succeededCount)) return false
  if (!isNonNegativeInt(j.failedCount)) return false
  if (!isNonNegativeInt(j.skippedCount)) return false

  if (!isValidIsoTimestamp(j.createdAt)) return false
  if (j.startedAt !== null && !isValidIsoTimestamp(j.startedAt)) return false
  if (j.completedAt !== null && !isValidIsoTimestamp(j.completedAt)) return false

  if (j.note === null) {
    // valid
  } else if (!isString(j.note) || j.note.length > MAX_NOTE_LENGTH) {
    return false
  } else if (j.note !== j.note.trim() || j.note.trim().length === 0) {
    return false
  }

  if (j.scope !== "single") return false
  if (j.executionMode !== "simulated") return false
  if (!isString(j.idempotencyKey) || !isValidIdempotencyKey(j.idempotencyKey)) return false
  if (!isString(j.sourceDeliveryId) || j.sourceDeliveryId.length === 0) return false

  const createdAtMs = new Date(j.createdAt as string).getTime()
  if (j.acknowledgement === null || !validateAcknowledgement(j.acknowledgement, createdAtMs)) return false

  return true
}

/**
 * Structural validation of a raw item object — checks types and field presence.
 * Coherence with the parent job is delegated to the shared coherence helper.
 */
function validateItemStructure(raw: unknown): raw is ReplayJobItem {
  if (!isObject(raw)) return false
  const i = raw as Record<string, unknown>

  if (!isString(i.id) || i.id.length === 0) return false
  if (!isString(i.replayJobId) || i.replayJobId.length === 0) return false
  if (!isString(i.deliveryId) || i.deliveryId.length === 0) return false
  if (!isString(i.status)) return false
  if (i.resultSummary !== null && !isString(i.resultSummary)) return false
  if (i.processedAt !== null && !isValidIsoTimestamp(i.processedAt)) return false
  if (i.executionResult !== null && !isObject(i.executionResult)) return false

  return true
}

function validateOverlayData(raw: unknown, workspaceId: string, environment: Environment): OverlayData | null {
  if (!isObject(raw)) return null
  if (raw.schemaVersion !== SCHEMA_VERSION) return null
  if (!isString(raw.workspaceId) || raw.workspaceId !== workspaceId) return null
  if (!isValidEnvironment(raw.environment) || raw.environment !== environment) return null
  if (!Array.isArray(raw.jobs) || !Array.isArray(raw.items)) return null

  const jobs: ReplayJob[] = []
  const jobIds = new Set<string>()
  const idempotencyKeys = new Set<string>()

  for (const j of raw.jobs) {
    if (!validateJobStructure(j, workspaceId, environment)) return null
    const job = j as unknown as ReplayJob
    if (jobIds.has(job.id)) return null
    jobIds.add(job.id)
    if (idempotencyKeys.has(job.idempotencyKey!)) return null
    idempotencyKeys.add(job.idempotencyKey!)
    jobs.push(job)
  }

  const items: ReplayJobItem[] = []
  const itemIds = new Set<string>()
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  for (const i of raw.items) {
    if (!validateItemStructure(i)) return null
    const item = i as unknown as ReplayJobItem
    const parentJob = jobById.get(item.replayJobId)
    if (!parentJob) return null
    if (itemIds.has(item.id)) return null
    itemIds.add(item.id)
    items.push(item)
  }

  // Exactly one item per job, and coherence check via shared helper
  for (const job of jobs) {
    const jobItems = items.filter((i) => i.replayJobId === job.id)
    if (jobItems.length !== 1) return null
    // Delegate coherence validation to the canonical shared implementation
    if (!isCoherentSimulatedFact(job, jobItems[0])) return null
  }

  return { schemaVersion: SCHEMA_VERSION, workspaceId, environment, jobs, items }
}

export class ReplayOverlayStore {
  private workspaceId: string
  private environment: Environment
  private jobs: Map<string, ReplayJob> = new Map()
  private items: Map<string, ReplayJobItem[]> = new Map()

  constructor(workspaceId: string, environment: Environment) {
    this.workspaceId = workspaceId
    this.environment = environment
    this.restore()
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(storageKey(this.workspaceId, this.environment))
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      const validated = validateOverlayData(parsed, this.workspaceId, this.environment)
      if (!validated) {
        sessionStorage.removeItem(storageKey(this.workspaceId, this.environment))
        return
      }
      for (const job of validated.jobs) {
        this.jobs.set(job.id, job)
        this.items.set(job.id, [])
      }
      for (const item of validated.items) {
        const existing = this.items.get(item.replayJobId) ?? []
        existing.push(item)
        this.items.set(item.replayJobId, existing)
      }
    } catch {
      try {
        sessionStorage.removeItem(storageKey(this.workspaceId, this.environment))
      } catch { /* ignore */ }
    }
  }

  private persistCandidate(
    candidateJobs: Map<string, ReplayJob>,
    candidateItems: Map<string, ReplayJobItem[]>
  ): boolean {
    try {
      const data: OverlayData = {
        schemaVersion: SCHEMA_VERSION,
        workspaceId: this.workspaceId,
        environment: this.environment,
        jobs: Array.from(candidateJobs.values()),
        items: Array.from(candidateItems.values()).flat(),
      }
      sessionStorage.setItem(
        storageKey(this.workspaceId, this.environment),
        JSON.stringify(data)
      )
      return true
    } catch {
      return false
    }
  }

  getJob(jobId: string): ReplayJob | null {
    return this.jobs.get(jobId) ?? null
  }

  getItems(jobId: string): ReplayJobItem[] {
    return this.items.get(jobId) ?? []
  }

  getJobsForDelivery(deliveryId: string): { job: ReplayJob; items: ReplayJobItem[] }[] {
    const results: { job: ReplayJob; items: ReplayJobItem[] }[] = []
    for (const job of this.jobs.values()) {
      const jobItems = this.items.get(job.id) ?? []
      const hasDelivery = jobItems.some((i) => i.deliveryId === deliveryId)
      if (hasDelivery) {
        results.push({ job, items: jobItems })
      }
    }
    return results
  }

  getActiveReplayJobIdsForDelivery(deliveryId: string): string[] {
    return this.getJobsForDelivery(deliveryId)
      .filter(({ job }) => job.status === "queued" || job.status === "running")
      .map(({ job }) => job.id)
  }

  hasActiveReplayForDelivery(deliveryId: string, excludeJobId?: string): boolean {
    return this.getActiveReplayJobIdsForDelivery(deliveryId).some(
      (id) => id !== excludeJobId
    )
  }

  /**
   * Atomically create a job and its item through a single sessionStorage write.
   * Builds candidate maps without mutating live maps, persists the complete
   * candidate overlay, and commits live state only after persistence succeeds.
   * If persistence fails, returns false with no job, item, or idempotency identity retained.
   */
  addJob(job: ReplayJob, item: ReplayJobItem): boolean {
    const candidateJobs = new Map(this.jobs)
    candidateJobs.set(job.id, job)
    const candidateItems = new Map(this.items)
    candidateItems.set(job.id, [item])

    if (!this.persistCandidate(candidateJobs, candidateItems)) {
      return false
    }

    this.jobs = candidateJobs
    this.items = candidateItems
    return true
  }

  /**
   * Atomically update a job and its item together through a single sessionStorage write.
   * Persists candidate maps directly without swapping live maps.
   * Commits live state only after persistence succeeds.
   * On failure, retains the previous coherent state.
   */
  updateJobAndItem(job: ReplayJob, item: ReplayJobItem | undefined): boolean {
    if (!this.jobs.has(job.id)) return false
    if (!item) return false

    const candidateJobs = new Map(this.jobs)
    candidateJobs.set(job.id, job)
    const oldItems = this.items.get(job.id) ?? []
    const candidateJobItems = [...oldItems]
    const idx = candidateJobItems.findIndex((i) => i.id === item.id)
    if (idx >= 0) {
      candidateJobItems[idx] = item
    } else {
      candidateJobItems.push(item)
    }
    const candidateItems = new Map(this.items)
    candidateItems.set(job.id, candidateJobItems)

    if (!this.persistCandidate(candidateJobs, candidateItems)) {
      return false
    }

    this.jobs = candidateJobs
    this.items = candidateItems
    return true
  }

  getItem(jobId: string, itemId: string): ReplayJobItem | null {
    return (this.items.get(jobId) ?? []).find((i) => i.id === itemId) ?? null
  }

  getAllJobs(): ReplayJob[] {
    return Array.from(this.jobs.values())
  }

  getAllItems(): ReplayJobItem[] {
    return Array.from(this.items.values()).flat()
  }
}

export { isValidIdempotencyKey }

export function normalizeNote(note: string | null): string | null {
  if (!note) return null
  const trimmed = note.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function isNoteTooLong(note: string | null): boolean {
  const normalized = normalizeNote(note)
  return normalized !== null && normalized.length > MAX_NOTE_LENGTH
}
