import { RotateCcw } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { PageSkeleton } from "@/components/shared/page-skeleton"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { ReplayJobStatusBadge } from "@/components/shared/status-badge"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatCount, formatDateTime } from "@/lib/format"
import { getEndpointById, getReplayJobById, getUserById } from "@/repositories"
import type { Environment } from "@/types"

async function loadReplayJob(replayJobId: string, environment: Environment) {
  const job = await getReplayJobById(replayJobId, environment)
  if (!job) return null
  const [endpoint, requestedBy] = await Promise.all([
    getEndpointById(job.endpointId, environment),
    getUserById(job.requestedByUserId),
  ])
  return { job, endpoint, requestedBy }
}

export function ReplayDetailPage() {
  const { replayJobId } = useParams<{ replayJobId: string }>()
  const { environment } = useApp()
  const { data, loading } = useAsync(
    () => loadReplayJob(replayJobId ?? "", environment),
    [replayJobId, environment]
  )

  if (loading) return <PageSkeleton />

  if (!data) {
    return (
      <ResourceNotFound
        resourceLabel="Replay job"
        resourceId={replayJobId}
        backHref="/deliveries"
        backLabel="Back to deliveries"
      />
    )
  }

  const { job, endpoint, requestedBy } = data

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Deliveries", href: "/deliveries" },
          { label: job.id },
        ]}
        title={<Mono className="bg-transparent px-0 text-[0.9em]">{job.id}</Mono>}
        description={
          endpoint
            ? `Replay of missed deliveries to ${endpoint.name}.`
            : "Replay job record."
        }
        meta={<ReplayJobStatusBadge status={job.status} />}
      />
      <Panel title="Replay summary">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          {endpoint && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Endpoint</dt>
              <dd className="text-sm">
                <Link
                  to={`/endpoints/${endpoint.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {endpoint.name}
                </Link>
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Requested by</dt>
            <dd className="text-sm text-foreground">{requestedBy?.name ?? "—"}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Items</dt>
            <dd className="text-sm text-foreground">
              {formatCount(job.totalItems)} total — {formatCount(job.succeededCount)}{" "}
              succeeded, {formatCount(job.failedCount)} failed,{" "}
              {formatCount(job.skippedCount)} skipped
            </dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Started</dt>
            <dd className="text-sm text-foreground">{formatDateTime(job.startedAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Completed</dt>
            <dd className="text-sm text-foreground">{formatDateTime(job.completedAt)}</dd>
          </div>
          {job.note && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Note</dt>
              <dd className="text-sm text-foreground">{job.note}</dd>
            </div>
          )}
        </dl>
      </Panel>
      <PlaceholderPanel
        icon={RotateCcw}
        title="Replay execution detail"
        items={[
          "Per-item results with links to the replayed deliveries",
          "Live progress for running replay jobs",
          "Eligibility explanations for skipped items",
        ]}
      />
    </>
  )
}
