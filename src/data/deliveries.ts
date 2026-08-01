import type {
  DeliveryAttemptRecord,
  DeliveryAssessmentFacts,
  DeliveryDetailAggregate,
  DeliveryEndpointContext,
  DeliveryEventContext,
  DeliveryFilters,
  DeliveryListResult,
  DeliveryRecord,
  DeliveryStateFilter,
  DeliveryTimeRange,
  Environment,
  EventType,
  ObservedFailureCategory,
  SanitizedRequestEvidence,
  SanitizedResponseEvidence,
} from "@/types"
import { endpoints, events } from "@/data/fixtures"

const REDACTED = "[REDACTED]"

function sanitizeHeaders(
  headers: Record<string, string>,
  sensitiveKeys: string[] = ["authorization", "cookie", "x-helio-signature", "x-api-key", "set-cookie"]
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (sensitiveKeys.includes(lower)) {
      result[key] = REDACTED
    } else {
      result[key] = value
    }
  }
  return result
}

function sanitizePayload(json: object | null): { body: string | null; truncated: boolean; malformed: boolean } {
  if (!json) return { body: null, truncated: false, malformed: false }
  try {
    const text = JSON.stringify(json, null, 2)
    const maxLen = 2048
    if (text.length > maxLen) {
      return { body: text.slice(0, maxLen) + "\n…[truncated]", truncated: true, malformed: false }
    }
    return { body: text, truncated: false, malformed: false }
  } catch {
    return { body: null, truncated: false, malformed: true }
  }
}

function endpointUrl(endpointId: string, environment: Environment): string {
  const ep = endpoints.find((e) => e.id === endpointId && e.environment === environment)
  return ep?.maskedUrl ?? "https://••••••"
}

function makeRequest(
  endpointId: string,
  environment: Environment,
  contentType: string,
  apiVersion: string,
  eventType: EventType,
  signature: string,
  payload: object | null
): SanitizedRequestEvidence {
  const { body, truncated, malformed } = sanitizePayload(payload)
  return {
    method: "POST",
    maskedUrl: endpointUrl(endpointId, environment),
    contentType,
    apiVersion,
    safeHeaders: sanitizeHeaders({
      "content-type": contentType,
      "x-helio-event": eventType,
      "x-helio-signature": signature,
      "user-agent": "Helio-Webhook/1.0",
    }),
    sanitizedPayload: body,
    payloadTruncated: truncated,
    payloadMalformed: malformed,
  }
}

function makeResponse(
  httpStatus: number | null,
  headers: Record<string, string>,
  body: object | string | null,
  transportResult: string | null,
  responseAbsent: boolean
): SanitizedResponseEvidence {
  let sanitizedBody: string | null = null
  let bodyTruncated = false
  if (body && !responseAbsent) {
    if (typeof body === "string") {
      sanitizedBody = body
    } else {
      const { body: text, truncated } = sanitizePayload(body)
      sanitizedBody = text
      bodyTruncated = truncated
    }
  }
  return {
    httpStatus,
    safeHeaders: sanitizeHeaders(headers),
    sanitizedBody,
    bodyTruncated,
    transportResult,
    responseAbsent,
  }
}

interface AttemptSpec {
  id: string
  attemptNumber: number
  outcome: "success" | "confirmed_failure" | "outcome_unknown"
  httpStatusCode: number | null
  observedFailureCategory: ObservedFailureCategory | null
  responseSummary: string
  latencyMs: number | null
  startedAt: string
  retryDecision: "retry" | "exhausted" | "succeeded" | "no_retry"
  nextRetryAt: string | null
  request: SanitizedRequestEvidence
  response: SanitizedResponseEvidence
}

interface DeliverySpec {
  id: string
  eventId: string
  endpointId: string
  environment: Environment
  state: DeliveryRecord["state"]
  eventType: EventType
  succeededAfterRetry: boolean
  attempts: AttemptSpec[]
}

