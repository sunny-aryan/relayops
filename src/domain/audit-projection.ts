import type {
  AuditEvent,
  AuditProvenance,
  AuditRelatedResource,
  AuditTrailEntry,
  DeliveryRecord,
  Environment,
  Endpoint,
  ReplayJob,
  ReplayJobItem,
  User,
  Membership,
} from "@/types"
import {
  isCoherentFailed,
  isCoherentRecordedTerminalJob,
  isCoherentSimulatedFact,
  isCoherentSkipped,
  isCoherentSuccess,
} from "@/domain/replay-coherence"
import { resolveAuditActionLabel, roleLabels } from "@/lib/labels"

export interface ProjectedAuditEvent {
  id: string
  action: string
  occurredAt: string
  actorUserId: string | null
  actorLabel: string
  targetType: string
  targetId: string
  summary: string
  environment: Environment | null
  provenance: AuditProvenance
  isSimulated: boolean
  operatorNote: string | null
  httpStatus: number | null
  executionModeLabel: string | null
  relatedResources: AuditRelatedResource[]
}

export interface AuditProjectionContext {
  workspaceId: string
  environment: Environment
  users: User[]
  memberships: Membership[]
  endpoints: Endpoint[]
  deliveries: DeliveryRecord[]
}

type ReplayAction =
  | "replay.requested"
  | "replay.started"
  | "replay.completed"
  | "replay.failed"
  | "replay.skipped"
  | "replay.partially_completed"

function deterministicEventId(jobId: string, action: ReplayAction): string {
  return `aud_sim_${jobId}_${action.replace(/\./g, "_")}`
}

function resolveActorLabel(
  userId: string | null,
  ctx: AuditProjectionContext
): string {
  if (!userId) return "—"
  const user = ctx.users.find((u) => u.id === userId)
  return user?.name ?? "—"
}

function resolveRoleLabel(
  userId: string | null,
  ctx: AuditProjectionContext
): string | null {
  if (!userId) return null
  const membership = ctx.memberships.find(
    (m) => m.userId === userId && m.workspaceId === ctx.workspaceId
  )
  return membership ? roleLabels[membership.role] : null
}

function resolveReplayJobResource(
  job: ReplayJob,
  ctx: AuditProjectionContext
): AuditRelatedResource {
  const exists = ctx.endpoints.some(
    (e) => e.id === job.endpointId && e.environment === ctx.environment
  )
  return {
    type: "replay_job",
    id: job.id,
    label: job.id,
    href: exists ? `/replays/${job.id}` : null,
  }
}

function resolveEndpointResource(
  endpointId: string,
  ctx: AuditProjectionContext
): AuditRelatedResource | null {
  const ep = ctx.endpoints.find(
    (e) => e.id === endpointId && e.environment === ctx.environment
  )
  if (!ep) return null
  return {
    type: "endpoint",
    id: ep.id,
    label: ep.name,
    href: `/endpoints/${ep.id}`,
  }
}

function resolveDeliveryResource(
  deliveryId: string,
  ctx: AuditProjectionContext
): AuditRelatedResource | null {
  const delivery = ctx.deliveries.find(
    (d) => d.id === deliveryId && d.environment === ctx.environment
  )
  if (!delivery) return null
  return {
    type: "delivery",
    id: deliveryId,
    label: deliveryId,
    href: `/deliveries/${deliveryId}`,
  }
}

function resolveSimulatedReplayResources(
  job: ReplayJob,
  ctx: AuditProjectionContext
): AuditRelatedResource[] {
  const resources: AuditRelatedResource[] = [resolveReplayJobResource(job, ctx)]
  if (job.sourceDeliveryId) {
    const dr = resolveDeliveryResource(job.sourceDeliveryId, ctx)
    if (dr) resources.push(dr)
  }
  if (job.endpointId) {
    const er = resolveEndpointResource(job.endpointId, ctx)
    if (er) resources.push(er)
  }
  return resources
}

