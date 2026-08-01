import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FilterX, Search, Webhook } from "lucide-react"

import { EndpointHealthBadge, StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount, formatDateTime, formatLatency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { listEndpointInventory } from "@/repositories"
import type { EndpointInventoryRow } from "@/types"

// Evaluated health severity (active endpoints with telemetry only).
// Active endpoints with insufficient telemetry sort after evaluated
// degraded/stale but before evaluated healthy and disabled endpoints.
const attentionHealthOrder = {
  failing: 0,
  degraded: 1,
  stale: 2,
  insufficient: 3,
  healthy: 4,
  disabled: 5,
} as const

type StatusFilter = "all" | "active" | "disabled"
type HealthFilter = "all" | "attention" | "healthy"

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
]

const healthFilters: { value: HealthFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "healthy", label: "Healthy" },
]

function matchesHealth(row: EndpointInventoryRow, filter: HealthFilter): boolean {
  if (filter === "all") return true
  const disabled = row.endpoint.status === "disabled"
  const noMetrics = disabled || !row.metrics
  if (filter === "attention") {
    if (disabled) return false
    if (noMetrics) return true
    return (
      row.endpoint.health === "degraded" ||
      row.endpoint.health === "failing" ||
      row.endpoint.health === "stale"
    )
  }
  // Healthy: active endpoints with telemetry and evaluated health "healthy"
  if (noMetrics) return false
  return row.endpoint.health === "healthy"
}

function matchesStatus(row: EndpointInventoryRow, filter: StatusFilter): boolean {
  if (filter === "all") return true
  return row.endpoint.status === filter
}

function matchesSearch(row: EndpointInventoryRow, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    row.endpoint.name.toLowerCase().includes(q) ||
    row.endpoint.maskedUrl.toLowerCase().includes(q) ||
    row.endpoint.subscribedEventTypes.some((t) => t.toLowerCase().includes(q))
  )
}

function FilterPill<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-md border border-border bg-card p-0.5 shadow-xs"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
            "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function EndpointsPage() {
  const { environment } = useApp()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all")
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useAsync(
    () => listEndpointInventory(environment),
    [environment, reloadKey]
  )
  const navigate = useNavigate()

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const aDisabled = a.endpoint.status === "disabled"
      const bDisabled = b.endpoint.status === "disabled"
      const aKey = aDisabled
        ? "disabled"
        : !a.metrics
          ? "insufficient"
          : a.endpoint.health
      const bKey = bDisabled
        ? "disabled"
        : !b.metrics
          ? "insufficient"
          : b.endpoint.health
      return attentionHealthOrder[aKey] - attentionHealthOrder[bKey]
    })
  }, [data])

  const filtered = useMemo(() => {
    return sorted.filter(
      (row) =>
        matchesStatus(row, statusFilter) &&
        matchesHealth(row, healthFilter) &&
        matchesSearch(row, search.trim())
    )
  }, [sorted, statusFilter, healthFilter, search])

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || healthFilter !== "all"

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setHealthFilter("all")
  }

  return (
    <>
      <PageHeader
        title="Endpoints"
        description="The webhook receivers configured for this environment and their current health."
      />

      {loading && <Skeleton className="h-64 w-full rounded-lg" />}

      {!loading && error && (
        <EmptyState
          title="Couldn't load endpoints"
          description="Something went wrong while loading the endpoint inventory for this environment."
        >
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </EmptyState>
      )}

      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState
          icon={Webhook}
          title="No endpoints in this environment"
          description="Endpoints receive webhook events from Helio. Endpoint creation arrives in a later milestone."
        />
      )}

      {!loading && !error && (data ?? []).length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-72 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, URL, or event type"
                aria-label="Search endpoints"
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                options={statusFilters}
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter by status"
              />
              <FilterPill
                options={healthFilters}
                value={healthFilter}
                onChange={setHealthFilter}
                ariaLabel="Filter by health"
              />
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1.5 text-muted-foreground"
                >
                  <FilterX className="size-3.5" aria-hidden="true" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Panel contentClassName="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "endpoint" : "endpoints"}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-8">
                <EmptyState
                  title="No endpoints match these filters"
                  description="Try adjusting your search or filters."
                >
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </EmptyState>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2 font-medium">
                        Endpoint
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Health
                      </th>
                      <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
                        Subscribed events
                      </th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                        Success rate
                      </th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                        p95
                      </th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                        Backlog
                      </th>
                      <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                        Last activity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ endpoint, metrics, successRatePct }) => {
                      const disabled = endpoint.status === "disabled"
                      const noMetrics = disabled || !metrics
                      return (
                        <tr
                          key={endpoint.id}
                          onClick={() => navigate(`/endpoints/${endpoint.id}`)}
                          className={cn(
                            "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60",
                            disabled && "opacity-70"
                          )}
                        >
                          <td className="px-4 py-2.5">
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
                          <td className="px-3 py-2.5">
                            <StatusBadge
                              tone="neutral"
                              label={endpoint.status === "active" ? "Active" : "Disabled"}
                              withDot={false}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            {disabled ? (
                              <span className="text-xs text-muted-foreground">Not evaluated</span>
                            ) : noMetrics ? (
                              <span className="text-xs text-muted-foreground">
                                Insufficient telemetry
                              </span>
                            ) : (
                              <EndpointHealthBadge health={endpoint.health} />
                            )}
                          </td>
                          <td className="hidden px-3 py-2.5 md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {endpoint.subscribedEventTypes.map((type) => (
                                <Mono key={type} className="text-[11px]">
                                  {type}
                                </Mono>
                              ))}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2.5 text-right font-mono text-xs tabular-nums sm:table-cell">
                            {noMetrics ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatPercent(successRatePct)
                            )}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right font-mono text-xs tabular-nums md:table-cell">
                            {noMetrics ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatLatency(metrics!.p95LatencyMs)
                            )}
                          </td>
                          <td
                            className={cn(
                              "hidden px-3 py-2.5 text-right font-mono text-xs tabular-nums md:table-cell",
                              !noMetrics && metrics!.backlogCount > 0 && "text-warning"
                            )}
                          >
                            {noMetrics ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatCount(metrics!.backlogCount)
                            )}
                          </td>
                          <td className="hidden px-3 py-2.5 text-right text-xs text-muted-foreground lg:table-cell">
                            {metrics?.lastActivityAt
                              ? formatDateTime(metrics.lastActivityAt)
                              : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  )
}
