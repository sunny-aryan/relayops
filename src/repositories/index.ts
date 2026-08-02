import {
  activeUserId,
  apiKeys,
  auditEvents,
  endpoints,
  events,
  failureClusters,
  memberships,
  platformIncidents,
  replayJobItems,
  replayJobs,
  usageBuckets,
  users,
  workspace,
} from "@/data/fixtures"
import { getEndpointTelemetry } from "@/data/endpoints"
import {
  getDeliveryDetail as getDeliveryDetailFromFixtures,
  getDeliveryAssessmentFacts,
  getDeliveryEndpointOptions,
  listDeliveries as listDeliveriesFromFixtures,
} from "@/data/deliveries"
import { getEndpointMetricSnapshot, overviewTelemetry } from "@/data/overview"
import { findExecutionScenario } from "@/data/execution-adapter"
import {
  isNoteTooLong,
  isValidIdempotencyKey,
  normalizeNote,
  ReplayOverlayStore,
} from "@/data/replay-overlay"
import { assessDelivery } from "@/domain/delivery-assessment"
import { deriveAcknowledgement } from "@/domain/replay-acknowledgement"
import { isSimulatedResultAvailable, resolveReplayFacts } from "@/domain/replay-facts"
import {
  commandErrorToMessage,
  validateReplayCommand,
} from "@/domain/replay-command"
import { roleLabels } from "@/lib/labels"
import type {
  ApiKeyMetadata,
  AuditEvent,
  DeliveryDetailAssessmentAggregate,
  DeliveryEndpointContext,
  DeliveryEventContext,
  DeliveryFilters,
  DeliveryListResult,
  DeliveryMetricSummary,
  DeliveryRecord,
  DeliveryTrendBucket,
  Endpoint,
  EndpointDetailData,
  EndpointInventoryRow,
  EndpointMetricSnapshot,
  Environment,
  Event,
  FailureCluster,
  Membership,
  PlatformIncident,
  OverviewClusterRow,
  OverviewData,
  OverviewEndpointRow,
  OverviewTimeRange,
  ReplayJob,
  ReplayJobDetailAggregate,
  ReplayJobItem,
  ReplayCommandResult,
  SingleReplayCommand,
  Role,
  TelemetrySnapshot,
  UsageBucket,
  User,
  Workspace,
} from "@/types"

// Synchronous fixture-backed resolution today; the async signatures exist so a
// Supabase-backed implementation (with loading/error states) can drop in later.
function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value)
}

export function getCurrentWorkspace(): Promise<Workspace> {
  return resolve(workspace)
}

export function getCurrentUser(): Promise<User> {
  return resolve(users.find((u) => u.id === activeUserId)!)
}

export function getCurrentMembership(): Promise<Membership> {
  return resolve(memberships.find((m) => m.userId === activeUserId)!)
}

export function listMemberships(): Promise<Membership[]> {
  return resolve(memberships)
}

export function getUserById(userId: string): Promise<User | null> {
  return resolve(users.find((u) => u.id === userId) ?? null)
}

export function listApiKeys(environment: Environment): Promise<ApiKeyMetadata[]> {
  return resolve(apiKeys.filter((k) => k.environment === environment))
}

export function listEndpoints(environment: Environment): Promise<Endpoint[]> {
  return resolve(endpoints.filter((e) => e.environment === environment))
}

export function getEndpointById(
  endpointId: string,
  environment: Environment
): Promise<Endpoint | null> {
  return resolve(
    endpoints.find((e) => e.id === endpointId && e.environment === environment) ?? null
  )
}

export function getEventById(
  eventId: string,
  environment: Environment
): Promise<Event | null> {
  return resolve(
    events.find((e) => e.id === eventId && e.environment === environment) ?? null
  )
}

export function listFailureClusters(environment: Environment): Promise<FailureCluster[]> {
  return resolve(failureClusters.filter((c) => c.environment === environment))
}

export function getReplayJobById(
  replayJobId: string,
  environment: Environment
): Promise<ReplayJob | null> {
  return resolve(
    replayJobs.find((j) => j.id === replayJobId && j.environment === environment) ?? null
  )
}

export function listReplayJobItems(replayJobId: string): Promise<ReplayJobItem[]> {
  return resolve(replayJobItems.filter((i) => i.replayJobId === replayJobId))
}

