"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, LogOut, User as UserIcon, Settings } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Avatar } from "@/components/ui/Avatar"
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown"

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Generate simple breadcrumbs from pathname
  const paths = pathname.split('/').filter(Boolean)
  const currentPage = paths[paths.length - 1] || "Home"
  const formattedPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between glass-effect px-8 border-b border-border-medium shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">{formattedPage}</h2>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">Dashboard</span>
          <span className="text-text-tertiary">/</span>
          <span className="text-[10px] font-mono text-accent-primary uppercase tracking-widest font-semibold">{formattedPage}</span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <button className="relative group p-2.5 rounded-full hover:bg-bg-hover transition-all duration-300">
          <Bell className="h-5 w-5 text-text-secondary group-hover:text-text-primary group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-error ring-2 ring-white animate-pulse" />
        </button>

        <Dropdown
          trigger={
            <button className="flex items-center group focus:outline-none transition-transform active:scale-95">
              <Avatar 
                initials={user?.display_name?.charAt(0) || "U"} 
                className="h-10 w-10 cursor-pointer border-2 border-border-medium group-hover:border-accent-primary transition-colors" 
              />
            </button>
          }
        >
          <div className="w-56 overflow-hidden rounded-[12px] bg-white border border-border-medium shadow-lg">
            <div className="px-5 py-4 border-b border-border-subtle bg-bg-hover/30">
              <p className="text-sm text-text-primary font-bold">{user?.display_name}</p>
              <p className="text-[11px] text-text-tertiary font-mono truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="p-1.5">
              <DropdownItem className="flex items-center rounded-[8px] px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                <UserIcon className="mr-3 h-4 w-4" />
                Account Settings
              </DropdownItem>
              {user?.role === 'admin' && (
                <>
                  <DropdownItem 
                    onClick={() => router.push('/admin')}
                    className="flex items-center rounded-[8px] px-3 py-2 text-sm text-accent-primary hover:bg-accent-primary/10 transition-colors"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Admin Dashboard
                  </DropdownItem>
                </>
              )}
              <div className="my-1 h-px bg-border-subtle" />
              <DropdownItem 
                onClick={logout} 
                className="flex items-center rounded-[8px] px-3 py-2 text-sm text-error hover:bg-error/5 transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </DropdownItem>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  )
}
