import { Settings2 } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PlaceholderPanel } from "@/components/shared/placeholder-panel"
import { RoleBadge } from "@/components/shared/role-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from "@/contexts/app-context"
import { useAsync } from "@/hooks/use-async"
import { getUserById, listMemberships } from "@/repositories"
import type { Membership, User } from "@/types"

async function loadMembers(): Promise<{ membership: Membership; user: User | null }[]> {
  const memberships = await listMemberships()
  return Promise.all(
    memberships.map(async (membership) => ({
      membership,
      user: await getUserById(membership.userId),
    }))
  )
}

export function SettingsPage() {
  const { workspace } = useApp()
  const { data, loading } = useAsync(() => loadMembers(), [])

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace details and team access for this integration."
      />
      <Panel
        title="Workspace"
        description="This workspace is provided to your team by Helio."
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="text-sm font-medium text-foreground">{workspace?.name ?? "—"}</dd>
          </div>
          <div className="contents">
            <dt className="text-sm text-muted-foreground">Provider</dt>
            <dd className="text-sm text-foreground">{workspace?.providerName ?? "—"}</dd>
          </div>
        </dl>
      </Panel>
      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <Panel title="Team" description="People with access to this workspace." contentClassName="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {(data ?? []).map(({ membership, user }) => (
              <li key={membership.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                      {user?.avatarInitials ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {user?.name ?? "Unknown user"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </span>
                </span>
                <RoleBadge role={membership.role} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <PlaceholderPanel
        icon={Settings2}
        title="Workspace administration"
        items={[
          "Member invitations and role management",
          "Retry policy and alerting configuration",
          "Payload retention and redaction preferences",
        ]}
      />
    </>
  )
}