export function listUsageBuckets(environment: Environment): Promise<UsageBucket[]> {
  return resolve(usageBuckets.filter((u) => u.environment === environment))
}

export function listActiveIncidents(): Promise<PlatformIncident[]> {
  return resolve(platformIncidents.filter((i) => i.status !== "resolved"))
}

export function listAllIncidents(): Promise<PlatformIncident[]> {
  return resolve(platformIncidents)
}

export function listRecentAuditEvents(limit = 10): Promise<AuditEvent[]> {
  const sorted = [...auditEvents].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt)
  )
  return resolve(sorted.slice(0, limit))
}

const attentionHealthOrder = { failing: 0, degraded: 1, stale: 2, healthy: 3, disabled: 4 } as const

function successRate(succeeded: number, attempts: number): number | null {
  if (attempts === 0) return null
  return (succeeded / attempts) * 100
}

function buildEndpointSnapshot(
  endpoint: Endpoint,
  environment: Environment,
  timeRange: OverviewTimeRange
): EndpointMetricSnapshot | null {
  if (endpoint.status === "disabled") return null
  return getEndpointMetricSnapshot(endpoint.id, environment, timeRange)
}

export function getOverview(
  environment: Environment,
  timeRange: OverviewTimeRange
): Promise<OverviewData> {
  const fixture = overviewTelemetry[environment][timeRange]

  const endpointRows: OverviewEndpointRow[] = endpoints
    .filter((e) => e.environment === environment)
    .map((endpoint) => {
      const metrics = buildEndpointSnapshot(endpoint, environment, timeRange)
      const disabled = endpoint.status === "disabled"
      const noMetrics = disabled || !metrics
      return {
        endpoint,
        metrics,
        successRatePct: noMetrics
          ? null
          : successRate(metrics!.deliveriesSucceeded, metrics!.deliveryAttempts),
      }
    })
    .sort(
      (a, b) =>
        attentionHealthOrder[a.endpoint.health] - attentionHealthOrder[b.endpoint.health]
    )

  const clusterRows: OverviewClusterRow[] = fixture.clusterSnapshots
    .map((snapshot) => {
      const cluster = failureClusters.find((c) => c.id === snapshot.clusterId)
      return cluster && cluster.environment === environment ? { cluster, snapshot } : null
    })
    .filter((row): row is OverviewClusterRow => row !== null)
    .sort((a, b) => b.snapshot.deliveryCount - a.snapshot.deliveryCount)

  const { counts } = fixture
  const data: OverviewData = {
    environment,
    timeRange,
    telemetry: fixture.telemetry,
    metrics: {
      ...counts,
      unsuccessfulAttempts: counts.deliveryAttempts - counts.deliveriesSucceeded,
      successRatePct: successRate(counts.deliveriesSucceeded, counts.deliveryAttempts),
    },
    trend: fixture.trend,
    endpoints: endpointRows,
    clusters: clusterRows,
    deliveryIncidents: platformIncidents.filter(
      (i) =>
        i.status !== "resolved" &&
        i.affectsDelivery &&
        i.affectedEnvironments.includes(environment)
    ),
  }

  return new Promise((res) => setTimeout(() => res(data), 150))
}

export function listEndpointInventory(
  environment: Environment
): Promise<EndpointInventoryRow[]> {
  const rows: EndpointInventoryRow[] = endpoints
    .filter((e) => e.environment === environment)
    .map((endpoint) => {
      const metrics = buildEndpointSnapshot(endpoint, environment, "24h")
      return {
        endpoint,
        metrics,
        successRatePct:
          endpoint.status === "disabled" || !metrics
            ? null
            : successRate(metrics.deliveriesSucceeded, metrics.deliveryAttempts),
      }
    })
    .sort(
      (a, b) =>
        attentionHealthOrder[a.endpoint.health] - attentionHealthOrder[b.endpoint.health]
    )

  return new Promise((res) => setTimeout(() => res(rows), 120))
}

