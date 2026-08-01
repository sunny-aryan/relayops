import { timeRangeLabels, timeRangeShortLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { OverviewTimeRange } from "@/types"

const ranges: OverviewTimeRange[] = ["6h", "24h", "7d"]

interface TimeRangeSelectorProps {
  value: OverviewTimeRange
  onChange: (value: OverviewTimeRange) => void
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className="inline-flex items-center rounded-md border border-border bg-card p-0.5 shadow-xs"
    >
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          aria-label={timeRangeLabels[range]}
          title={timeRangeLabels[range]}
          onClick={() => onChange(range)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 font-mono text-xs font-medium transition-colors",
            "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
            value === range
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {timeRangeShortLabels[range]}
        </button>
      ))}
    </div>
  )
}
