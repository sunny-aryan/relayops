import type {
  DeliveryMetricCounts,
  DeliveryTrendBucket,
  Environment,
  OverviewTimeRange,
} from "@/types"

// Canonical per-endpoint telemetry, keyed by endpointId then timeRange.
// The Overview page derives its endpoint snapshots from this data; the
// endpoint detail page and inventory read directly from here. The delivery
// records in fixtures.ts are a representative sample, not the full population
// behind these counts.
export interface EndpointTelemetryFixture {
  counts: DeliveryMetricCounts
  trend: DeliveryTrendBucket[]
  lastActivityAt: string | null
}

type EndpointTelemetry = Record<OverviewTimeRange, EndpointTelemetryFixture>

// --- Production: Order Lifecycle (healthy, stable) ---
const orderLifecycle: EndpointTelemetry = {
  "6h": {
    counts: {
      eventsReceived: 1610,
      deliveryAttempts: 1610,
      deliveriesSucceeded: 1609,
      exhaustedDeliveries: 0,
      unknownOutcomes: 0,
      retryBacklog: 0,
      p95LatencyMs: 275,
    },
    trend: [
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 192, unsuccessful: 0 },
      { bucketStart: "2026-07-31T03:00:00Z", label: "03:00", succeeded: 194, unsuccessful: 0 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 261, unsuccessful: 0 },
      { bucketStart: "2026-07-31T05:00:00Z", label: "05:00", succeeded: 310, unsuccessful: 0 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 316, unsuccessful: 0 },
      { bucketStart: "2026-07-31T07:00:00Z", label: "07:00", succeeded: 336, unsuccessful: 1 },
    ],
    lastActivityAt: "2026-07-31T07:58:41Z",
  },
  "24h": {
    counts: {
      eventsReceived: 7150,
      deliveryAttempts: 7150,
      deliveriesSucceeded: 7147,
      exhaustedDeliveries: 1,
      unknownOutcomes: 0,
      retryBacklog: 0,
      p95LatencyMs: 280,
    },
    trend: [
      { bucketStart: "2026-07-30T08:00:00Z", label: "08:00", succeeded: 661, unsuccessful: 0 },
      { bucketStart: "2026-07-30T10:00:00Z", label: "10:00", succeeded: 680, unsuccessful: 0 },
      { bucketStart: "2026-07-30T12:00:00Z", label: "12:00", succeeded: 665, unsuccessful: 0 },
      { bucketStart: "2026-07-30T14:00:00Z", label: "14:00", succeeded: 653, unsuccessful: 0 },
      { bucketStart: "2026-07-30T16:00:00Z", label: "16:00", succeeded: 627, unsuccessful: 0 },
      { bucketStart: "2026-07-30T18:00:00Z", label: "18:00", succeeded: 615, unsuccessful: 0 },
      { bucketStart: "2026-07-30T20:00:00Z", label: "20:00", succeeded: 550, unsuccessful: 0 },
      { bucketStart: "2026-07-30T22:00:00Z", label: "22:00", succeeded: 469, unsuccessful: 0 },
      { bucketStart: "2026-07-31T00:00:00Z", label: "00:00", succeeded: 417, unsuccessful: 0 },
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 432, unsuccessful: 0 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 639, unsuccessful: 1 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 739, unsuccessful: 2 },
    ],
    lastActivityAt: "2026-07-31T07:58:41Z",
  },
  "7d": {
    counts: {
      eventsReceived: 49850,
      deliveryAttempts: 49850,
      deliveriesSucceeded: 49828,
      exhaustedDeliveries: 11,
      unknownOutcomes: 2,
      retryBacklog: 0,
      p95LatencyMs: 285,
    },
    trend: [
      { bucketStart: "2026-07-24T08:00:00Z", label: "Jul 24", succeeded: 7175, unsuccessful: 2 },
      { bucketStart: "2026-07-25T08:00:00Z", label: "Jul 25", succeeded: 7242, unsuccessful: 2 },
      { bucketStart: "2026-07-26T08:00:00Z", label: "Jul 26", succeeded: 7069, unsuccessful: 2 },
      { bucketStart: "2026-07-27T08:00:00Z", label: "Jul 27", succeeded: 6959, unsuccessful: 4 },
      { bucketStart: "2026-07-28T08:00:00Z", label: "Jul 28", succeeded: 7131, unsuccessful: 2 },
      { bucketStart: "2026-07-29T08:00:00Z", label: "Jul 29", succeeded: 7101, unsuccessful: 3 },
      { bucketStart: "2026-07-30T08:00:00Z", label: "Jul 30", succeeded: 7151, unsuccessful: 7 },
    ],
    lastActivityAt: "2026-07-31T07:58:41Z",
  },
}