export function getEndpointDetail(
  environment: Environment,
  endpointId: string,
  timeRange: OverviewTimeRange
): Promise<EndpointDetailData | null> {
  const endpoint = endpoints.find((e) => e.id === endpointId && e.environment === environment)
  if (!endpoint) return resolve(null)

  const disabled = endpoint.status === "disabled"
  const fixture = disabled ? null : getEndpointTelemetry(endpoint.id, environment, timeRange)

  let telemetry: TelemetrySnapshot
  let metrics: DeliveryMetricSummary | null = null
  let trend: DeliveryTrendBucket[] = []

  if (disabled) {
    telemetry = { state: "insufficient", latestAt: null }
  } else if (!fixture) {
    telemetry = { state: "insufficient", latestAt: null }
  } else {
    telemetry = {
      state: fixture.lastActivityAt ? "current" : "insufficient",
      latestAt: fixture.lastActivityAt,
    }
    const { counts } = fixture
    metrics = {
      ...counts,
      unsuccessfulAttempts: counts.deliveryAttempts - counts.deliveriesSucceeded,
      successRatePct:
        counts.deliveryAttempts === 0
          ? null
          : (counts.deliveriesSucceeded / counts.deliveryAttempts) * 100,
    }
    trend = fixture.trend
  }

  const overviewFixture = overviewTelemetry[environment][timeRange]
  const clusterRows: OverviewClusterRow[] = overviewFixture.clusterSnapshots
    .map((snapshot) => {
      const cluster = failureClusters.find((c) => c.id === snapshot.clusterId)
      return cluster &&
        cluster.environment === environment &&
        cluster.endpointId === endpoint.id
        ? { cluster, snapshot }
        : null
    })
    .filter((row): row is OverviewClusterRow => row !== null)
    .sort((a, b) => b.snapshot.deliveryCount - a.snapshot.deliveryCount)

  const data: EndpointDetailData = {
    endpoint,
    timeRange,
    telemetry,
    metrics,
    trend,
    clusters: clusterRows,
  }

  return new Promise((res) => setTimeout(() => res(data), 150))
}

export function listDeliveryRecords(
  environment: Environment,
  filters: DeliveryFilters
): Promise<DeliveryListResult> {
  const result = listDeliveriesFromFixtures(environment, filters)
  return new Promise((res) => setTimeout(() => res(result), 150))
}

export function getDeliveryDetailRecord(
  environment: Environment,
  deliveryId: string
): Promise<DeliveryDetailAssessmentAggregate | null> {
  const base = getDeliveryDetailFromFixtures(environment, deliveryId)
  if (!base) return resolve(null)

  const membership = memberships.find(
    (m) => m.userId === activeUserId && m.workspaceId === workspace.id
  )
  const operatorRole: Role = membership?.role ?? "observer"
  const operatorName = users.find((u) => u.id === activeUserId)?.name ?? "Unknown"

  const facts = getDeliveryAssessmentFacts(environment, deliveryId)
  if (!facts) {
    const result: DeliveryDetailAssessmentAggregate = {
      ...base,
      assessment: null,
      operatorName,
      operatorRole,
      replayState: null,
    }
    return new Promise((res) => setTimeout(() => res(result), 150))
  }

  const overlay = getOverlay(environment)
  const replayFacts = resolveReplayFacts(
    environment,
    workspace.id,
    deliveryId,
    [...replayJobs, ...overlay.getAllJobs()],
    [...replayJobItems, ...overlay.getAllItems()]
  )

  const blockingIncidents = resolveBlockingIncidents(environment)

  const assessment = assessDelivery({
    ...facts,
    activeReplayJobIds: replayFacts.activeReplayJobIds,
    blockingIncidents,
    operatorRole,
    replayHistory: replayFacts.replayHistory,
  })

  let replayState: DeliveryDetailAssessmentAggregate["replayState"] = null
  if (replayFacts.successfulReplay) {
    const { job, item } = replayFacts.successfulReplay
    replayState = {
      status: "succeeded",
      replayJobId: job.id,
      completedAt: item.executionResult?.completedAt ?? item.processedAt,
      resultSummary: item.executionResult?.sanitizedResponseSummary ?? null,
    }
  } else if (replayFacts.activeReplayJobIds.length > 0) {
    const jobId = replayFacts.activeReplayJobIds[0]
    const job = overlay.getJob(jobId) ?? replayJobs.find((j) => j.id === jobId) ?? null
    if (job) {
      replayState = {
        status: "active",
        replayJobId: job.id,
        completedAt: null,
        resultSummary: null,
      }
    }
  } else if (replayFacts.failedReplays.length > 0) {
    const latest = replayFacts.failedReplays.sort((a, b) =>
      (b.job.completedAt ?? "").localeCompare(a.job.completedAt ?? "")
    )[0]
    replayState = {
      status: "failed",
      replayJobId: latest.job.id,
      completedAt: latest.item.executionResult?.completedAt ?? latest.item.processedAt,
      resultSummary: latest.item.executionResult?.sanitizedResponseSummary ?? latest.item.resultSummary,
    }
  }

  const result: DeliveryDetailAssessmentAggregate = {
    ...base,
    assessment,
    operatorName,
    operatorRole,
    replayState,
  }
  return new Promise((res) => setTimeout(() => res(result), 150))
}

