import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCount, formatLatency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DeliveryMetricSummary } from "@/types"

type MetricScope = "environment" | "endpoint"

interface MetricDef {
  key: string
  label: string
  definition: string | Record<MetricScope, string>
  value: (m: DeliveryMetricSummary) => string
  sub?: (m: DeliveryMetricSummary) => string | null
  tone?: (m: DeliveryMetricSummary) => "danger" | "warning" | null
  scopes?: MetricScope[]
}

function definitionFor(def: MetricDef, scope: MetricScope): string {
  if (typeof def.definition === "string") return def.definition
  return def.definition[scope]
}

const metricDefs: MetricDef[] = [
  {
    key: "events",
    label: "Events received",
    definition:
      "Logical webhook events Helio recorded in the selected range. One event can produce multiple delivery attempts.",
    value: (m) => formatCount(m.eventsReceived),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "attempts",
    label: "Delivery attempts",
    definition:
      "Individual HTTP delivery attempts, including retries. Higher than events received when deliveries are retried.",
    value: (m) => formatCount(m.deliveryAttempts),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "succeeded",
    label: "Successful attempts",
    definition:
      "Delivery attempts that received a confirmed success response in the selected range.",
    value: (m) => formatCount(m.deliveriesSucceeded),
    scopes: ["endpoint"],
  },
  {
    key: "unsuccessful",
    label: "Unsuccessful attempts",
    definition:
      "Delivery attempts that did not receive a confirmed success response. Includes confirmed failures and attempts with an unconfirmed (unknown) outcome after timeout; not every unsuccessful attempt is a lost delivery.",
    value: (m) => formatCount(m.unsuccessfulAttempts),
    sub: (m) =>
      m.unknownOutcomes > 0
        ? `${formatCount(m.unknownOutcomes)} unconfirmed after timeout`
        : null,
    tone: (m) => (m.unsuccessfulAttempts > 0 ? "danger" : null),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "exhausted",
    label: "Exhausted deliveries",
    definition:
      "Deliveries that used every automatic retry without a confirmed success in the selected range.",
    value: (m) => formatCount(m.exhaustedDeliveries),
    tone: (m) => (m.exhaustedDeliveries > 0 ? "warning" : null),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "backlog",
    label: "Retry backlog",
    definition:
      "Deliveries currently queued for automatic retry. This is a present-moment queue depth, not a windowed count.",
    value: (m) => formatCount(m.retryBacklog),
    tone: (m) => (m.retryBacklog > 0 ? "warning" : null),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "rate",
    label: "Success rate",
    definition: {
      environment:
        "Successful delivery attempts divided by all delivery attempts in the selected range, weighted across active endpoints.",
      endpoint:
        "Successful delivery attempts divided by all delivery attempts for this endpoint in the selected range.",
    },
    value: (m) => formatPercent(m.successRatePct),
    scopes: ["environment", "endpoint"],
  },
  {
    key: "p95",
    label: "p95 latency",
    definition: {
      environment:
        "95% of delivery attempts in the selected range completed within this time, measured across active endpoints.",
      endpoint:
        "95% of delivery attempts for this endpoint in the selected range completed within this time.",
    },
    value: (m) => formatLatency(m.p95LatencyMs),
    scopes: ["environment", "endpoint"],
  },
]

interface MetricStripProps {
  metrics: DeliveryMetricSummary
  scope?: MetricScope
}

export function MetricStrip({ metrics, scope = "environment" }: MetricStripProps) {
  const defs = metricDefs.filter((d) => !d.scopes || d.scopes.includes(scope))
  const colClass =
    scope === "endpoint"
      ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-8"
      : "grid-cols-2 sm:grid-cols-4 xl:grid-cols-7"

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <dl aria-label="Delivery metrics" className={`-mt-px -ml-px grid ${colClass}`}>
        {defs.map((def) => {
          const tone = def.tone?.(metrics) ?? null
          const sub = def.sub?.(metrics) ?? null
          return (
            <div
              key={def.key}
              className="flex flex-col gap-0.5 border-t border-l border-border px-3 py-2.5"
            >
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate">{def.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`What does ${def.label} mean?`}
                      className="focus-visible:ring-ring/50 shrink-0 rounded-sm text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px]"
                    >
                      <Info aria-hidden="true" className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">{definitionFor(def, scope)}</TooltipContent>
                </Tooltip>
              </dt>
              <dd
                className={cn(
                  "font-mono text-base font-semibold tabular-nums",
                  tone === "danger"
                    ? "text-destructive"
                    : tone === "warning"
                      ? "text-warning"
                      : "text-foreground"
                )}
              >
                {def.value(metrics)}
              </dd>
              {sub && <dd className="text-[11px] text-muted-foreground">{sub}</dd>}
            </div>
          )
        })}
      </dl>
    </div>
  )
}