function resolveRecordedReplayResources(
  job: ReplayJob,
  ctx: AuditProjectionContext
): AuditRelatedResource[] {
  const resources: AuditRelatedResource[] = [resolveReplayJobResource(job, ctx)]
  if (job.endpointId) {
    const er = resolveEndpointResource(job.endpointId, ctx)
    if (er) resources.push(er)
  }
  return resources
}

function replayRequestedSummary(job: ReplayJob): string {
  if (job.scope === "single" && job.sourceDeliveryId) {
    return `Requested replay of delivery ${job.sourceDeliveryId} to ${job.endpointId}.`
  }
  const scope = `${job.totalItems} deliveries`
  return `Requested replay of ${scope} to ${job.endpointId}.`
}

function replayStartedSummary(isSimulated: boolean): string {
  return isSimulated
    ? "Simulated replay execution started."
    : "Replay execution started."
}

function replayCompletedSummary(item: ReplayJobItem): string {
  const httpStatus = item.executionResult?.httpStatus
  if (httpStatus !== null && httpStatus !== undefined) {
    return `Simulated replay completed; receiver returned HTTP ${httpStatus}.`
  }
  return "Simulated replay completed."
}

function replayFailedSummary(item: ReplayJobItem): string {
  const httpStatus = item.executionResult?.httpStatus
  const summary = item.executionResult?.sanitizedResponseSummary ?? item.resultSummary ?? "Simulated replay failed."
  if (httpStatus !== null && httpStatus !== undefined) {
    return `Simulated replay failed; receiver returned HTTP ${httpStatus}. ${summary}`
  }
  return summary
}

function replaySkippedSummary(item: ReplayJobItem): string {
  return item.resultSummary ?? "Replay skipped."
}

function replayPartiallyCompletedSummary(job: ReplayJob): string {
  return `Replay partially completed; ${job.succeededCount} succeeded, ${job.failedCount} failed, ${job.skippedCount} skipped of ${job.totalItems} total.`
}

/**
 * Project deterministic audit events from a single coherent simulated replay job/item pair.
 * Only events supported by canonical replay-coherence are projected.
 */
