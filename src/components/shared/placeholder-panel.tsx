import type { LucideIcon } from "lucide-react"

import { Panel } from "@/components/shared/panel"

interface PlaceholderPanelProps {
  icon: LucideIcon
  title: string
  milestone?: string
  items: string[]
}

export function PlaceholderPanel({
  icon: Icon,
  title,
  milestone = "a later milestone",
  items,
}: PlaceholderPanelProps) {
  return (
    <Panel>
      <div className="flex flex-col items-start gap-3 py-2 sm:flex-row sm:gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Coming in {milestone}. This area will include:
            </p>
          </div>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground marker:text-border">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  )
}
