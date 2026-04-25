"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, LogOut, User as UserIcon } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Avatar } from "@/components/ui/Avatar"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

export function Topbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Generate simple breadcrumbs from pathname
  const paths = pathname.split('/').filter(Boolean)
  const currentPage = paths[paths.length - 1] || "Home"
  const formattedPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-glass-border bg-glass-bg px-6 backdrop-blur-[20px]">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-text-primary">{formattedPage}</h2>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-status-error ring-2 ring-bg-primary" />
        </button>

        <Dropdown
          trigger={
            <button className="flex items-center focus:outline-none">
              <Avatar initials={user?.displayName?.charAt(0) || "U"} className="h-8 w-8 cursor-pointer border-transparent hover:border-accent-primary" />
            </button>
          }
        >
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-sm text-text-primary font-medium">{user?.displayName}</p>
            <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <DropdownItem className="text-text-secondary">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownItem>
            <DropdownItem onClick={logout} className="text-status-error hover:bg-status-error/10 hover:text-status-error">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
    </header>
  )
}