function projectSimulatedReplayEvents(
  job: ReplayJob,
  item: ReplayJobItem,
  ctx: AuditProjectionContext
): ProjectedAuditEvent[] {
  if (job.executionMode !== "simulated") return []
  if (job.scope !== "single") return []
  if (!isCoherentSimulatedFact(job, item)) return []
  if (job.workspaceId !== ctx.workspaceId) return []
  if (job.environment !== ctx.environment) return []

  const events: ProjectedAuditEvent[] = []
  const actorLabel = resolveActorLabel(job.requestedByUserId, ctx)
  const note = job.note ?? null
  const executionModeLabel = "Simulated"
  const resources = resolveSimulatedReplayResources(job, ctx)

  // Always: requested
  events.push({
    id: deterministicEventId(job.id, "replay.requested"),
    action: "replay.requested",
    occurredAt: job.createdAt,
    actorUserId: job.requestedByUserId,
    actorLabel,
    targetType: "replay_job",
    targetId: job.id,
    summary: replayRequestedSummary(job),
    environment: job.environment,
    provenance: "simulated",
    isSimulated: true,
    operatorNote: note,
    httpStatus: null,
    executionModeLabel,
    relatedResources: resources,
  })

  // Running or terminal: started
  if (job.status === "running" || job.status === "completed" || job.status === "failed" || job.status === "skipped") {
    if (job.startedAt) {
      events.push({
        id: deterministicEventId(job.id, "replay.started"),
        action: "replay.started",
        occurredAt: job.startedAt,
        actorUserId: job.requestedByUserId,
        actorLabel,
        targetType: "replay_job",
        targetId: job.id,
        summary: replayStartedSummary(true),
        environment: job.environment,
        provenance: "simulated",
        isSimulated: true,
        operatorNote: null,
        httpStatus: null,
        executionModeLabel,
        relatedResources: resources,
      })
    }
  }

  // Completed
  if (job.status === "completed" && isCoherentSuccess(job, item)) {
    events.push({
      id: deterministicEventId(job.id, "replay.completed"),
      action: "replay.completed",
      occurredAt: job.completedAt ?? item.processedAt ?? job.startedAt ?? job.createdAt,
      actorUserId: job.requestedByUserId,
      actorLabel,
      targetType: "replay_job",
      targetId: job.id,
      summary: replayCompletedSummary(item),
      environment: job.environment,
      provenance: "simulated",
      isSimulated: true,
      operatorNote: null,
      httpStatus: item.executionResult?.httpStatus ?? null,
      executionModeLabel,
      relatedResources: resources,
    })
  }

  // Failed
  if (job.status === "failed" && isCoherentFailed(job, item)) {
    events.push({
      id: deterministicEventId(job.id, "replay.failed"),
      action: "replay.failed",
      occurredAt: job.completedAt ?? item.processedAt ?? job.startedAt ?? job.createdAt,
      actorUserId: job.requestedByUserId,
      actorLabel,
      targetType: "replay_job",
      targetId: job.id,
      summary: replayFailedSummary(item),
      environment: job.environment,
      provenance: "simulated",
      isSimulated: true,
      operatorNote: null,
      httpStatus: item.executionResult?.httpStatus ?? null,
      executionModeLabel,
      relatedResources: resources,
    })
  }

  // Skipped
  if (job.status === "skipped" && isCoherentSkipped(job, item)) {
    events.push({
      id: deterministicEventId(job.id, "replay.skipped"),
      action: "replay.skipped",
      occurredAt: job.completedAt ?? item.processedAt ?? job.startedAt ?? job.createdAt,
      actorUserId: job.requestedByUserId,
      actorLabel,
      targetType: "replay_job",
      targetId: job.id,
      summary: replaySkippedSummary(item),
      environment: job.environment,
      provenance: "simulated",
      isSimulated: true,
      operatorNote: null,
      httpStatus: null,
      executionModeLabel,
      relatedResources: resources,
    })
  }

  return events
}

/**
 * Project deterministic audit events from a coherent recorded replay job.
 * Uses canonical recorded terminal-job coherence validation.
 * Only started and partially_completed are derived; requested comes from fixtures.
 */
function projectRecordedReplayEvents(
  job: ReplayJob,
  ctx: AuditProjectionContext
): ProjectedAuditEvent[] {
  if (job.executionMode !== "recorded") return []
  if (job.workspaceId !== ctx.workspaceId) return []
  if (job.environment !== ctx.environment) return []
  if (!isCoherentRecordedTerminalJob(job)) return []

  const events: ProjectedAuditEvent[] = []
  const actorLabel = resolveActorLabel(job.requestedByUserId, ctx)
  const executionModeLabel = "Recorded"
  const resources = resolveRecordedReplayResources(job, ctx)

  // Started — only if we have a valid startedAt and the job is terminal
  if (job.startedAt && (job.status === "completed" || job.status === "partially_completed" || job.status === "failed" || job.status === "cancelled")) {
    events.push({
      id: deterministicEventId(job.id, "replay.started"),
      action: "replay.started",
      occurredAt: job.startedAt,
      actorUserId: job.requestedByUserId,
      actorLabel,
      targetType: "replay_job",
      targetId: job.id,
      summary: replayStartedSummary(false),
      environment: job.environment,
      provenance: "recorded",
      isSimulated: false,
      operatorNote: null,
      httpStatus: null,
      executionModeLabel,
      relatedResources: resources,
    })
  }

  // Partially completed
  if (job.status === "partially_completed" && job.completedAt) {
    events.push({
      id: deterministicEventId(job.id, "replay.partially_completed"),
      action: "replay.partially_completed",
      occurredAt: job.completedAt,
      actorUserId: job.requestedByUserId,
      actorLabel,
      targetType: "replay_job",
      targetId: job.id,
      summary: replayPartiallyCompletedSummary(job),
      environment: job.environment,
      provenance: "recorded",
      isSimulated: false,
      operatorNote: null,
      httpStatus: null,
      executionModeLabel,
      relatedResources: resources,
    })
  }

  return events
}

