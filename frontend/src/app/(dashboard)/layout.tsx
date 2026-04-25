"use client"

import * as React from "react"
import { useAuth } from "@/hooks/useAuth"
import { useUIStore } from "@/stores/uiStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const { sidebarCollapsed } = useUIStore()

  // During SSR or initial auth check, don't flash the login redirect
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  // If not authenticated, the useAuth hook (or page routing) will redirect, 
  // but we return null here to prevent rendering dashboard fragments
  if (!isAuthenticated) return null

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <Sidebar />
      <div 
        className={cn(
          "flex flex-col min-h-screen transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarCollapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