export function listDeliveryEndpointOptions(
  environment: Environment
): Promise<{ id: string; name: string }[]> {
  return resolve(getDeliveryEndpointOptions(environment))
}

// ---- Replay command / lifecycle ----

const overlayCache = new Map<string, ReplayOverlayStore>()

function getOverlay(environment: Environment): ReplayOverlayStore {
  const key = `${workspace.id}:${environment}`
  let store = overlayCache.get(key)
  if (!store) {
    store = new ReplayOverlayStore(workspace.id, environment)
    overlayCache.set(key, store)
  }
  return store
}

/**
 * Dynamic workspace-wide idempotency lookup using the persisted replay jobs
 * themselves as canonical idempotency records. Searches valid simulated
 * replay jobs across both Production and Sandbox overlays on every command.
 */
function lookupIdempotencyKey(
  key: string,
  deliveryId: string,
  environment: Environment,
  acknowledgement: boolean,
  normalizedNote: string | null
): { result: "match" | "reuse" | "miss"; jobId: string | null } {
  const environments: Environment[] = ["production", "sandbox"]
  let matchJob: ReplayJob | null = null
  let reuseFound = false

  for (const env of environments) {
    const store = getOverlay(env)
    for (const job of store.getAllJobs()) {
      if (job.idempotencyKey !== key) continue
      if (job.workspaceId !== workspace.id) continue
      const exactMatch =
        job.environment === environment &&
        job.sourceDeliveryId === deliveryId &&
        (job.acknowledgement !== null) === acknowledgement &&
        (job.note ?? null) === (normalizedNote ?? null)
      if (exactMatch) {
        if (matchJob !== null) {
          return { result: "reuse", jobId: null }
        }
        matchJob = job
      } else {
        reuseFound = true
      }
    }
  }

  if (matchJob) {
    const correctOverlay = getOverlay(environment)
    if (!correctOverlay.getJob(matchJob.id)) {
      return { result: "reuse", jobId: null }
    }
    return { result: "match", jobId: matchJob.id }
  }
  if (reuseFound) return { result: "reuse", jobId: null }
  return { result: "miss", jobId: null }
}

function resolveOperator(): { role: Role; name: string; userId: string } {
  const membership = memberships.find(
    (m) => m.userId === activeUserId && m.workspaceId === workspace.id
  )
  const role: Role = membership?.role ?? "observer"
  const name = users.find((u) => u.id === activeUserId)?.name ?? "Unknown"
  return { role, name, userId: activeUserId }
}

function resolveBlockingIncidents(environment: Environment): PlatformIncident[] {
  return platformIncidents.filter(
    (i) =>
      i.status !== "resolved" &&
      i.affectsReplay &&
      i.affectedEnvironments.includes(environment)
  )
}

function generateJobId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `rpj_sim_${ts}${rand}`
}

function generateItemId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `rpi_sim_${ts}${rand}`
}

const QUEUED_DELAY_MS = 1200
const RUNNING_DELAY_MS = 1800