// --- Production: Billing Sync (degraded, worsening recently) ---
const billingSync: EndpointTelemetry = {
  "6h": {
    counts: {
      eventsReceived: 1415,
      deliveryAttempts: 1415,
      deliveriesSucceeded: 1312,
      exhaustedDeliveries: 4,
      unknownOutcomes: 2,
      retryBacklog: 43,
      p95LatencyMs: 6300,
    },
    trend: [
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 156, unsuccessful: 2 },
      { bucketStart: "2026-07-31T03:00:00Z", label: "03:00", succeeded: 158, unsuccessful: 4 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 213, unsuccessful: 17 },
      { bucketStart: "2026-07-31T05:00:00Z", label: "05:00", succeeded: 253, unsuccessful: 25 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 257, unsuccessful: 25 },
      { bucketStart: "2026-07-31T07:00:00Z", label: "07:00", succeeded: 275, unsuccessful: 30 },
    ],
    lastActivityAt: "2026-07-31T07:52:18Z",
  },
  "24h": {
    counts: {
      eventsReceived: 5500,
      deliveryAttempts: 5500,
      deliveriesSucceeded: 5381,
      exhaustedDeliveries: 6,
      unknownOutcomes: 3,
      retryBacklog: 43,
      p95LatencyMs: 5100,
    },
    trend: [
      { bucketStart: "2026-07-30T08:00:00Z", label: "08:00", succeeded: 497, unsuccessful: 2 },
      { bucketStart: "2026-07-30T10:00:00Z", label: "10:00", succeeded: 512, unsuccessful: 3 },
      { bucketStart: "2026-07-30T12:00:00Z", label: "12:00", succeeded: 501, unsuccessful: 2 },
      { bucketStart: "2026-07-30T14:00:00Z", label: "14:00", succeeded: 492, unsuccessful: 3 },
      { bucketStart: "2026-07-30T16:00:00Z", label: "16:00", succeeded: 472, unsuccessful: 2 },
      { bucketStart: "2026-07-30T18:00:00Z", label: "18:00", succeeded: 463, unsuccessful: 3 },
      { bucketStart: "2026-07-30T20:00:00Z", label: "20:00", succeeded: 414, unsuccessful: 2 },
      { bucketStart: "2026-07-30T22:00:00Z", label: "22:00", succeeded: 353, unsuccessful: 3 },
      { bucketStart: "2026-07-31T00:00:00Z", label: "00:00", succeeded: 314, unsuccessful: 2 },
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 325, unsuccessful: 5 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 481, unsuccessful: 40 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 557, unsuccessful: 52 },
    ],
    lastActivityAt: "2026-07-31T07:52:18Z",
  },
  "7d": {
    counts: {
      eventsReceived: 37980,
      deliveryAttempts: 37980,
      deliveriesSucceeded: 37638,
      exhaustedDeliveries: 12,
      unknownOutcomes: 3,
      retryBacklog: 43,
      p95LatencyMs: 3400,
    },
    trend: [
      { bucketStart: "2026-07-24T08:00:00Z", label: "Jul 24", succeeded: 5419, unsuccessful: 32 },
      { bucketStart: "2026-07-25T08:00:00Z", label: "Jul 25", succeeded: 5470, unsuccessful: 34 },
      { bucketStart: "2026-07-26T08:00:00Z", label: "Jul 26", succeeded: 5340, unsuccessful: 30 },
      { bucketStart: "2026-07-27T08:00:00Z", label: "Jul 27", succeeded: 5257, unsuccessful: 65 },
      { bucketStart: "2026-07-28T08:00:00Z", label: "Jul 28", succeeded: 5387, unsuccessful: 35 },
      { bucketStart: "2026-07-29T08:00:00Z", label: "Jul 29", succeeded: 5363, unsuccessful: 38 },
      { bucketStart: "2026-07-30T08:00:00Z", label: "Jul 30", succeeded: 5402, unsuccessful: 108 },
    ],
    lastActivityAt: "2026-07-31T07:52:18Z",
  },
}

