export type Environment = "production" | "sandbox"

export type Role =
  | "integration_admin"
  | "integration_developer"
  | "observer"
  | "platform_support"
  | "platform_system"

export type EndpointStatus = "active" | "disabled"

export type EndpointHealth = "healthy" | "degraded" | "failing" | "disabled" | "stale"

export type DeliveryStatus =
  | "succeeded"
  | "failed"
  | "retrying"
  | "exhausted"
  | "unknown"

export type AttemptOutcome =
  | "success"
  | "http_error"
  | "timeout"
  | "dns_failure"
  | "tls_failure"
  | "connection_refused"

export type FailureCategory =
  | "http_400"
  | "http_401"
  | "http_404"
  | "http_409"
  | "http_429"
  | "http_500"
  | "http_503"
  | "timeout"
  | "dns_failure"
  | "tls_failure"

export type ReplayEligibility =
  | "eligible"
  | "already_succeeded"
  | "payload_expired"
  | "payload_redacted"
  | "endpoint_disabled"
  | "in_active_replay"
  | "blocked_by_incident"

export type ReplayJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled"

export type ReplayItemStatus = "pending" | "succeeded" | "failed" | "skipped"

export type IncidentSeverity = "minor" | "major" | "critical"

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved"

export type AuditActorType = "user" | "system" | "support"

export type PayloadState = "available" | "redacted" | "expired"

export type EventType =
  | "order.created"
  | "order.cancelled"
  | "order.refunded"
  | "invoice.created"
  | "invoice.paid"
  | "subscription.updated"
  | "customer.updated"

export interface Workspace {
  id: string
  name: string
  slug: string
  providerName: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatarInitials: string
}

export interface Membership {
  id: string
  workspaceId: string
  userId: string
  role: Role
  createdAt: string
}

export interface ApiKeyMetadata {
  id: string
  workspaceId: string
  environment: Environment
  label: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
  createdByUserId: string
}

export interface Endpoint {
  id: string
  workspaceId: string
  environment: Environment
  name: string
  maskedUrl: string
  description: string
  status: EndpointStatus
  health: EndpointHealth
  subscribedEventTypes: EventType[]
  signingKeyMasked: string
  signingEnabled: boolean
  signingAlgorithm: string
  apiVersion: string
  retryMaxAttempts: number
  retryBackoffStrategy: string
  createdAt: string
  updatedAt: string
  disabledAt: string | null
  disabledReason: string | null
}

export interface Event {
  id: string
  workspaceId: string
  environment: Environment
  type: EventType
  resourceId: string
  payloadState: PayloadState
  payloadSummary: string
  occurredAt: string
}

export interface Delivery {
  id: string
  eventId: string
  endpointId: string
  environment: Environment
  status: DeliveryStatus
  attemptCount: number
  maxAttempts: number
  firstAttemptAt: string | null
  lastAttemptAt: string | null
  nextRetryAt: string | null
  failureCategory: FailureCategory | null
  replayEligibility: ReplayEligibility | null
  replayJobId: string | null
}

export interface DeliveryAttempt {
  id: string
  deliveryId: string
  attemptNumber: number
  outcome: AttemptOutcome
  httpStatusCode: number | null
  failureCategory: FailureCategory | null
  responseSummary: string
  latencyMs: number | null
  startedAt: string
}

export interface FailureCluster {
  id: string
  endpointId: string
  environment: Environment
  failureCategory: FailureCategory
  eventTypes: EventType[]
  deliveryCount: number
  firstSeenAt: string
  lastSeenAt: string
  sampleDeliveryIds: string[]
}

export type OverviewTimeRange = "6h" | "24h" | "7d"

export type TelemetryState = "current" | "stale" | "insufficient"

export type FailureClusterActivity = "active" | "historical"

export interface TelemetrySnapshot {
  state: TelemetryState
  latestAt: string | null
}

// Aggregate counts for a (environment, time range) window. Success rate is
// derived from these counts rather than stored, so figures always reconcile.
export interface DeliveryMetricCounts {
  eventsReceived: number
  deliveryAttempts: number
  deliveriesSucceeded: number
  exhaustedDeliveries: number
  unknownOutcomes: number
  retryBacklog: number
  p95LatencyMs: number | null
}

export interface DeliveryMetricSummary extends DeliveryMetricCounts {
  unsuccessfulAttempts: number
  successRatePct: number | null
}

export interface DeliveryTrendBucket {
  bucketStart: string
  label: string
  succeeded: number
  unsuccessful: number
}

export interface EndpointMetricSnapshot {
  endpointId: string
  deliveryAttempts: number
  deliveriesSucceeded: number
  p95LatencyMs: number | null
  backlogCount: number
  lastActivityAt: string | null
}

export interface FailureClusterSnapshot {
  clusterId: string
  deliveryCount: number
  firstSeenAt: string
  lastSeenAt: string
  activity: FailureClusterActivity
}

export interface OverviewEndpointRow {
  endpoint: Endpoint
  metrics: EndpointMetricSnapshot | null
  successRatePct: number | null
}

export interface OverviewClusterRow {
  cluster: FailureCluster
  snapshot: FailureClusterSnapshot
}

export interface OverviewData {
  environment: Environment
  timeRange: OverviewTimeRange
  telemetry: TelemetrySnapshot
  metrics: DeliveryMetricSummary
  trend: DeliveryTrendBucket[]
  endpoints: OverviewEndpointRow[]
  clusters: OverviewClusterRow[]
  deliveryIncidents: PlatformIncident[]
}

export interface EndpointDetailData {
  endpoint: Endpoint
  timeRange: OverviewTimeRange
  telemetry: TelemetrySnapshot
  metrics: DeliveryMetricSummary | null
  trend: DeliveryTrendBucket[]
  clusters: OverviewClusterRow[]
}

export interface EndpointInventoryRow {
  endpoint: Endpoint
  metrics: EndpointMetricSnapshot | null
  successRatePct: number | null
}

export interface ReplayJob {
  id: string
  workspaceId: string
  environment: Environment
  endpointId: string
  status: ReplayJobStatus
  requestedByUserId: string
  totalItems: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  note: string | null
}

export interface ReplayJobItem {
  id: string
  replayJobId: string
  deliveryId: string
  status: ReplayItemStatus
  resultSummary: string | null
  processedAt: string | null
}

export interface UsageBucket {
  id: string
  workspaceId: string
  environment: Environment
  periodStart: string
  periodEnd: string
  eventsReceived: number
  deliveriesAttempted: number
  deliveriesSucceeded: number
  replaysExecuted: number
}

export interface PlatformIncident {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  affectsReplay: boolean
  affectsDelivery: boolean
  affectedEnvironments: Environment[]
  summary: string
  startedAt: string
  resolvedAt: string | null
}

export interface AuditEvent {
  id: string
  workspaceId: string
  environment: Environment | null
  actorType: AuditActorType
  actorUserId: string | null
  actorLabel: string
  action: string
  targetType: string
  targetId: string
  summary: string
  occurredAt: string
}
