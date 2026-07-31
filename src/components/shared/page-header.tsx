import type { ReactNode } from "react"

import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ title, description, crumbs, actions, meta }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
