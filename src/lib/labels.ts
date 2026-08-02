import type {
  AuditActorType,
  AttemptResultOutcome,
  DeliveryState,
  DeliveryStateFilter,
  DeliveryTimeRange,
  FailureClusterActivity,
  ObservedFailureCategory,
  OverviewTimeRange,
  TelemetryState,
  DeliveryStatus,
  EndpointHealth,
  EndpointStatus,
  FailureCategory,
  IncidentSeverity,
  ReplayEligibility,
  ReplayJobStatus,
  Role,
} from "@/types"

export const roleLabels: Record<Role, string> = {
  integration_admin: "Integration Admin",
  integration_developer: "Integration Developer",
  observer: "Observer",
  platform_support: "Platform Support",
  platform_system: "Platform System",
}

export const endpointHealthLabels: Record<EndpointHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  failing: "Failing",
  disabled: "Disabled",
  stale: "Stale telemetry",
}

export const endpointStatusLabels: Record<EndpointStatus, string> = {
  active: "Active",
  disabled: "Disabled",
}

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  retrying: "Retrying",
  exhausted: "Retries exhausted",
  unknown: "Unknown outcome",
}

export const failureCategoryLabels: Record<FailureCategory, string> = {
  http_400: "HTTP 400",
  http_401: "HTTP 401",
  http_404: "HTTP 404",
  http_409: "HTTP 409",
  http_429: "HTTP 429",
  http_500: "HTTP 500",
  http_503: "HTTP 503",
  timeout: "Timeout",
  dns_failure: "DNS failure",
  tls_failure: "TLS failure",
}

export const deliveryStateLabels: Record<DeliveryState, string> = {
  delivered: "Delivered",
  retrying: "Retrying",
  exhausted: "Exhausted",
  unknown: "Outcome unknown",
}

export const deliveryStateFilterLabels: Record<DeliveryStateFilter, string> = {
  all: "All states",
  delivered: "Delivered",
  retrying: "Retrying",
  exhausted: "Exhausted",
  unknown: "Outcome unknown",
}

export const attemptOutcomeLabels: Record<AttemptResultOutcome, string> = {
  success: "Successful",
  confirmed_failure: "Confirmed unsuccessful",
  outcome_unknown: "Outcome unknown",
}

export const retryDecisionLabels: Record<"retry" | "exhausted" | "succeeded" | "no_retry", string> = {
  retry: "Retry scheduled",
  exhausted: "Retry limit reached",
  succeeded: "Succeeded — no retry",
  no_retry: "No retry",
}

export const observedFailureCategoryLabels: Record<ObservedFailureCategory, string> = {
  http_400: "HTTP 400",
  http_401: "HTTP 401",
  http_404: "HTTP 404",
  http_409: "HTTP 409",
  http_429: "HTTP 429",
  http_500: "HTTP 500",
  http_503: "HTTP 503",
  timeout: "Timeout",
  connection_terminated: "Connection terminated",
  dns_failure: "DNS failure",
  tls_failure: "TLS failure",
}

export const deliveryTimeRangeLabels: Record<DeliveryTimeRange, string> = {
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
}

export const replayEligibilityLabels: Record<ReplayEligibility, string> = {
  eligible: "Eligible for replay",
  already_succeeded: "Already succeeded",
  payload_expired: "Payload expired",
  payload_redacted: "Payload redacted",
  endpoint_disabled: "Endpoint disabled",
  in_active_replay: "In active replay",
  blocked_by_incident: "Blocked by incident",
}

export const replayJobStatusLabels: Record<ReplayJobStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  partially_completed: "Partially completed",
  failed: "Failed",
  cancelled: "Cancelled",
  skipped: "Skipped",
}

export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  minor: "Minor",
  major: "Major",
  critical: "Critical",
}

export const auditActorTypeLabels: Record<AuditActorType, string> = {
  user: "User",
  system: "System",
  support: "Support",
}

export const timeRangeLabels: Record<OverviewTimeRange, string> = {
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
}

export const timeRangeShortLabels: Record<OverviewTimeRange, string> = {
  "6h": "6h",
  "24h": "24h",
  "7d": "7d",
}

export const telemetryStateLabels: Record<TelemetryState, string> = {
  current: "Current",
  stale: "Stale",
  insufficient: "Insufficient data",
}

export const clusterActivityLabels: Record<FailureClusterActivity, string> = {
  active: "Active",
  historical: "Historical",
}
