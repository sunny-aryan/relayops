import { Badge } from "@/components/ui/badge"
import { roleLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"

interface RoleBadgeProps {
  role: Role
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-medium", className)}>
      {roleLabels[role]}
    </Badge>
  )
}
