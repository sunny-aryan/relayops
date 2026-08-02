import { useMemo } from "react"
import { History, Search, X } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { EnvironmentBadge } from "@/components/shared/environment-badge"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { auditActorTypeLabels, auditCategoryLabels, auditProvenanceLabels } from "@/lib/labels"
import type { AuditCategory } from "@/lib/labels"
import { listAuditEvents } from "@/repositories"

const VALID_CATEGORIES: AuditCategory[] = ["all", "replays", "endpoints", "governance"]
const VALID_ACTOR_TYPES = ["all", "user", "system", "support"]

function sanitizeFilters(params: URLSearchParams): { search: string; category: AuditCategory; actorType: string } {
  const search = params.get("q") ?? ""
  const categoryParam = params.get("category") ?? "all"
  const actorParam = params.get("actor") ?? "all"
  const category: AuditCategory = VALID_CATEGORIES.includes(categoryParam as AuditCategory) ? (categoryParam as AuditCategory) : "all"
  const actorType = VALID_ACTOR_TYPES.includes(actorParam) ? actorParam : "all"
  return { search, category, actorType }
}

export function AuditPage() {
  const { environment } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => sanitizeFilters(searchParams), [searchParams])

  const { data, loading, error } = useAsync(
    () => listAuditEvents(environment, filters),
    [environment, filters.search, filters.category, filters.actorType]
  )

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value && value !== "all") {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasFilters = filters.search !== "" || filters.category !== "all" || filters.actorType !== "all"

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Read-only history of configuration changes, recovery actions, and system events in this workspace."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            <History className="size-3" />
            Read-only
          </span>
        }
      />

      <Panel title="Filters" contentClassName="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search action, actor, target, or summary"
              value={filters.search}
              onChange={(e) => updateFilter("q", e.target.value)}
              className="pl-8"
              aria-label="Search audit events"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Filter by category"
            >
              {VALID_CATEGORIES.map((c) => (
                <option key={c} value={c}>{auditCategoryLabels[c]}</option>
              ))}
            </select>
            <select
              value={filters.actorType}
              onChange={(e) => updateFilter("actor", e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="Filter by actor type"
            >
              <option value="all">All actors</option>
              <option value="user">Users</option>
              <option value="system">System</option>
              <option value="support">Support</option>
            </select>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : error ? (
        <Panel>
          <p className="text-sm text-muted-foreground">Couldn't load audit events.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </Panel>
      ) : data && data.rows.length > 0 ? (
        <Panel title={`Audit events (${data.total})`} contentClassName="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {data.rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={row.detailHref}
                  className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {row.actionLabel}
                    </span>
                    {row.isSimulated && (
                      <StatusBadge tone="info" label="Simulated" withDot={false} />
                    )}
                    <StatusBadge tone="neutral" label={auditProvenanceLabels[row.provenance]} withDot={false} />
                    {row.environment !== null ? (
                      <EnvironmentBadge environment={row.environment} />
                    ) : (
                      <StatusBadge tone="neutral" label="Workspace-wide" withDot={false} />
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(row.occurredAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{row.actorLabel}</span>
                    <span>·</span>
                    <span>{auditActorTypeLabels[row.actorType]}</span>
                    <span>·</span>
                    <span className="capitalize">{row.targetType}</span>
                    <MonoPlain className="text-xs">{row.targetId}</MonoPlain>
                  </div>
                  <p className="text-sm text-muted-foreground">{row.summary}</p>
                  <Mono className="text-[0.6875rem] text-muted-foreground/70">{row.action}</Mono>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <History className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "No audit events match the current filters."
                : "No audit events have been recorded in this workspace yet."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </Panel>
      )}
    </>
  )
}