export function requestSingleDeliveryReplay(
  command: SingleReplayCommand
): Promise<ReplayCommandResult> {
  const { environment, deliveryId, idempotencyKey } = command

  // Syntactic validation of idempotency key
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return resolve({ ok: false, replayJobId: null, error: "invalid_idempotency_key_format", errorMessage: commandErrorToMessage("invalid_idempotency_key_format") })
  }

  // Normalize and validate note at repository boundary
  const normalizedNote = normalizeNote(command.note)
  if (isNoteTooLong(command.note)) {
    return resolve({ ok: false, replayJobId: null, error: "note_too_long", errorMessage: commandErrorToMessage("note_too_long") })
  }

  const base = getDeliveryDetailFromFixtures(environment, deliveryId)
  if (!base) {
    return resolve({ ok: false, replayJobId: null, error: "delivery_not_found", errorMessage: commandErrorToMessage("delivery_not_found") })
  }

  const facts = getDeliveryAssessmentFacts(environment, deliveryId)
  if (!facts) {
    return resolve({ ok: false, replayJobId: null, error: "assessment_unavailable", errorMessage: commandErrorToMessage("assessment_unavailable") })
  }

  const overlay = getOverlay(environment)

  // Dynamic workspace-wide idempotency check using persisted replay jobs
  const idempotencyLookup = lookupIdempotencyKey(
    idempotencyKey,
    deliveryId,
    environment,
    command.acknowledgement,
    normalizedNote
  )
  if (idempotencyLookup.result === "match") {
    // Perform syntactic validation before returning idempotent success
    if (!command.acknowledgement) {
      return resolve({ ok: false, replayJobId: null, error: "acknowledgement_required", errorMessage: commandErrorToMessage("acknowledgement_required") })
    }
    return resolve({ ok: true, replayJobId: idempotencyLookup.jobId, error: null, errorMessage: null })
  }
  // Key exists but does not exactly match the current normalized command — invalid reuse
  if (idempotencyLookup.result === "reuse") {
    return resolve({ ok: false, replayJobId: null, error: "invalid_idempotency_key_reuse", errorMessage: commandErrorToMessage("invalid_idempotency_key_reuse") })
  }

  // Centralized replay-fact resolution (fixture + overlay)
  const replayFacts = resolveReplayFacts(
    environment,
    workspace.id,
    deliveryId,
    [...replayJobs, ...overlay.getAllJobs()],
    [...replayJobItems, ...overlay.getAllItems()]
  )

  const { role } = resolveOperator()
  const blockingIncidents = resolveBlockingIncidents(environment)

  const assessment = assessDelivery({
    ...facts,
    activeReplayJobIds: replayFacts.activeReplayJobIds,
    blockingIncidents,
    operatorRole: role,
    replayHistory: replayFacts.replayHistory,
  })

  const validationError = validateReplayCommand({
    acknowledgement: command.acknowledgement,
    assessment,
    activeReplayJobIds: replayFacts.activeReplayJobIds,
    successfulReplayExists: replayFacts.hasSuccessfulReplay,
  })

  if (validationError) {
    return resolve({ ok: false, replayJobId: null, error: validationError, errorMessage: commandErrorToMessage(validationError) })
  }

  // Check execution scenario exists
  const scenario = findExecutionScenario(deliveryId, environment)
  if (!scenario) {
    return resolve({ ok: false, replayJobId: null, error: "execution_unavailable", errorMessage: commandErrorToMessage("execution_unavailable") })
  }

  // Derive canonical acknowledgement from domain
  const acknowledgement = deriveAcknowledgement(assessment.classification, new Date().toISOString())

  // Create job and item
  const now = new Date()
  const createdAt = now.toISOString()
  const jobId = generateJobId()
  const itemId = generateItemId()

  const job: ReplayJob = {
    id: jobId,
    workspaceId: workspace.id,
    environment,
    endpointId: facts.endpoint?.endpointId ?? "",
    status: "queued",
    requestedByUserId: activeUserId,
    totalItems: 1,
    succeededCount: 0,
    failedCount: 0,
    skippedCount: 0,
    createdAt,
    startedAt: null,
    completedAt: null,
    note: normalizedNote,
    scope: "single",
    executionMode: "simulated",
    idempotencyKey,
    sourceDeliveryId: deliveryId,
    acknowledgement,
  }

  const item: ReplayJobItem = {
    id: itemId,
    replayJobId: jobId,
    deliveryId,
    status: "pending",
    resultSummary: null,
    processedAt: null,
    executionResult: null,
  }

  // Atomic creation — if persistence fails, return execution_unavailable
  const persisted = overlay.addJob(job, item)
  if (!persisted) {
    return resolve({ ok: false, replayJobId: null, error: "execution_unavailable", errorMessage: commandErrorToMessage("execution_unavailable") })
  }

  return resolve({ ok: true, replayJobId: jobId, error: null, errorMessage: null })
}