function endpointMaxAttempts(endpointId: string, environment: Environment): number {
  const ep = endpoints.find((e) => e.id === endpointId && e.environment === environment)
  return ep?.retryMaxAttempts ?? 1
}

function buildDeliveryRecord(spec: DeliverySpec): DeliveryRecord {
  const attempts = spec.attempts
  const last = attempts[attempts.length - 1]
  const observedCategories = Array.from(
    new Set(
      attempts
        .map((a) => a.observedFailureCategory)
        .filter((c): c is ObservedFailureCategory => c !== null)
    )
  )
  return {
    id: spec.id,
    eventId: spec.eventId,
    endpointId: spec.endpointId,
    environment: spec.environment,
    state: spec.state,
    eventType: spec.eventType,
    attemptCount: attempts.length,
    maxAttempts: endpointMaxAttempts(spec.endpointId, spec.environment),
    firstAttemptAt: attempts[0].startedAt,
    lastAttemptAt: last.startedAt,
    nextRetryAt: spec.state === "retrying" ? last.nextRetryAt : null,
    latestObservedCategory: last.observedFailureCategory,
    observedCategories,
    latestResponseSummary: last.responseSummary,
    latestLatencyMs: last.latencyMs,
    succeededAfterRetry: spec.succeededAfterRetry,
  }
}

function buildAttemptRecord(deliveryId: string, spec: AttemptSpec): DeliveryAttemptRecord {
  return { ...spec, deliveryId }
}

// ---- Production — Billing Sync ----

const dlv_a1f8c204_attempts: AttemptSpec[] = [
  {
    id: "att_a1f8c204_1",
    attemptNumber: 1,
    outcome: "outcome_unknown",
    httpStatusCode: null,
    observedFailureCategory: "timeout",
    responseSummary: "No response within 10 s — connection timed out",
    latencyMs: 10000,
    startedAt: "2026-07-31T06:42:14Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:11:02Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722408134,v1=abc123def456", { type: "invoice.paid", data: { invoice: "inv_98214", amount: 2400, currency: "eur", customer: REDACTED } }),
    response: makeResponse(null, {}, null, "No response within 10 s — connection timed out. The receiver may have processed the request, but no conclusive response was recorded.", true),
  },
  {
    id: "att_a1f8c204_2",
    attemptNumber: 2,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker saturated",
    latencyMs: 4890,
    startedAt: "2026-07-31T07:11:02Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:41:02Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722411062,v1=def789ghi012", { type: "invoice.paid", data: { invoice: "inv_98214", amount: 2400, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "300" }, { error: "service_unavailable", message: "Upstream billing worker saturated" }, null, false),
  },
  {
    id: "att_a1f8c204_3",
    attemptNumber: 3,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retry-after 600",
    latencyMs: 5040,
    startedAt: "2026-07-31T07:41:02Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T08:41:02Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722414062,v1=ghi345jkl678", { type: "invoice.paid", data: { invoice: "inv_98214", amount: 2400, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "600" }, { error: "service_unavailable", message: "Retry after 600s" }, null, false),
  },
]

const dlv_b7e2d911_attempts: AttemptSpec[] = [
  {
    id: "att_b7e2d911_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker saturated",
    latencyMs: 4900,
    startedAt: "2026-07-31T06:30:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:35:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722407930,v1=aaa111bbb222", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_2",
    attemptNumber: 2,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retry-after 300",
    latencyMs: 5100,
    startedAt: "2026-07-31T06:35:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:42:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722409550,v1=ccc333ddd444", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "300" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_3",
    attemptNumber: 3,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker still saturated",
    latencyMs: 4950,
    startedAt: "2026-07-31T06:42:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:50:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722411350,v1=eee555fff666", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_4",
    attemptNumber: 4,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker saturated",
    latencyMs: 4850,
    startedAt: "2026-07-31T06:50:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:00:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722412550,v1=ggg777hhh888", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_5",
    attemptNumber: 5,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retry-after 300",
    latencyMs: 4900,
    startedAt: "2026-07-31T07:00:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:12:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722413450,v1=iii999jjj000", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "300" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_6",
    attemptNumber: 6,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker saturated",
    latencyMs: 4800,
    startedAt: "2026-07-31T07:12:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:26:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722413930,v1=kkk111lll222", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_7",
    attemptNumber: 7,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retry-after 300",
    latencyMs: 4920,
    startedAt: "2026-07-31T07:26:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:41:02Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722414318,v1=mmm333nnn444", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "300" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_b7e2d911_8",
    attemptNumber: 8,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retries exhausted",
    latencyMs: 4880,
    startedAt: "2026-07-31T07:41:02Z",
    retryDecision: "exhausted",
    nextRetryAt: null,
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722414738,v1=ooo555ppp666", { type: "invoice.paid", data: { invoice: "inv_98198", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable", message: "Retry limit reached" }, null, false),
  },
]

