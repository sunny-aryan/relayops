import { getEndpointTelemetry } from "@/data/endpoints"
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
// range. The per-endpoint operational snapshots are derived from the
// canonical endpoint telemetry in endpoints.ts, not duplicated here.
export interface OverviewTelemetryFixture {
  telemetry: TelemetrySnapshot
  counts: DeliveryMetricCounts
  trend: DeliveryTrendBucket[]
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

// The canonical endpoint IDs per environment, used to derive Overview
// endpoint snapshots from the canonical per-endpoint telemetry.
export const productionEndpointIds = ["ep_order_lifecycle", "ep_billing_sync", "ep_customer_updates"]
export const sandboxEndpointIds = ["ep_local_dev", "ep_qa_automation"]

export function getEndpointMetricSnapshot(
  endpointId: string,
  environment: Environment,
  timeRange: OverviewTimeRange
): EndpointMetricSnapshot | null {
  const fixture = getEndpointTelemetry(endpointId, environment, timeRange)
  if (!fixture) return null
  return {
    endpointId,
    deliveryAttempts: fixture.counts.deliveryAttempts,
    deliveriesSucceeded: fixture.counts.deliveriesSucceeded,
    p95LatencyMs: fixture.counts.p95LatencyMs,
    backlogCount: fixture.counts.retryBacklog,
    lastActivityAt: fixture.lastActivityAt,
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
