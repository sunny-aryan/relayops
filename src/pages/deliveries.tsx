import { useMemo } from "react"
import { ArrowRightLeft, ListFilter, RotateCcw, Search, X } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { EmptyState } from "@/components/shared/empty-state"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime, formatLatency } from "@/lib/format"
import {
  deliveryStateFilterLabels,
  deliveryStateLabels,
  deliveryTimeRangeLabels,
  observedFailureCategoryLabels,
} from "@/lib/labels"
import {
  EVENT_TYPES,
  FAILURE_CATEGORIES,
  VALID_STATES,
  VALID_TIME_RANGES,
  buildExplorerQueryString,
  hasActiveFilters,
  parseDeliveryFilters,
  serializeDeliveryFilters,
  validateEndpointParam,
} from "@/lib/delivery-filters"
import { listDeliveryEndpointOptions, listDeliveryRecords } from "@/repositories"
import { cn } from "@/lib/utils"
import type {
  DeliveryFilters,
  DeliveryListResult,
  DeliveryRecord,
  DeliveryState,
  DeliveryStateFilter,
  DeliveryTimeRange,
  EventType,
  ObservedFailureCategory,
} from "@/types"

const stateTones: Record<DeliveryState, StatusTone> = {
  delivered: "success",
  retrying: "warning",
  exhausted: "danger",
  unknown: "neutral",
}