// --- Production: Customer Updates (healthy, stable) ---
const customerUpdates: EndpointTelemetry = {
  "6h": {
    counts: {
      eventsReceived: 843,
      deliveryAttempts: 843,
      deliveriesSucceeded: 841,
      exhaustedDeliveries: 2,
      unknownOutcomes: 0,
      retryBacklog: 2,
      p95LatencyMs: 655,
    },
    trend: [
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 100, unsuccessful: 0 },
      { bucketStart: "2026-07-31T03:00:00Z", label: "03:00", succeeded: 102, unsuccessful: 0 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 136, unsuccessful: 1 },
      { bucketStart: "2026-07-31T05:00:00Z", label: "05:00", succeeded: 162, unsuccessful: 1 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 165, unsuccessful: 0 },
      { bucketStart: "2026-07-31T07:00:00Z", label: "07:00", succeeded: 176, unsuccessful: 0 },
    ],
    lastActivityAt: "2026-07-31T07:44:09Z",
  },
  "24h": {
    counts: {
      eventsReceived: 2410,
      deliveryAttempts: 2410,
      deliveriesSucceeded: 2403,
      exhaustedDeliveries: 2,
      unknownOutcomes: 0,
      retryBacklog: 2,
      p95LatencyMs: 640,
    },
    trend: [
      { bucketStart: "2026-07-30T08:00:00Z", label: "08:00", succeeded: 222, unsuccessful: 0 },
      { bucketStart: "2026-07-30T10:00:00Z", label: "10:00", succeeded: 228, unsuccessful: 0 },
      { bucketStart: "2026-07-30T12:00:00Z", label: "12:00", succeeded: 224, unsuccessful: 0 },
      { bucketStart: "2026-07-30T14:00:00Z", label: "14:00", succeeded: 220, unsuccessful: 0 },
      { bucketStart: "2026-07-30T16:00:00Z", label: "16:00", succeeded: 211, unsuccessful: 0 },
      { bucketStart: "2026-07-30T18:00:00Z", label: "18:00", succeeded: 207, unsuccessful: 0 },
      { bucketStart: "2026-07-30T20:00:00Z", label: "20:00", succeeded: 186, unsuccessful: 0 },
      { bucketStart: "2026-07-30T22:00:00Z", label: "22:00", succeeded: 158, unsuccessful: 0 },
      { bucketStart: "2026-07-31T00:00:00Z", label: "00:00", succeeded: 139, unsuccessful: 0 },
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 145, unsuccessful: 1 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 215, unsuccessful: 3 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 248, unsuccessful: 3 },
    ],
    lastActivityAt: "2026-07-31T07:44:09Z",
  },
  "7d": {
    counts: {
      eventsReceived: 16615,
      deliveryAttempts: 16615,
      deliveriesSucceeded: 16570,
      exhaustedDeliveries: 8,
      unknownOutcomes: 0,
      retryBacklog: 2,
      p95LatencyMs: 630,
    },
    trend: [
      { bucketStart: "2026-07-24T08:00:00Z", label: "Jul 24", succeeded: 2386, unsuccessful: 4 },
      { bucketStart: "2026-07-25T08:00:00Z", label: "Jul 25", succeeded: 2408, unsuccessful: 5 },
      { bucketStart: "2026-07-26T08:00:00Z", label: "Jul 26", succeeded: 2351, unsuccessful: 4 },
      { bucketStart: "2026-07-27T08:00:00Z", label: "Jul 27", succeeded: 2314, unsuccessful: 9 },
      { bucketStart: "2026-07-28T08:00:00Z", label: "Jul 28", succeeded: 2372, unsuccessful: 5 },
      { bucketStart: "2026-07-29T08:00:00Z", label: "Jul 29", succeeded: 2361, unsuccessful: 4 },
      { bucketStart: "2026-07-30T08:00:00Z", label: "Jul 30", succeeded: 2378, unsuccessful: 14 },
    ],
    lastActivityAt: "2026-07-31T07:44:09Z",
  },
}

