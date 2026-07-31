import {
  activeUserId,
  apiKeys,
  auditEvents,
  deliveries,
  deliveryAttempts,
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
import type {
  ApiKeyMetadata,
  AuditEvent,
  Delivery,
  DeliveryAttempt,
  Endpoint,
  Environment,
  Event,
  FailureCluster,
  Membership,
  PlatformIncident,
  ReplayJob,
  ReplayJobItem,
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

export function listDeliveries(environment: Environment): Promise<Delivery[]> {
  return resolve(deliveries.filter((d) => d.environment === environment))
}

export function getDeliveryById(
  deliveryId: string,
  environment: Environment
): Promise<Delivery | null> {
  return resolve(
    deliveries.find((d) => d.id === deliveryId && d.environment === environment) ?? null
  )
}

export function listDeliveryAttempts(deliveryId: string): Promise<DeliveryAttempt[]> {
  return resolve(deliveryAttempts.filter((a) => a.deliveryId === deliveryId))
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