const dlv_c3a9e047_attempts: AttemptSpec[] = [
  {
    id: "att_c3a9e047_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — upstream billing worker saturated",
    latencyMs: 4700,
    startedAt: "2026-07-31T04:19:05Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T04:45:05Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "subscription.updated", "t=1722400745,v1=qqq777rrr888", { type: "subscription.updated", data: { subscription: "sub_55710", plan: "commuter_plus", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_c3a9e047_2",
    attemptNumber: 2,
    outcome: "outcome_unknown",
    httpStatusCode: null,
    observedFailureCategory: "timeout",
    responseSummary: "No response within 10 s — connection timed out",
    latencyMs: 10000,
    startedAt: "2026-07-31T04:45:05Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T05:15:05Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "subscription.updated", "t=1722402305,v1=sss999ttt000", { type: "subscription.updated", data: { subscription: "sub_55710", plan: "commuter_plus", customer: REDACTED } }),
    response: makeResponse(null, {}, null, "No response within 10 s — connection timed out. The receiver may have processed the request, but no conclusive response was recorded.", true),
  },
  {
    id: "att_c3a9e047_3",
    attemptNumber: 3,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — retry-after 300",
    latencyMs: 4900,
    startedAt: "2026-07-31T05:15:05Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T05:45:05Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "subscription.updated", "t=1722404105,v1=uuu111vvv222", { type: "subscription.updated", data: { subscription: "sub_55710", plan: "commuter_plus", customer: REDACTED } }),
    response: makeResponse(503, { "content-type": "application/json", "retry-after": "300" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_c3a9e047_4",
    attemptNumber: 4,
    outcome: "outcome_unknown",
    httpStatusCode: null,
    observedFailureCategory: "connection_terminated",
    responseSummary: "Connection terminated before response — final acceptance uncertain",
    latencyMs: 3200,
    startedAt: "2026-07-31T05:45:05Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:02:44Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "subscription.updated", "t=1722405905,v1=www333xxx444", { type: "subscription.updated", data: { subscription: "sub_55710", plan: "commuter_plus", customer: REDACTED } }),
    response: makeResponse(null, {}, null, "Connection terminated before a response was received. The receiver may have processed the request, but no conclusive response was recorded.", true),
  },
  {
    id: "att_c3a9e047_5",
    attemptNumber: 5,
    outcome: "outcome_unknown",
    httpStatusCode: null,
    observedFailureCategory: "connection_terminated",
    responseSummary: "Connection terminated before response — no conclusive outcome recorded",
    latencyMs: 2800,
    startedAt: "2026-07-31T06:02:44Z",
    retryDecision: "no_retry",
    nextRetryAt: null,
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "subscription.updated", "t=1722406964,v1=yyy555zzz666", { type: "subscription.updated", data: { subscription: "sub_55710", plan: "commuter_plus", customer: REDACTED } }),
    response: makeResponse(null, {}, null, "Connection terminated before a response was received. No further retries are scheduled; the receiver's final acceptance could not be confirmed.", true),
  },
]

// HTTP 429 followed by success — distinct event from dlv_a1f8c204
const dlv_h9f2a103_attempts: AttemptSpec[] = [
  {
    id: "att_h9f2a103_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 429,
    observedFailureCategory: "http_429",
    responseSummary: "429 Too Many Requests — rate limit exceeded, retry-after 60",
    latencyMs: 120,
    startedAt: "2026-07-31T06:10:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:11:00Z",
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722402600,v1=bbb222ccc333", { type: "invoice.paid", data: { invoice: "inv_98330", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(429, { "content-type": "application/json", "retry-after": "60" }, { error: "rate_limited", message: "Too many requests" }, null, false),
  },
  {
    id: "att_h9f2a103_2",
    attemptNumber: 2,
    outcome: "success",
    httpStatusCode: 200,
    observedFailureCategory: null,
    responseSummary: "200 OK — acknowledged in 180 ms",
    latencyMs: 180,
    startedAt: "2026-07-31T06:11:00Z",
    retryDecision: "succeeded",
    nextRetryAt: null,
    request: makeRequest("ep_billing_sync", "production", "application/json", "2024-03-01", "invoice.paid", "t=1722402660,v1=ddd444eee555", { type: "invoice.paid", data: { invoice: "inv_98330", amount: 18900, currency: "eur", customer: REDACTED } }),
    response: makeResponse(200, { "content-type": "application/json" }, { ok: true, acknowledged: true }, null, false),
  },
]

// ---- Production — Order Lifecycle ----

const dlv_d5c0f318_attempts: AttemptSpec[] = [
  {
    id: "att_d5c0f318_1",
    attemptNumber: 1,
    outcome: "success",
    httpStatusCode: 200,
    observedFailureCategory: null,
    responseSummary: "200 OK — acknowledged in 212 ms",
    latencyMs: 212,
    startedAt: "2026-07-31T07:03:31Z",
    retryDecision: "succeeded",
    nextRetryAt: null,
    request: makeRequest("ep_order_lifecycle", "production", "application/json", "2024-03-01", "order.created", "t=1722409411,v1=fff666ggg777", { type: "order.created", data: { order: "ord_77120", items: 1, product: "day_pass_bundle", customer: REDACTED } }),
    response: makeResponse(200, { "content-type": "application/json" }, { ok: true, orderId: "ord_77120" }, null, false),
  },
]

// dlv_j1a3b502: order.cancelled event, distinct from dlv_d5c0f318's order.created
const dlv_j1a3b502_attempts: AttemptSpec[] = [
  {
    id: "att_j1a3b502_1",
    attemptNumber: 1,
    outcome: "success",
    httpStatusCode: 200,
    observedFailureCategory: null,
    responseSummary: "200 OK — acknowledged in 145 ms",
    latencyMs: 145,
    startedAt: "2026-07-31T06:48:22Z",
    retryDecision: "succeeded",
    nextRetryAt: null,
    request: makeRequest("ep_order_lifecycle", "production", "application/json", "2024-03-01", "order.cancelled", "t=1722403702,v1=hhh888iii999", { type: "order.cancelled", data: { order: "ord_77105", reason: "customer_request", customer: REDACTED } }),
    response: makeResponse(200, { "content-type": "application/json" }, { ok: true }, null, false),
  },
]

// ---- Production — Customer Updates ----

// dlv_k2b4c615: recent customer.updated event with temporally credible timestamps
const dlv_k2b4c615_attempts: AttemptSpec[] = [
  {
    id: "att_k2b4c615_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 503,
    observedFailureCategory: "http_503",
    responseSummary: "503 Service Unavailable — CRM ingestion temporarily unavailable",
    latencyMs: 3200,
    startedAt: "2026-07-31T05:30:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T05:55:00Z",
    request: makeRequest("ep_customer_updates", "production", "application/json", "2024-03-01", "customer.updated", "t=1722402600,v1=jjj000kkk111", { type: "customer.updated", data: { customer: REDACTED, updatedFields: ["email", "phone"] } }),
    response: makeResponse(503, { "content-type": "application/json" }, { error: "service_unavailable" }, null, false),
  },
  {
    id: "att_k2b4c615_2",
    attemptNumber: 2,
    outcome: "success",
    httpStatusCode: 200,
    observedFailureCategory: null,
    responseSummary: "200 OK — acknowledged in 310 ms",
    latencyMs: 310,
    startedAt: "2026-07-31T05:55:00Z",
    retryDecision: "succeeded",
    nextRetryAt: null,
    request: makeRequest("ep_customer_updates", "production", "application/json", "2024-03-01", "customer.updated", "t=1722404100,v1=lll222mmm333", { type: "customer.updated", data: { customer: REDACTED, updatedFields: ["email", "phone"] } }),
    response: makeResponse(200, { "content-type": "application/json" }, { ok: true }, null, false),
  },
]

// ---- Sandbox — Local Development ----

// dlv_g6e1c750: exhausted at 8/8 (canonical retry limit from endpoint config)
const dlv_g6e1c750_attempts: AttemptSpec[] = [
  {
    id: "att_g6e1c750_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 85,
    startedAt: "2026-07-31T06:30:17Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:35:17Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722411017,v1=nnn444ooo555", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_2",
    attemptNumber: 2,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 92,
    startedAt: "2026-07-31T06:35:17Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:41:17Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722411317,v1=ppp666qqq777", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_3",
    attemptNumber: 3,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 88,
    startedAt: "2026-07-31T06:41:17Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:48:33Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722411677,v1=rrr888sss999", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_4",
    attemptNumber: 4,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 95,
    startedAt: "2026-07-31T06:48:33Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T06:58:33Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722412113,v1=ttt000uuu111", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_5",
    attemptNumber: 5,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 83,
    startedAt: "2026-07-31T06:58:33Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:10:33Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722413913,v1=vvv222www333", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_6",
    attemptNumber: 6,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 90,
    startedAt: "2026-07-31T07:10:33Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:25:33Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722414633,v1=xxx444yyy555", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_7",
    attemptNumber: 7,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 87,
    startedAt: "2026-07-31T07:25:33Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:43:33Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722415533,v1=zzz666aaa777", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_g6e1c750_8",
    attemptNumber: 8,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — retries exhausted",
    latencyMs: 91,
    startedAt: "2026-07-31T07:43:33Z",
    retryDecision: "exhausted",
    nextRetryAt: null,
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "invoice.paid", "t=1722416613,v1=bbb888ccc999", { type: "invoice.paid", data: { invoice: "inv_test_1042", amount: 100, currency: "eur", customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
]

// dlv_m8d2f941: Retrying example with HTTP 401 (coherent, not falsely exhausted)
const dlv_m8d2f941_attempts: AttemptSpec[] = [
  {
    id: "att_m8d2f941_1",
    attemptNumber: 1,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 78,
    startedAt: "2026-07-31T06:55:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:00:00Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "order.created", "t=1722407700,v1=ddd222eee333", { type: "order.created", data: { order: "ord_test_882", items: 2, customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_m8d2f941_2",
    attemptNumber: 2,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 81,
    startedAt: "2026-07-31T07:00:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T07:08:00Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "order.created", "t=1722408000,v1=fff444ggg555", { type: "order.created", data: { order: "ord_test_882", items: 2, customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
  {
    id: "att_m8d2f941_3",
    attemptNumber: 3,
    outcome: "confirmed_failure",
    httpStatusCode: 401,
    observedFailureCategory: "http_401",
    responseSummary: "401 Unauthorized — webhook signature verification failed",
    latencyMs: 79,
    startedAt: "2026-07-31T07:08:00Z",
    retryDecision: "retry",
    nextRetryAt: "2026-07-31T08:45:00Z",
    request: makeRequest("ep_local_dev", "sandbox", "application/json", "2024-03-01", "order.created", "t=1722408480,v1=hhh666iii777", { type: "order.created", data: { order: "ord_test_882", items: 2, customer: REDACTED } }),
    response: makeResponse(401, { "content-type": "application/json" }, { error: "invalid_signature", message: "Webhook signature verification failed" }, null, false),
  },
]

// ---- Delivery specs ----

const deliverySpecs: DeliverySpec[] = [
  // Production — Billing Sync
  {
    id: "dlv_a1f8c204",
    eventId: "evt_inv_paid_98214",
    endpointId: "ep_billing_sync",
    environment: "production",
    state: "retrying",
    eventType: "invoice.paid",
    succeededAfterRetry: false,
    attempts: dlv_a1f8c204_attempts,
  },
  {
    id: "dlv_h9f2a103",
    eventId: "evt_inv_paid_98330",
    endpointId: "ep_billing_sync",
    environment: "production",
    state: "delivered",
    eventType: "invoice.paid",
    succeededAfterRetry: true,
    attempts: dlv_h9f2a103_attempts,
  },
  {
    id: "dlv_b7e2d911",
    eventId: "evt_inv_paid_98198",
    endpointId: "ep_billing_sync",
    environment: "production",
    state: "exhausted",
    eventType: "invoice.paid",
    succeededAfterRetry: false,
    attempts: dlv_b7e2d911_attempts,
  },
  {
    id: "dlv_c3a9e047",
    eventId: "evt_sub_upd_55710",
    endpointId: "ep_billing_sync",
    environment: "production",
    state: "unknown",
    eventType: "subscription.updated",
    succeededAfterRetry: false,
    attempts: dlv_c3a9e047_attempts,
  },
  // Production — Order Lifecycle
  {
    id: "dlv_d5c0f318",
    eventId: "evt_order_created_77120",
    endpointId: "ep_order_lifecycle",
    environment: "production",
    state: "delivered",
    eventType: "order.created",
    succeededAfterRetry: false,
    attempts: dlv_d5c0f318_attempts,
  },
  {
    id: "dlv_j1a3b502",
    eventId: "evt_order_cancelled_77105",
    endpointId: "ep_order_lifecycle",
    environment: "production",
    state: "delivered",
    eventType: "order.cancelled",
    succeededAfterRetry: false,
    attempts: dlv_j1a3b502_attempts,
  },
  // Production — Customer Updates
  {
    id: "dlv_k2b4c615",
    eventId: "evt_cust_upd_31045",
    endpointId: "ep_customer_updates",
    environment: "production",
    state: "delivered",
    eventType: "customer.updated",
    succeededAfterRetry: true,
    attempts: dlv_k2b4c615_attempts,
  },
  // Sandbox — Local Development
  {
    id: "dlv_g6e1c750",
    eventId: "evt_sbx_inv_paid_1042",
    endpointId: "ep_local_dev",
    environment: "sandbox",
    state: "exhausted",
    eventType: "invoice.paid",
    succeededAfterRetry: false,
    attempts: dlv_g6e1c750_attempts,
  },
  {
    id: "dlv_m8d2f941",
    eventId: "evt_sbx_order_created_882",
    endpointId: "ep_local_dev",
    environment: "sandbox",
    state: "retrying",
    eventType: "order.created",
    succeededAfterRetry: false,
    attempts: dlv_m8d2f941_attempts,
  },
]

// ---- Build records ----

const deliveryRecords: DeliveryRecord[] = deliverySpecs.map(buildDeliveryRecord)

const MAX_RECENT = 25

export function listDeliveries(
  environment: Environment,
  filters: DeliveryFilters
): DeliveryListResult {
  const timeRangeMs: Record<DeliveryTimeRange, number> = {
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  }

  // Use the latest fixture timestamp as "now" so records stay within range
  const now = new Date("2026-07-31T08:30:00Z").getTime()
  const cutoff = now - timeRangeMs[filters.timeRange]

  let filtered = deliveryRecords.filter((d) => {
    if (d.environment !== environment) return false
    if (new Date(d.lastAttemptAt).getTime() < cutoff) return false
    if (filters.endpointId && d.endpointId !== filters.endpointId) return false
    if (filters.eventType && d.eventType !== filters.eventType) return false
    if (filters.state !== "all" && d.state !== filters.state) return false
    if (
      filters.failureCategory &&
      !d.observedCategories.includes(filters.failureCategory)
    )
      return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!d.id.toLowerCase().includes(q) && !d.eventId.toLowerCase().includes(q))
        return false
    }
    return true
  })

  // Sort by latest activity descending
  filtered = [...filtered].sort((a, b) =>
    b.lastAttemptAt.localeCompare(a.lastAttemptAt)
  )

  const totalMatching = filtered.length
  const capped = filtered.slice(0, MAX_RECENT)
  return {
    records: capped,
    loadedCount: capped.length,
    hasMore: totalMatching > MAX_RECENT,
    totalMatching,
  }
}

export function getDeliveryDetail(
  environment: Environment,
  deliveryId: string
): DeliveryDetailAggregate | null {
  const spec = deliverySpecs.find((s) => s.id === deliveryId && s.environment === environment)
  if (!spec) return null

  const record = buildDeliveryRecord(spec)
  const attempts = spec.attempts.map((a) => buildAttemptRecord(spec.id, a))

  const event = events.find((e) => e.id === spec.eventId && e.environment === environment) ?? null
  const endpoint = endpoints.find((e) => e.id === spec.endpointId && e.environment === environment) ?? null

  const eventContext: DeliveryEventContext | null = event
    ? {
        eventId: event.id,
        eventType: event.type,
        resourceId: event.resourceId,
        payloadState: event.payloadState,
        payloadSummary: event.payloadSummary,
        occurredAt: event.occurredAt,
      }
    : null

  const endpointContext: DeliveryEndpointContext | null = endpoint
    ? {
        endpointId: endpoint.id,
        name: endpoint.name,
        maskedUrl: endpoint.maskedUrl,
        environment: endpoint.environment,
      }
    : null

  return {
    delivery: record,
    event: eventContext,
    endpoint: endpointContext,
    environment,
    attempts,
  }
}

export function getDeliveryAssessmentFacts(
  environment: Environment,
  deliveryId: string
): DeliveryAssessmentFacts | null {
  const spec = deliverySpecs.find((s) => s.id === deliveryId && s.environment === environment)
  if (!spec) return null

  const record = buildDeliveryRecord(spec)
  const attempts = spec.attempts.map((a) => buildAttemptRecord(spec.id, a))

  const event = events.find((e) => e.id === spec.eventId && e.environment === environment) ?? null
  const endpoint = endpoints.find((e) => e.id === spec.endpointId && e.environment === environment) ?? null

  const eventContext: DeliveryEventContext | null = event
    ? {
        eventId: event.id,
        eventType: event.type,
        resourceId: event.resourceId,
        payloadState: event.payloadState,
        payloadSummary: event.payloadSummary,
        occurredAt: event.occurredAt,
      }
    : null

  const endpointContext: DeliveryEndpointContext | null = endpoint
    ? {
        endpointId: endpoint.id,
        name: endpoint.name,
        maskedUrl: endpoint.maskedUrl,
        environment: endpoint.environment,
      }
    : null

  return {
    delivery: record,
    attempts,
    event: eventContext,
    endpoint: endpointContext,
    endpointStatus: endpoint?.status ?? null,
    endpointRetryMaxAttempts: endpoint?.retryMaxAttempts ?? null,
  }
}

export function getDeliveryStateFilterOptions(): { value: DeliveryStateFilter; label: string }[] {
  return [
    { value: "all", label: "All states" },
    { value: "delivered", label: "Delivered" },
    { value: "retrying", label: "Retrying" },
    { value: "exhausted", label: "Exhausted" },
    { value: "unknown", label: "Outcome unknown" },
  ]
}

export function getDeliveryEndpointOptions(
  environment: Environment
): { id: string; name: string }[] {
  return endpoints
    .filter((e) => e.environment === environment && e.status !== "disabled")
    .map((e) => ({ id: e.id, name: e.name }))
}
