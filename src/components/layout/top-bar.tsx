import {
  Bell,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { RoleBadge } from "@/components/shared/role-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useApp } from "@/contexts/app-context"
import { cn } from "@/lib/utils"
import type { Environment } from "@/types"

function WorkspaceSelector() {
  const { workspace } = useApp()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-56 gap-1.5 px-2 font-medium">
          <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{workspace?.name ?? "…"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuItem className="justify-between">
          <span className="truncate">{workspace?.name}</span>
          <Check className="size-4 text-primary" aria-hidden="true" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Additional workspaces coming in a later milestone
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EnvironmentSelector() {
  const { environment, setEnvironment } = useApp()
  const isProduction = environment === "production"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 px-2.5 font-medium",
            isProduction
              ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "border-info/40 bg-info/5 text-info hover:bg-info/10 hover:text-info"
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {isProduction ? "Production" : "Sandbox"}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Environment
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={environment}
          onValueChange={(value) => setEnvironment(value as Environment)}
        >
          <DropdownMenuRadioItem value="production">
            <div className="flex flex-col">
              <span className="font-medium">Production</span>
              <span className="text-xs text-muted-foreground">
                Live customer traffic — changes take effect immediately
              </span>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="sandbox">
            <div className="flex flex-col">
              <span className="font-medium">Sandbox</span>
              <span className="text-xs text-muted-foreground">
                Safe test environment for integration development
              </span>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden w-56 justify-between px-2.5 font-normal text-muted-foreground lg:flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-1.5">
          <Search className="size-3.5" aria-hidden="true" />
          Search
        </span>
        <Kbd>⌘K</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="size-4" aria-hidden="true" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search RelayOps">
        <CommandInput placeholder="Search endpoints, deliveries, events…" />
        <CommandList>
          <CommandEmpty>
            Cross-resource search arrives in a later milestone. For now, browse
            Endpoints and Deliveries from the sidebar.
          </CommandEmpty>
        </CommandList>
      </CommandDialog>
    </>
  )
}

function NotificationsMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-medium text-foreground">Notifications</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Delivery alerts and incident notifications arrive in a later milestone.
        </p>
      </PopoverContent>
    </Popover>
  )
}

function UserMenu() {
  const { user, membership } = useApp()
  const role = membership?.role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-1.5" aria-label="User menu">
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {user?.avatarInitials ?? "…"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline">{user?.name ?? "…"}</span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground md:inline" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user?.email}
            </span>
            {role && <RoleBadge role={role} className="w-fit" />}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <UserRound aria-hidden="true" />
            Profile &amp; settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogOut aria-hidden="true" />
          Sign out (coming with authentication)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopBar() {
  const { environment, membership } = useApp()
  const isProduction = environment === "production"

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-13 shrink-0 items-center gap-2 border-b bg-card px-3",
        isProduction ? "border-b-destructive/25" : "border-b-border"
      )}
    >
      <SidebarTrigger aria-label="Toggle sidebar" />
      <WorkspaceSelector />
      <EnvironmentSelector />
      {isProduction && (
        <span className="hidden items-center gap-1 text-xs font-medium text-destructive sm:flex">
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          Live environment
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <GlobalSearch />
        <Button variant="ghost" size="sm" className="hidden gap-1.5 text-muted-foreground md:flex" asChild>
          <Link to="/developers">
            <BookOpen className="size-4" aria-hidden="true" />
            Docs
          </Link>
        </Button>
        <NotificationsMenu />
        <UserMenu />
        {membership && (
          <RoleBadge role={membership.role} className="hidden xl:inline-flex" />
        )}
      </div>
    </header>
  )
}
