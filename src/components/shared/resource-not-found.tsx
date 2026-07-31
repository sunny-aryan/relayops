import { FileQuestion } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/shared/empty-state"
import { Mono } from "@/components/shared/mono"
import { Button } from "@/components/ui/button"

interface ResourceNotFoundProps {
  resourceLabel: string
  resourceId?: string
  backHref: string
  backLabel: string
}

export function ResourceNotFound({
  resourceLabel,
  resourceId,
  backHref,
  backLabel,
}: ResourceNotFoundProps) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={`${resourceLabel} not found`}
      description={`This ${resourceLabel.toLowerCase()} doesn't exist in this workspace, or it may belong to a different environment.`}
    >
      {resourceId && (
        <p className="text-xs text-muted-foreground">
          Requested ID: <Mono>{resourceId}</Mono>
        </p>
      )}
      <Button asChild variant="outline" size="sm">
        <Link to={backHref}>{backLabel}</Link>
      </Button>
    </EmptyState>
  )
}