// --- Sandbox: Local Development (failing, persistent 401s) ---
const localDev: EndpointTelemetry = {
  "6h": {
    counts: {
      eventsReceived: 96,
      deliveryAttempts: 128,
      deliveriesSucceeded: 92,
      exhaustedDeliveries: 6,
      unknownOutcomes: 0,
      retryBacklog: 7,
      p95LatencyMs: 4950,
    },
    trend: [
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 6, unsuccessful: 4 },
      { bucketStart: "2026-07-31T03:00:00Z", label: "03:00", succeeded: 8, unsuccessful: 5 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 24, unsuccessful: 9 },
      { bucketStart: "2026-07-31T05:00:00Z", label: "05:00", succeeded: 28, unsuccessful: 10 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 12, unsuccessful: 4 },
      { bucketStart: "2026-07-31T07:00:00Z", label: "07:00", succeeded: 14, unsuccessful: 4 },
    ],
    lastActivityAt: "2026-07-31T07:48:33Z",
  },
  "24h": {
    counts: {
      eventsReceived: 430,
      deliveryAttempts: 500,
      deliveriesSucceeded: 362,
      exhaustedDeliveries: 21,
      unknownOutcomes: 0,
      retryBacklog: 7,
      p95LatencyMs: 4800,
    },
    trend: [
      { bucketStart: "2026-07-30T08:00:00Z", label: "08:00", succeeded: 34, unsuccessful: 9 },
      { bucketStart: "2026-07-30T10:00:00Z", label: "10:00", succeeded: 40, unsuccessful: 12 },
      { bucketStart: "2026-07-30T12:00:00Z", label: "12:00", succeeded: 36, unsuccessful: 13 },
      { bucketStart: "2026-07-30T14:00:00Z", label: "14:00", succeeded: 31, unsuccessful: 11 },
      { bucketStart: "2026-07-30T16:00:00Z", label: "16:00", succeeded: 28, unsuccessful: 12 },
      { bucketStart: "2026-07-30T18:00:00Z", label: "18:00", succeeded: 25, unsuccessful: 10 },
      { bucketStart: "2026-07-30T20:00:00Z", label: "20:00", succeeded: 18, unsuccessful: 9 },
      { bucketStart: "2026-07-30T22:00:00Z", label: "22:00", succeeded: 12, unsuccessful: 8 },
      { bucketStart: "2026-07-31T00:00:00Z", label: "00:00", succeeded: 10, unsuccessful: 7 },
      { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 14, unsuccessful: 9 },
      { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 52, unsuccessful: 19 },
      { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 62, unsuccessful: 19 },
    ],
    lastActivityAt: "2026-07-31T07:48:33Z",
  },
  "7d": {
    counts: {
      eventsReceived: 2780,
      deliveryAttempts: 3150,
      deliveriesSucceeded: 2441,
      exhaustedDeliveries: 74,
      unknownOutcomes: 2,
      retryBacklog: 7,
      p95LatencyMs: 4100,
    },
    trend: [
      { bucketStart: "2026-07-24T08:00:00Z", label: "Jul 24", succeeded: 420, unsuccessful: 28 },
      { bucketStart: "2026-07-25T08:00:00Z", label: "Jul 25", succeeded: 405, unsuccessful: 25 },
      { bucketStart: "2026-07-26T08:00:00Z", label: "Jul 26", succeeded: 388, unsuccessful: 30 },
      { bucketStart: "2026-07-27T08:00:00Z", label: "Jul 27", succeeded: 372, unsuccessful: 27 },
      { bucketStart: "2026-07-28T08:00:00Z", label: "Jul 28", succeeded: 350, unsuccessful: 31 },
      { bucketStart: "2026-07-29T08:00:00Z", label: "Jul 29", succeeded: 144, unsuccessful: 430 },
      { bucketStart: "2026-07-30T08:00:00Z", label: "Jul 30", succeeded: 362, unsuccessful: 138 },
    ],
    lastActivityAt: "2026-07-31T07:48:33Z",
  },
}

// Environment-keyed so telemetry belonging to an endpoint in another
// environment cannot be treated as available. Lookup is by environment then
// endpoint ID — no endpoint-ID string parsing.
const endpointTelemetryByEnv: Record<Environment, Record<string, EndpointTelemetry>> = {
  production: {
    ep_order_lifecycle: orderLifecycle,
    ep_billing_sync: billingSync,
    ep_customer_updates: customerUpdates,
  },
  sandbox: {
    ep_local_dev: localDev,
  },
}

export function getEndpointTelemetry(
  endpointId: string,
  environment: Environment,
  timeRange: OverviewTimeRange
): EndpointTelemetryFixture | null {
  const telemetry = endpointTelemetryByEnv[environment]?.[endpointId]
  if (!telemetry) return null
  return telemetry[timeRange] ?? null
}
