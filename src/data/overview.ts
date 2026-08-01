import type {
  DeliveryMetricCounts,
  DeliveryTrendBucket,
  EndpointMetricSnapshot,
  Environment,
  FailureClusterSnapshot,
  OverviewTimeRange,
  TelemetrySnapshot,
} from "@/types"

// Aggregate telemetry for the Overview page, keyed by environment and time
// range. These are window-level rollups; the delivery records in fixtures.ts
// are a small representative sample, not the full population behind these
// counts.
export interface OverviewTelemetryFixture {
  telemetry: TelemetrySnapshot
  counts: DeliveryMetricCounts
  trend: DeliveryTrendBucket[]
  endpointMetrics: EndpointMetricSnapshot[]
  clusterSnapshots: FailureClusterSnapshot[]
}

const productionTelemetry: TelemetrySnapshot = {
  state: "current",
  latestAt: "2026-07-31T08:00:00Z",
}

const sandboxTelemetry: TelemetrySnapshot = {
  state: "current",
  latestAt: "2026-07-31T07:45:00Z",
}

const productionEndpointActivity: Record<string, string> = {
  ep_order_lifecycle: "2026-07-31T07:58:41Z",
  ep_billing_sync: "2026-07-31T07:52:18Z",
  ep_customer_updates: "2026-07-31T07:44:09Z",
}

function prodEndpointMetrics(
  rows: Array<[id: string, attempts: number, succeeded: number, p95: number, backlog: number]>
): EndpointMetricSnapshot[] {
  return rows.map(([endpointId, deliveryAttempts, deliveriesSucceeded, p95LatencyMs, backlogCount]) => ({
    endpointId,
    deliveryAttempts,
    deliveriesSucceeded,
    p95LatencyMs,
    backlogCount,
    lastActivityAt: productionEndpointActivity[endpointId],
  }))
}

const qaAutomationMetrics: EndpointMetricSnapshot = {
  endpointId: "ep_qa_automation",
  deliveryAttempts: 0,
  deliveriesSucceeded: 0,
  p95LatencyMs: null,
  backlogCount: 0,
  lastActivityAt: null,
}

function localDevMetrics(
  deliveryAttempts: number,
  deliveriesSucceeded: number,
  p95LatencyMs: number
): EndpointMetricSnapshot {
  return {
    endpointId: "ep_local_dev",
    deliveryAttempts,
    deliveriesSucceeded,
    p95LatencyMs,
    backlogCount: 7,
    lastActivityAt: "2026-07-31T07:48:33Z",
  }
}

export const overviewTelemetry: Record<
  Environment,
  Record<OverviewTimeRange, OverviewTelemetryFixture>
