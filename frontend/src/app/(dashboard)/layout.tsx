"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUIStore } from "@/stores/uiStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const { sidebarCollapsed } = useUIStore()
  const isChatShell = pathname === "/chat" || pathname.startsWith("/chat/")

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (isChatShell) {
    return <div className="min-h-screen bg-bg-primary">{children}</div>
  }

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarCollapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
