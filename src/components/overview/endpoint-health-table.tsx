import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"

import { MonoPlain } from "@/components/shared/mono"
import { EndpointHealthBadge, StatusBadge } from "@/components/shared/status-badge"
import { formatCount, formatDateTime, formatLatency, formatPercent } from "@/lib/format"
import { endpointStatusLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { OverviewEndpointRow } from "@/types"

const endpointStatusTones = {
  active: "neutral",
  disabled: "neutral",
} as const

export function EndpointHealthTable({ rows }: { rows: OverviewEndpointRow[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-2 pr-3 font-medium">
              Endpoint
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Status
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Health
            </th>
            <th scope="col" className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">
              Success rate
            </th>
            <th scope="col" className="hidden pb-2 pr-3 text-right font-medium md:table-cell">
              p95 latency
            </th>
            <th scope="col" className="hidden pb-2 pr-3 text-right font-medium md:table-cell">
              Backlog
            </th>
            <th scope="col" className="hidden pb-2 text-right font-medium lg:table-cell">
              Last activity
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ endpoint, metrics, successRatePct }) => {
            const disabled = endpoint.status === "disabled"
            return (
              <tr
                key={endpoint.id}
                onClick={() => navigate(`/endpoints/${endpoint.id}`)}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60",
                  disabled && "opacity-70"
                )}
              >
                <td className="py-2.5 pr-3">
                  <div className="flex max-w-52 flex-col gap-0.5 md:max-w-none">
                    <Link
                      to={`/endpoints/${endpoint.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="focus-visible:ring-ring/50 w-fit rounded-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px]"
                    >
                      {endpoint.name}
                    </Link>
                    <MonoPlain className="truncate text-xs text-muted-foreground">
                      {endpoint.maskedUrl}
                    </MonoPlain>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge
                    tone={endpointStatusTones[endpoint.status]}
                    label={endpointStatusLabels[endpoint.status]}
                    withDot={false}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  {disabled ? (
                    <span className="text-xs text-muted-foreground">Not evaluated</span>
                  ) : (
                    <EndpointHealthBadge health={endpoint.health} />
                  )}
                </td>
                <td className="hidden py-2.5 pr-3 text-right font-mono text-xs tabular-nums sm:table-cell">
                  {disabled ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatPercent(successRatePct)
                  )}
                </td>
                <td className="hidden py-2.5 pr-3 text-right font-mono text-xs tabular-nums md:table-cell">
                  {disabled ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatLatency(metrics.p95LatencyMs)
                  )}
                </td>
                <td
                  className={cn(
                    "hidden py-2.5 pr-3 text-right font-mono text-xs tabular-nums md:table-cell",
                    !disabled && metrics.backlogCount > 0 && "text-warning"
                  )}
                >
                  {disabled ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    formatCount(metrics.backlogCount)
                  )}
                </td>
                <td className="hidden py-2.5 text-right text-xs text-muted-foreground lg:table-cell">
                  {metrics.lastActivityAt ? formatDateTime(metrics.lastActivityAt) : "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
