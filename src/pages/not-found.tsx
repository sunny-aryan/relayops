import { Compass } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist in RelayOps. It may have moved, or the address may be mistyped."
        className="w-full max-w-lg border-none bg-transparent"
      >
        <Button asChild size="sm">
          <Link to="/overview">Go to Overview</Link>
        </Button>
      </EmptyState>
    </div>
  )
}
