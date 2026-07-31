import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-xs",
        className
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("px-4 py-4", contentClassName)}>{children}</div>
    </section>
  )
}
