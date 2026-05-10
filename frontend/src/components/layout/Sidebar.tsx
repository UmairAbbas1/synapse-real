"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  Clock,
  Settings,
  Network,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Database,
  Users,
  ScrollText,
} from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { useAuthStore } from "@/store/auth-store"
import { Tooltip } from "@/components/ui/Tooltip"
import { Avatar } from "@/components/ui/Avatar"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Chat", href: "/chat", icon: MessageSquare, roles: ["USER", "ADMIN", "EXPERT", "PM", "HR", "JUNIOR_DEV", "SENIOR_DEV"] },
  { label: "History", href: "/history", icon: Clock, roles: ["USER", "ADMIN", "EXPERT", "PM", "HR", "JUNIOR_DEV", "SENIOR_DEV"] },
  { label: "Knowledge Graph", href: "/admin/graph", icon: Network, roles: ["USER", "ADMIN", "EXPERT", "PM", "HR", "JUNIOR_DEV", "SENIOR_DEV"] },
  { label: "Admin Dashboard", href: "/admin", icon: Settings, roles: ["ADMIN"] },
  { label: "Sources", href: "/admin/sources", icon: Database, roles: ["ADMIN"] },
  { label: "Users", href: "/admin/users", icon: Users, roles: ["ADMIN"] },
  { label: "Audit", href: "/admin/audit", icon: ScrollText, roles: ["ADMIN"] },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore()
  const { user } = useAuthStore()
  const pathname = usePathname()

  const userRole = user?.role || "USER"
  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border-subtle bg-bg-secondary transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        sidebarCollapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        {!sidebarCollapsed && (
          <span className="text-xl font-black tracking-tight text-accent-primary">SYNAPSE</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary focus:outline-none"
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 space-y-2 p-2 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const content = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-[8px] px-2 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-bg-hover text-accent-primary border-l-[3px] border-accent-primary"
                  : "text-text-secondary hover:bg-surface-1 hover:text-text-primary border-l-[3px] border-transparent"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", !sidebarCollapsed && "mr-3", isActive ? "text-accent-primary" : "text-text-tertiary group-hover:text-text-primary")} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          )

          return sidebarCollapsed ? (
            <Tooltip key={item.href} content={item.label} side="right">
              {content}
            </Tooltip>
          ) : content
        })}
      </nav>

      <div className="border-t border-border-subtle p-4 flex flex-col gap-4">
        <button
          onClick={toggleTheme}
          className="flex items-center rounded-[8px] p-2 text-sm font-medium text-text-secondary hover:bg-surface-1 hover:text-text-primary transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          {!sidebarCollapsed && <span className="ml-3">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <div className="flex items-center">
          <Avatar initials={user?.display_name?.charAt(0) || "U"} />
          {!sidebarCollapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="truncate text-sm font-medium text-text-primary">{user?.display_name || "User"}</p>
              <p className="truncate text-xs text-text-tertiary">{user?.role || "USER"}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
