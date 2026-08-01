import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatCount, formatPercent } from "@/lib/format"
import { timeRangeLabels } from "@/lib/labels"
import type { DeliveryTrendBucket, OverviewTimeRange } from "@/types"

interface TrendPoint extends DeliveryTrendBucket {
  successRatePct: number
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendPoint }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{point.label}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Succeeded</dt>
        <dd className="text-right font-mono">{formatCount(point.succeeded)}</dd>
        <dt className="text-muted-foreground">Unsuccessful</dt>
        <dd className="text-right font-mono text-destructive">{formatCount(point.unsuccessful)}</dd>
        <dt className="text-muted-foreground">Success rate</dt>
        <dd className="text-right font-mono">{formatPercent(point.successRatePct)}</dd>
      </dl>
    </div>
  )
}

export function TrendChart({
  trend,
  timeRange,
}: {
  trend: DeliveryTrendBucket[]
  timeRange: OverviewTimeRange
}) {
  if (trend.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No delivery activity recorded in this time range.
      </p>
    )
  }

  const points: TrendPoint[] = trend.map((bucket) => {
    const total = bucket.succeeded + bucket.unsuccessful
    return {
      ...bucket,
      successRatePct: total === 0 ? 100 : (bucket.succeeded / total) * 100,
    }
  })

  const minRate = Math.min(...points.map((p) => p.successRatePct))
  const rateFloor = Math.max(0, Math.floor(minRate / 5) * 5 - 5)
  const totalUnsuccessful = points.reduce((sum, p) => sum + p.unsuccessful, 0)
  const worst = points.reduce((a, b) => (b.successRatePct < a.successRatePct ? b : a))

  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-56 w-full"
        role="img"
        aria-label={`Delivery outcomes for ${timeRangeLabels[
          timeRange
        ].toLowerCase()}: ${formatCount(totalUnsuccessful)} unsuccessful attempts in total; success rate was lowest at ${worst.label} (${formatPercent(worst.successRatePct)}).`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="unsuccessful"
              width={40}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              label={{
                value: "Unsuccessful",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "var(--muted-foreground)" },
              }}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              width={44}
              domain={[rateFloor, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar
              yAxisId="unsuccessful"
              dataKey="unsuccessful"
              name="Unsuccessful attempts"
              fill="var(--destructive)"
              fillOpacity={0.75}
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="successRatePct"
              name="Success rate"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2 rounded-[2px] bg-destructive/75" />
          Unsuccessful attempts (left axis)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded bg-primary" />
          Success rate (right axis)
        </span>
      </p>
    </div>
  )
}
