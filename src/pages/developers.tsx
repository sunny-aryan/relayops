import { Code2, KeyRound } from "lucide-react"

import { Mono } from "@/components/shared/mono"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { formatDateTime } from "@/lib/format"
import { listApiKeys } from "@/repositories"

export function DevelopersPage() {
  const { environment } = useApp()
  const { data, loading } = useAsync(() => listApiKeys(environment), [environment])

  return (
    <>
      <PageHeader
        title="Developers"
        description="API credentials, signing keys, and integration tooling for this environment."
      />
      {loading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <Panel
          title="API keys"
          description="Keys are shown masked. Full values are only visible at creation time."
          contentClassName="p-0"
        >
          <ul className="flex flex-col divide-y divide-border">
            {(data ?? []).map((key) => (
              <li key={key.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {key.label}
                  </span>
                  <Mono>{key.maskedKey}</Mono>
                </span>
                <span className="text-xs text-muted-foreground">
                  Last used {formatDateTime(key.lastUsedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={Code2}
        title="Developer tooling"
        items={[
          "Webhook signature verification guides and code samples",
          "Test event sender for sandbox endpoints",
          "Event-type catalog with payload schemas",
        ]}
      />
    </>
  )
}