> = {
  production: {
    "6h": {
      telemetry: productionTelemetry,
      counts: {
        eventsReceived: 3610,
        deliveryAttempts: 3868,
        deliveriesSucceeded: 3762,
        exhaustedDeliveries: 6,
        unknownOutcomes: 2,
        retryBacklog: 45,
        p95LatencyMs: 4800,
      },
      trend: [
        { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 448, unsuccessful: 2 },
        { bucketStart: "2026-07-31T03:00:00Z", label: "03:00", succeeded: 454, unsuccessful: 4 },
        { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 610, unsuccessful: 18 },
        { bucketStart: "2026-07-31T05:00:00Z", label: "05:00", succeeded: 725, unsuccessful: 26 },
        { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 738, unsuccessful: 25 },
        { bucketStart: "2026-07-31T07:00:00Z", label: "07:00", succeeded: 787, unsuccessful: 31 },
      ],
      endpointMetrics: prodEndpointMetrics([
        ["ep_order_lifecycle", 1610, 1609, 275, 0],
        ["ep_billing_sync", 1415, 1312, 6300, 43],
        ["ep_customer_updates", 843, 841, 655, 2],
      ]),
      clusterSnapshots: [
        {
          clusterId: "fc_billing_timeout",
          deliveryCount: 31,
          firstSeenAt: "2026-07-31T04:10:00Z",
          lastSeenAt: "2026-07-31T07:52:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_503",
          deliveryCount: 12,
          firstSeenAt: "2026-07-31T06:30:00Z",
          lastSeenAt: "2026-07-31T07:41:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_429",
          deliveryCount: 7,
          firstSeenAt: "2026-07-31T05:05:00Z",
          lastSeenAt: "2026-07-31T07:35:00Z",
          activity: "active",
        },
      ],
    },
    "24h": {
      telemetry: productionTelemetry,
      counts: {
        eventsReceived: 14320,
        deliveryAttempts: 15060,
        deliveriesSucceeded: 14931,
        exhaustedDeliveries: 9,
        unknownOutcomes: 3,
        retryBacklog: 45,
        p95LatencyMs: 3900,
      },
      trend: [
        { bucketStart: "2026-07-30T08:00:00Z", label: "08:00", succeeded: 1380, unsuccessful: 2 },
        { bucketStart: "2026-07-30T10:00:00Z", label: "10:00", succeeded: 1420, unsuccessful: 3 },
        { bucketStart: "2026-07-30T12:00:00Z", label: "12:00", succeeded: 1390, unsuccessful: 2 },
        { bucketStart: "2026-07-30T14:00:00Z", label: "14:00", succeeded: 1365, unsuccessful: 3 },
        { bucketStart: "2026-07-30T16:00:00Z", label: "16:00", succeeded: 1310, unsuccessful: 2 },
        { bucketStart: "2026-07-30T18:00:00Z", label: "18:00", succeeded: 1285, unsuccessful: 3 },
        { bucketStart: "2026-07-30T20:00:00Z", label: "20:00", succeeded: 1150, unsuccessful: 2 },
        { bucketStart: "2026-07-30T22:00:00Z", label: "22:00", succeeded: 980, unsuccessful: 3 },
        { bucketStart: "2026-07-31T00:00:00Z", label: "00:00", succeeded: 870, unsuccessful: 2 },
        { bucketStart: "2026-07-31T02:00:00Z", label: "02:00", succeeded: 902, unsuccessful: 6 },
        { bucketStart: "2026-07-31T04:00:00Z", label: "04:00", succeeded: 1335, unsuccessful: 44 },
        { bucketStart: "2026-07-31T06:00:00Z", label: "06:00", succeeded: 1544, unsuccessful: 57 },
      ],
      endpointMetrics: prodEndpointMetrics([
        ["ep_order_lifecycle", 7150, 7147, 280, 0],
        ["ep_billing_sync", 5500, 5381, 5100, 43],
        ["ep_customer_updates", 2410, 2403, 640, 2],
      ]),
      clusterSnapshots: [
        {
          clusterId: "fc_billing_timeout",
          deliveryCount: 31,
          firstSeenAt: "2026-07-31T04:10:00Z",
          lastSeenAt: "2026-07-31T07:52:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_503",
          deliveryCount: 12,
          firstSeenAt: "2026-07-31T06:30:00Z",
          lastSeenAt: "2026-07-31T07:41:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_429",
          deliveryCount: 7,
          firstSeenAt: "2026-07-31T05:05:00Z",
          lastSeenAt: "2026-07-31T07:35:00Z",
          activity: "active",
        },
      ],
    },
    "7d": {
      telemetry: productionTelemetry,
      counts: {
        eventsReceived: 100480,
        deliveryAttempts: 104445,
        deliveriesSucceeded: 104036,
        exhaustedDeliveries: 31,
        unknownOutcomes: 5,
        retryBacklog: 45,
        p95LatencyMs: 1850,
      },
      trend: [
        { bucketStart: "2026-07-24T08:00:00Z", label: "Jul 24", succeeded: 14980, unsuccessful: 38 },
        { bucketStart: "2026-07-25T08:00:00Z", label: "Jul 25", succeeded: 15120, unsuccessful: 41 },
        { bucketStart: "2026-07-26T08:00:00Z", label: "Jul 26", succeeded: 14760, unsuccessful: 36 },
        { bucketStart: "2026-07-27T08:00:00Z", label: "Jul 27", succeeded: 14530, unsuccessful: 78 },
        { bucketStart: "2026-07-28T08:00:00Z", label: "Jul 28", succeeded: 14890, unsuccessful: 42 },
        { bucketStart: "2026-07-29T08:00:00Z", label: "Jul 29", succeeded: 14825, unsuccessful: 45 },
        { bucketStart: "2026-07-30T08:00:00Z", label: "Jul 30", succeeded: 14931, unsuccessful: 129 },
      ],
      endpointMetrics: prodEndpointMetrics([
        ["ep_order_lifecycle", 49850, 49828, 285, 0],
        ["ep_billing_sync", 37980, 37638, 3400, 43],
        ["ep_customer_updates", 16615, 16570, 630, 2],
      ]),
      clusterSnapshots: [
        {
          clusterId: "fc_billing_timeout",
          deliveryCount: 31,
          firstSeenAt: "2026-07-31T04:10:00Z",
          lastSeenAt: "2026-07-31T07:52:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_503",
          deliveryCount: 12,
          firstSeenAt: "2026-07-31T06:30:00Z",
          lastSeenAt: "2026-07-31T07:41:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_billing_429",
          deliveryCount: 7,
          firstSeenAt: "2026-07-31T05:05:00Z",
          lastSeenAt: "2026-07-31T07:35:00Z",
          activity: "active",
        },
        {
          clusterId: "fc_orders_429",
          deliveryCount: 4,
          firstSeenAt: "2026-07-27T09:05:00Z",
          lastSeenAt: "2026-07-27T11:30:00Z",
          activity: "historical",
        },
      ],
    },
  },
  sandbox: {
    "6h": {
      telemetry: sandboxTelemetry,
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
      endpointMetrics: [localDevMetrics(128, 92, 4950), qaAutomationMetrics],
      clusterSnapshots: [
        {
          clusterId: "fc_localdev_401",
          deliveryCount: 27,
          firstSeenAt: "2026-07-31T02:15:00Z",
          lastSeenAt: "2026-07-31T07:48:33Z",
          activity: "active",
        },
        {
          clusterId: "fc_localdev_timeout",
          deliveryCount: 5,
          firstSeenAt: "2026-07-31T04:30:00Z",
          lastSeenAt: "2026-07-31T06:55:00Z",
          activity: "active",
        },
      ],
    },
    "24h": {
      telemetry: sandboxTelemetry,
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
      endpointMetrics: [localDevMetrics(500, 362, 4800), qaAutomationMetrics],
      clusterSnapshots: [
        {
          clusterId: "fc_localdev_401",
          deliveryCount: 104,
          firstSeenAt: "2026-07-30T08:12:00Z",
          lastSeenAt: "2026-07-31T07:48:33Z",
          activity: "active",
        },
        {
          clusterId: "fc_localdev_timeout",
          deliveryCount: 21,
          firstSeenAt: "2026-07-30T09:05:00Z",
          lastSeenAt: "2026-07-31T06:55:00Z",
          activity: "active",
        },
      ],
    },
    "7d": {
      telemetry: sandboxTelemetry,
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
      endpointMetrics: [localDevMetrics(3150, 2441, 4100), qaAutomationMetrics],
      clusterSnapshots: [
        {
          clusterId: "fc_localdev_401",
          deliveryCount: 428,
          firstSeenAt: "2026-07-29T15:00:00Z",
          lastSeenAt: "2026-07-31T07:48:33Z",
          activity: "active",
        },
        {
          clusterId: "fc_localdev_timeout",
          deliveryCount: 27,
          firstSeenAt: "2026-07-28T10:00:00Z",
          lastSeenAt: "2026-07-31T06:55:00Z",
          activity: "active",
        },
      ],
    },
  },
}
