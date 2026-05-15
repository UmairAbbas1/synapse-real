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
  { label: "Chat", href: "/chat", icon: MessageSquare, roles: ["user", "admin", "expert", "pm", "hr", "junior_dev", "senior_dev"] },
  { label: "History", href: "/history", icon: Clock, roles: ["user", "admin", "expert", "pm", "hr", "junior_dev", "senior_dev"] },
  { label: "Knowledge Graph", href: "/admin/graph", icon: Network, roles: ["user", "admin", "expert", "pm", "hr", "junior_dev", "senior_dev"] },
  { label: "Admin Dashboard", href: "/admin", icon: Settings, roles: ["admin"] },
  { label: "Sources", href: "/admin/sources", icon: Database, roles: ["admin"] },
  { label: "Users", href: "/admin/users", icon: Users, roles: ["admin"] },
  { label: "Audit", href: "/admin/audit", icon: ScrollText, roles: ["admin"] },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore()
  const { user } = useAuthStore()
  const pathname = usePathname()

  const userRole = (user?.role || "user").toLowerCase()
  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole))

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "glass-effect shadow-lg border-r border-border-medium",
        sidebarCollapsed ? "w-[64px]" : "w-[260px]"
      )}
    >
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-xl font-bold tracking-tight text-text-primary uppercase">SYNAPSE</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-[8px] p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-300"
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const content = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-[10px] px-3 py-3 text-sm font-medium transition-all duration-300 overflow-hidden",
                isActive
                  ? "bg-accent-muted text-accent-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary rounded-r-full" />
              )}
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", !sidebarCollapsed && "mr-3", isActive ? "text-accent-primary" : "text-text-tertiary group-hover:text-text-primary")} />
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

      <div className="border-t border-border-subtle p-6 flex flex-col gap-4">
        <button
          onClick={toggleTheme}
          className="flex items-center rounded-[10px] p-2.5 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-300"
        >
          {theme === "dark" ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          {!sidebarCollapsed && <span className="ml-3">{theme === "dark" ? "Light Appearance" : "Dark Appearance"}</span>}
        </button>

        <div className="flex items-center p-1">
          <Avatar initials={user?.display_name?.charAt(0) || "U"} className="ring-2 ring-border-medium" />
          {!sidebarCollapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="truncate text-sm font-semibold text-text-primary leading-tight">{user?.display_name || "User"}</p>
              <p className="truncate text-[10px] font-mono text-text-tertiary uppercase tracking-wider mt-0.5">{(user?.role || "user").toUpperCase()}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