export function getReplayJobDetail(
  environment: Environment,
  replayJobId: string
): Promise<ReplayJobDetailAggregate | null> {
  // Check overlay first
  const overlay = getOverlay(environment)
  let job = overlay.getJob(replayJobId)
  let items = overlay.getItems(replayJobId)

  // Fall back to fixtures
  if (!job) {
    job = replayJobs.find((j) => j.id === replayJobId && j.environment === environment) ?? null
    if (job) {
      items = replayJobItems.filter((i) => i.replayJobId === replayJobId)
    }
  }

  if (!job) return resolve(null)

  // Reconcile lifecycle for simulated jobs
  if (job.executionMode === "simulated" && (job.status === "queued" || job.status === "running")) {
    const reconciled = reconcileJob(overlay, job, items)
    job = reconciled.job
    items = reconciled.items
  }

  const endpointEntity = endpoints.find((e) => e.id === job!.endpointId && e.environment === environment) ?? null
  const endpoint: DeliveryEndpointContext | null = endpointEntity
    ? {
        endpointId: endpointEntity.id,
        name: endpointEntity.name,
        maskedUrl: endpointEntity.maskedUrl,
        environment: endpointEntity.environment,
      }
    : null

  const requestedBy = users.find((u) => u.id === job!.requestedByUserId) ?? null

  let sourceDelivery: DeliveryRecord | null = null
  let sourceEvent: DeliveryEventContext | null = null
  if (job!.sourceDeliveryId) {
    const detail = getDeliveryDetailFromFixtures(environment, job!.sourceDeliveryId)
    if (detail) {
      sourceDelivery = detail.delivery
      sourceEvent = detail.event
    }
  }

  // Determine result availability for single replays using strict resolver
  const resultAvailable = job!.scope === "single" && job!.executionMode === "simulated"
    ? isSimulatedResultAvailable(job!, items[0])
    : false

  // Resolve requester role label from workspace-scoped membership
  const requesterRoleLabel = (() => {
    if (!requestedBy) return "—"
    const membership = memberships.find(
      (m) => m.userId === requestedBy.id && m.workspaceId === workspace.id
    )
    return roleLabels[membership?.role ?? "observer"]
  })()

  const result: ReplayJobDetailAggregate = {
    job: job!,
    items,
    endpoint,
    requestedBy,
    requesterRoleLabel,
    sourceDelivery,
    sourceEvent,
    isSimulated: job!.executionMode === "simulated",
    resultAvailable,
  }

  return new Promise((res) => setTimeout(() => res(result), 100))
}

interface ReconciledJob {
  job: ReplayJob
  items: ReplayJobItem[]
}

