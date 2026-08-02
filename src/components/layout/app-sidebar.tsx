import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Code2,
  History,
  LayoutDashboard,
  Settings,
  Webhook,
  Zap,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Endpoints", href: "/endpoints", icon: Webhook },
  { label: "Deliveries", href: "/deliveries", icon: ArrowRightLeft },
  { label: "Usage", href: "/usage", icon: BarChart3 },
  { label: "Developers", href: "/developers", icon: Code2 },
  { label: "Status", href: "/status", icon: Activity },
  { label: "Audit log", href: "/audit", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/overview"
          className="flex items-center gap-2.5 rounded-md px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              RelayOps
            </span>
            <span className="truncate text-[11px] leading-tight text-muted-foreground">
              Webhook Reliability &amp; Recovery
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.href}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <p className="px-2 py-1 text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          A webhook operations portal provided by{" "}
          <span className="font-medium text-sidebar-foreground">Helio</span>
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
