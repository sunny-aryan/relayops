import { cn } from "@/lib/utils"
import type { Environment } from "@/types"

interface EnvironmentBadgeProps {
  environment: Environment
  className?: string
}

export function EnvironmentBadge({ environment, className }: EnvironmentBadgeProps) {
  const isProduction = environment === "production"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        isProduction
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-info/30 bg-info/10 text-info",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {isProduction ? "Production" : "Sandbox"}
    </span>
  )
}