function reconcileJob(
  overlay: ReplayOverlayStore,
  job: ReplayJob,
  items: ReplayJobItem[]
): ReconciledJob {
  const now = Date.now()
  const createdMs = new Date(job.createdAt).getTime()
  const shouldStartMs = createdMs + QUEUED_DELAY_MS
  const shouldCompleteMs = createdMs + QUEUED_DELAY_MS + RUNNING_DELAY_MS

  let updatedJob = job
  let updatedItems = items

  // Transition queued -> running
  if (job.status === "queued" && now >= shouldStartMs) {
    const startedAt = new Date(shouldStartMs).toISOString()
    const runningJob = { ...job, status: "running" as const, startedAt }

    const item = items[0]
    if (item && item.status === "pending") {
      const runningItem: ReplayJobItem = { ...item, status: "running" }
      // Atomic transition — if persistence fails, retain prior coherent state
      const persisted = overlay.updateJobAndItem(runningJob, runningItem)
      if (persisted) {
        updatedJob = runningJob
        updatedItems = [runningItem]
      }
    }
  }

  // Transition running -> terminal
  if (updatedJob.status === "running" && now >= shouldCompleteMs) {
    const completedAt = new Date(shouldCompleteMs).toISOString()
    const startedAt = updatedJob.startedAt ?? new Date(shouldStartMs).toISOString()

    // Revalidate authorization before execution
    const { userId } = resolveOperator()
    const membership = memberships.find(
      (m) => m.userId === userId && m.workspaceId === workspace.id
    )
    const currentRole: Role = membership?.role ?? "observer"

    // Re-resolve delivery facts
    const facts = job.sourceDeliveryId
      ? getDeliveryAssessmentFacts(job.environment, job.sourceDeliveryId)
      : null

    if (!facts) {
      const skippedItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "skipped",
        resultSummary: "Skipped — delivery data could no longer be resolved.",
        processedAt: completedAt,
      }
      const skippedJob: ReplayJob = { ...updatedJob, status: "skipped", completedAt, skippedCount: 1 }
      const persisted = overlay.updateJobAndItem(skippedJob, skippedItem)
      if (persisted) return { job: skippedJob, items: [skippedItem] }
      return { job: updatedJob, items: updatedItems }
    }

    // Re-resolve replay facts (excluding current job)
    const replayFacts = resolveReplayFacts(
      job.environment,
      workspace.id,
      job.sourceDeliveryId!,
      [...replayJobs, ...overlay.getAllJobs()],
      [...replayJobItems, ...overlay.getAllItems()],
      job.id
    )

    const blockingIncidents = resolveBlockingIncidents(job.environment)

    const reAssessment = assessDelivery({
      ...facts,
      activeReplayJobIds: replayFacts.activeReplayJobIds,
      blockingIncidents,
      operatorRole: currentRole,
      replayHistory: replayFacts.replayHistory,
    })

    // Check operator permission
    if (reAssessment.operatorPermission.permission !== "permitted") {
      const skippedItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "skipped",
        resultSummary: "Skipped — the current operator is no longer permitted to request replay execution.",
        processedAt: completedAt,
      }
      const skippedJob: ReplayJob = { ...updatedJob, status: "skipped", completedAt, skippedCount: 1 }
      const persisted = overlay.updateJobAndItem(skippedJob, skippedItem)
      if (persisted) return { job: skippedJob, items: [skippedItem] }
      return { job: updatedJob, items: updatedItems }
    }

    // Check eligibility gates
    if (reAssessment.replayEligibility.decision !== "eligible" || replayFacts.hasSuccessfulReplay) {
      const skipReason = replayFacts.hasSuccessfulReplay
        ? "Skipped — delivery was already recovered by a successful replay."
        : `Skipped — ${reAssessment.replayEligibility.explanation}`
      const skippedItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "skipped",
        resultSummary: skipReason,
        processedAt: completedAt,
      }
      const skippedJob: ReplayJob = { ...updatedJob, status: "skipped", completedAt, skippedCount: 1 }
      const persisted = overlay.updateJobAndItem(skippedJob, skippedItem)
      if (persisted) return { job: skippedJob, items: [skippedItem] }
      return { job: updatedJob, items: updatedItems }
    }

    // Execute simulation
    const scenario = findExecutionScenario(job.sourceDeliveryId!, job.environment)
    if (!scenario) {
      const skippedItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "skipped",
        resultSummary: "Skipped — simulated execution is not configured for this delivery.",
        processedAt: completedAt,
      }
      const skippedJob: ReplayJob = { ...updatedJob, status: "skipped", completedAt, skippedCount: 1 }
      const persisted = overlay.updateJobAndItem(skippedJob, skippedItem)
      if (persisted) return { job: skippedJob, items: [skippedItem] }
      return { job: updatedJob, items: updatedItems }
    }

    const executionResult = scenario.execute(startedAt)

    if (executionResult.outcome === "accepted") {
      const succeededItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "succeeded",
        resultSummary: executionResult.sanitizedResponseSummary,
        processedAt: executionResult.completedAt,
        executionResult,
      }
      const completedJob: ReplayJob = {
        ...updatedJob,
        status: "completed",
        completedAt: executionResult.completedAt,
        succeededCount: 1,
      }
      const persisted = overlay.updateJobAndItem(completedJob, succeededItem)
      if (persisted) return { job: completedJob, items: [succeededItem] }
      return { job: updatedJob, items: updatedItems }
    } else {
      const failedItem: ReplayJobItem = {
        ...updatedItems[0],
        status: "failed",
        resultSummary: executionResult.sanitizedResponseSummary,
        processedAt: executionResult.completedAt,
        executionResult,
      }
      const failedJob: ReplayJob = {
        ...updatedJob,
        status: "failed",
        completedAt: executionResult.completedAt,
        failedCount: 1,
      }
      const persisted = overlay.updateJobAndItem(failedJob, failedItem)
      if (persisted) return { job: failedJob, items: [failedItem] }
      return { job: updatedJob, items: updatedItems }
    }
  }

  return { job: updatedJob, items: updatedItems }
}

export function advanceSingleReplayExecution(
  environment: Environment,
  replayJobId: string
): Promise<ReplayJobDetailAggregate | null> {
  return getReplayJobDetail(environment, replayJobId)
}