export function DeliveriesPage() {
  const { environment } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { data: endpointOptions } = useAsync(
    () => listDeliveryEndpointOptions(environment),
    [environment]
  )

  const validEndpointIds = useMemo(
    () => (endpointOptions ?? []).map((e) => e.id),
    [endpointOptions]
  )

  const filters = useMemo(() => {
    const parsed = parseDeliveryFilters(searchParams)
    return {
      ...parsed,
      endpointId: validateEndpointParam(parsed.endpointId, validEndpointIds),
    }
  }, [searchParams, validEndpointIds])

  const { data, loading, error } = useAsync(
    () => listDeliveryRecords(environment, filters),
    [environment, filters]
  )

  function updateFilter(patch: Partial<DeliveryFilters>) {
    const next = { ...filters, ...patch }
    setSearchParams(serializeDeliveryFilters(next), { replace: false })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: false })
  }

  function handleRowClick(id: string) {
    const qs = buildExplorerQueryString(filters)
    navigate(`/deliveries/${id}${qs}`)
  }

  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Recent webhook deliveries in this environment, with their latest observed outcome."
      />

      {/* Filter bar */}
      <Panel contentClassName="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search by delivery ID or event ID"
              aria-label="Search by delivery ID or event ID"
              value={filters.search}
              onChange={(e) => updateFilter({ search: e.target.value })}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="filter-range">
              Time range
            </label>
            <select
              id="filter-range"
              aria-label="Time range"
              value={filters.timeRange}
              onChange={(e) => updateFilter({ timeRange: e.target.value as DeliveryTimeRange })}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
            >
              {VALID_TIME_RANGES.map((r) => (
                <option key={r} value={r}>
                  {deliveryTimeRangeLabels[r]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-endpoint">
              Endpoint
            </label>
            <select
              id="filter-endpoint"
              aria-label="Endpoint"
              value={filters.endpointId ?? ""}
              onChange={(e) =>
                updateFilter({ endpointId: e.target.value || null })
              }
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
            >
              <option value="">All endpoints</option>
              {(endpointOptions ?? []).map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-state">
              Delivery state
            </label>
            <select
              id="filter-state"
              aria-label="Delivery state"
              value={filters.state}
              onChange={(e) => updateFilter({ state: e.target.value as DeliveryStateFilter })}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
            >
              {VALID_STATES.map((s) => (
                <option key={s} value={s}>
                  {deliveryStateFilterLabels[s]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-event">
              Event type
            </label>
            <select
              id="filter-event"
              aria-label="Event type"
              value={filters.eventType ?? ""}
              onChange={(e) =>
                updateFilter({ eventType: (e.target.value || null) as EventType | null })
              }
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
            >
              <option value="">All event types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="filter-category">
              Failure category
            </label>
            <select
              id="filter-category"
              aria-label="Observed failure category"
              value={filters.failureCategory ?? ""}
              onChange={(e) =>
                updateFilter({
                  failureCategory: (e.target.value || null) as ObservedFailureCategory | null,
                })
              }
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
            >
              <option value="">All categories</option>
              {FAILURE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {observedFailureCategoryLabels[c]}
                </option>
              ))}
            </select>

            {hasActiveFilters(filters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : error ? (
        <EmptyState
          icon={ListFilter}
          title="Couldn't load deliveries"
          description="Something went wrong while fetching delivery records."
        >
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        </EmptyState>
      ) : data === null ? null : data.records.length === 0 && !hasActiveFilters(filters) ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No deliveries in this environment"
          description="Deliveries appear here as Helio sends webhook events to your endpoints."
        />
      ) : data.records.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching deliveries"
          description="No deliveries match the current filters. Try adjusting or clearing them."
        >
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <DeliveryList result={data} endpointOptions={endpointOptions ?? []} onRowClick={handleRowClick} />
      )}
    </>
  )
}

function DeliveryList({
  result,
  endpointOptions,
  onRowClick,
}: {
  result: DeliveryListResult
  endpointOptions: { id: string; name: string }[]
  onRowClick: (id: string) => void
}) {
  return (
    <Panel contentClassName="flex flex-col gap-0 p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          Showing the latest {result.loadedCount} matching{" "}
          {result.loadedCount === 1 ? "delivery" : "deliveries"}.
          {result.hasMore && ` (${result.totalMatching} total matches)`}
        </p>
      </div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                Latest activity
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Event
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Endpoint
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
                Delivery ID
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                State
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Attempts
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
                Latest result
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {result.records.map((record) => (
              <DeliveryRow
                key={record.id}
                record={record}
                endpointName={endpointOptions.find((e) => e.id === record.endpointId)?.name ?? record.endpointId}
                onClick={() => onRowClick(record.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile stacked cards */}
      <div className="flex flex-col sm:hidden">
        {result.records.map((record) => (
          <DeliveryCard
            key={record.id}
            record={record}
            endpointName={endpointOptions.find((e) => e.id === record.endpointId)?.name ?? record.endpointId}
            onClick={() => onRowClick(record.id)}
          />
        ))}
      </div>
    </Panel>
  )
}

function DeliveryRow({ record, endpointName, onClick }: { record: DeliveryRecord; endpointName: string; onClick: () => void }) {
  return (
    <tr
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/60",
        "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
        record.state !== "delivered" && record.state !== "unknown" && "bg-warning/5"
      )}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
        {formatDateTime(record.lastAttemptAt)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <Mono className="bg-transparent px-0 text-xs text-foreground">{record.eventType}</Mono>
          <MonoPlain className="truncate text-[0.6875rem] text-muted-foreground">
            {record.eventId}
          </MonoPlain>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <EndpointLink endpointId={record.endpointId} name={endpointName} />
      </td>
      <td className="hidden px-3 py-2.5 md:table-cell">
        <MonoPlain className="text-xs text-muted-foreground">{record.id}</MonoPlain>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge
          tone={stateTones[record.state]}
          label={deliveryStateLabels[record.state]}
        />
      </td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums">
        {record.attemptCount}/{record.maxAttempts}
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <span className="text-xs text-muted-foreground">{record.latestResponseSummary}</span>
      </td>
      <td className="hidden px-3 py-2.5 text-right text-xs tabular-nums lg:table-cell">
        {formatLatency(record.latestLatencyMs)}
      </td>
    </tr>
  )
}

function DeliveryCard({ record, endpointName, onClick }: { record: DeliveryRecord; endpointName: string; onClick: () => void }) {
  return (
    <div
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-2 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/60",
        "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
        record.state !== "delivered" && record.state !== "unknown" && "bg-warning/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{formatDateTime(record.lastAttemptAt)}</span>
        <StatusBadge
          tone={stateTones[record.state]}
          label={deliveryStateLabels[record.state]}
        />
      </div>
      <Mono className="bg-transparent px-0 text-xs text-foreground">{record.eventType}</Mono>
      <div className="flex items-center justify-between gap-2">
        <EndpointLink endpointId={record.endpointId} name={endpointName} />
        <span className="text-xs tabular-nums text-muted-foreground">
          {record.attemptCount}/{record.maxAttempts} attempts
        </span>
      </div>
    </div>
  )
}

function EndpointLink({ endpointId, name }: { endpointId: string; name: string }) {
  return (
    <Link
      to={`/endpoints/${endpointId}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:rounded"
    >
      {name}
    </Link>
  )
}