/**
 * Deduplicate by semantic key: (action, targetId, environment, occurredAt).
 * When a fixture and a derived event collide, prefer the fixture.
 */
function deduplicateEvents(
  fixtures: AuditEvent[],
  derived: ProjectedAuditEvent[]
): ProjectedAuditEvent[] {
  const fixtureKeys = new Set(
    fixtures.map((f) => `${f.action}|${f.targetId}|${f.environment ?? "null"}|${f.occurredAt}`)
  )
  return derived.filter(
    (d) => !fixtureKeys.has(`${d.action}|${d.targetId}|${d.environment ?? "null"}|${d.occurredAt}`)
  )
}

/**
 * Project all replay-derived audit events from the given jobs and items.
 * Jobs and items must already be scoped to the target workspace and environment.
 * Merges with fixture events, deduplicating semantically.
 * Defense-in-depth: filters projected rows by environment before returning.
 */
export function projectReplayAuditEvents(
  jobs: ReplayJob[],
  items: ReplayJobItem[],
  fixtures: AuditEvent[],
  ctx: AuditProjectionContext
): ProjectedAuditEvent[] {
  const derived: ProjectedAuditEvent[] = []

  for (const job of jobs) {
    // Environment + workspace scope check before projection
    if (job.workspaceId !== ctx.workspaceId) continue
    if (job.environment !== ctx.environment) continue

    if (job.executionMode === "simulated" && job.scope === "single") {
      const jobItems = items.filter((i) => i.replayJobId === job.id)
      // A simulated single replay must have exactly one coherent item
      if (jobItems.length !== 1) continue
      derived.push(...projectSimulatedReplayEvents(job, jobItems[0], ctx))
    }
    if (job.executionMode === "recorded") {
      derived.push(...projectRecordedReplayEvents(job, ctx))
    }
  }

  // Defense in depth: final environment check on projected rows
  const envFiltered = derived.filter(
    (d) => d.environment === null || d.environment === ctx.environment
  )

  return deduplicateEvents(fixtures, envFiltered)
}

/**
 * Build an audit trail for a specific replay job.
 */
export function buildReplayAuditTrail(
  job: ReplayJob,
  items: ReplayJobItem[],
  fixtures: AuditEvent[],
  ctx: AuditProjectionContext
): AuditTrailEntry[] {
  const derived = projectReplayAuditEvents([job], items, fixtures, ctx)
  const fixtureEvents = fixtures.filter((f) => f.targetType === "replay_job" && f.targetId === job.id)

  const all: AuditTrailEntry[] = [
    ...fixtureEvents.map((f) => ({
      action: f.action,
      actionLabel: resolveAuditActionLabel(f.action, false),
      occurredAt: f.occurredAt,
      actorLabel: f.actorLabel,
      summary: f.summary,
      provenance: "recorded" as const,
      isSimulated: false,
      detailHref: `/audit/${f.id}`,
    })),
    ...derived.map((d) => ({
      action: d.action,
      actionLabel: resolveAuditActionLabel(d.action, d.isSimulated),
      occurredAt: d.occurredAt,
      actorLabel: d.actorLabel,
      summary: d.summary,
      provenance: d.provenance,
      isSimulated: d.isSimulated,
      detailHref: `/audit/${d.id}`,
    })),
  ]

  return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

// Re-export for repository use
export { resolveActorLabel, resolveRoleLabel }
