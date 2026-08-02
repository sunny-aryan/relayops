import { ArrowLeft, RotateCcw } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { EnvironmentBadge } from "@/components/shared/environment-badge"
import { Mono, MonoPlain } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { ResourceNotFound } from "@/components/shared/resource-not-found"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { auditActorTypeLabels, auditProvenanceLabels } from "@/lib/labels"
import { getAuditEventDetail } from "@/repositories"

export function AuditEventDetailPage() {
  const { auditEventId } = useParams<{ auditEventId: string }>()
  const { environment } = useApp()

  const { data, loading, error } = useAsync(
    () => getAuditEventDetail(environment, auditEventId ?? ""),
    [auditEventId, environment]
  )

  if (loading) return <Skeleton className="h-96 w-full rounded-lg" />

  if (error || !data) {
    return (
      <ResourceNotFound
        resourceLabel="Audit event"
        resourceId={auditEventId}
        backHref="/audit"
        backLabel="Back to Audit log"
      />
    )
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Audit log", href: "/audit" },
          { label: data.id },
        ]}
        title={data.actionLabel}
        description={data.summary}
        meta={
          <div className="flex items-center gap-2">
            {data.isSimulated && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-info/30 bg-info/5 px-2 py-0.5 text-xs text-info">
                <RotateCcw className="size-3" />
                Simulated execution record
              </span>
            )}
            <StatusBadge tone="neutral" label={auditProvenanceLabels[data.provenance]} withDot={false} />
            {data.environment !== null ? (
              <EnvironmentBadge environment={data.environment} />
            ) : (
              <StatusBadge tone="neutral" label="Workspace-wide" withDot={false} />
            )}
          </div>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/audit">
              <ArrowLeft className="size-3.5" />
              Back to Audit log
            </Link>
          </Button>
        }
      />

      <Panel title="Event details">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[12rem_1fr]">
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Action</dt>
            <dd className="text-sm text-foreground">{data.actionLabel}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Canonical action</dt>
            <dd className="text-sm"><Mono className="bg-transparent px-0 text-xs">{data.action}</Mono></dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Occurred</dt>
            <dd className="text-sm text-foreground">{formatDateTime(data.occurredAt)}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Actor</dt>
            <dd className="text-sm text-foreground">
              {data.actorLabel}
              {data.actorRoleLabel && (
                <span className="text-muted-foreground"> ({data.actorRoleLabel})</span>
              )}
            </dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Actor type</dt>
            <dd className="text-sm text-foreground">{auditActorTypeLabels[data.actorType]}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Environment</dt>
            <dd className="text-sm text-foreground">{data.environmentLabel}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Provenance</dt>
            <dd className="text-sm text-foreground">{auditProvenanceLabels[data.provenance]}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Target type</dt>
            <dd className="text-sm capitalize text-foreground">{data.targetType}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Target ID</dt>
            <dd className="text-sm"><MonoPlain className="text-xs">{data.targetId}</MonoPlain></dd>
          </div>
          {data.executionModeLabel && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Execution mode</dt>
              <dd className="text-sm text-foreground">{data.executionModeLabel}</dd>
            </div>
          )}
          {data.httpStatus !== null && (
            <div className="contents">
              <dt className="text-sm text-muted-foreground">HTTP status</dt>
              <dd className="text-sm text-foreground">{data.httpStatus}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-sm text-foreground">
          {data.summary}
        </p>
        {data.operatorNote && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Operator note</p>
            <p className="text-sm text-foreground">{data.operatorNote}</p>
          </div>
        )}
      </Panel>

      {data.relatedResources.length > 0 && (
        <Panel title="Related resources">
          <ul className="flex flex-col gap-2">
            {data.relatedResources.map((r) => (
              <li key={`${r.type}-${r.id}`} className="flex items-center gap-2 text-sm">
                <span className="capitalize text-muted-foreground">{r.type}:</span>
                {r.href ? (
                  <Link to={r.href} className="font-medium text-primary underline-offset-4 hover:underline">
                    <MonoPlain className="text-xs">{r.label}</MonoPlain>
                  </Link>
                ) : (
                  <MonoPlain className="text-xs text-muted-foreground">{r.label}</MonoPlain>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="flex items-center gap-3">
        <Link
          to="/audit"
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Audit log
        </Link>
      </div>
    </>
  )
}
