"use client"

import * as React from "react"
import { Expert } from "@/stores/chatStore"
import { Avatar } from "@/components/ui/Avatar"
import { Mail } from "lucide-react"

export function ExpertCard({ expert }: { expert: Expert }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[12px] border border-status-warning/20 bg-surface-1 shadow-sm">
      <div className="bg-status-warning/10 px-4 py-2 border-b border-status-warning/20">
        <p className="text-xs font-semibold uppercase tracking-wider text-status-warning">
          Low confidence — consider asking an expert
        </p>
      </div>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar 
            initials={expert.name.charAt(0)} 
            className="border-status-warning text-status-warning bg-status-warning/10" 
          />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold text-text-primary">{expert.name}</span>
            <span className="truncate text-xs text-text-secondary">{expert.job_title}</span>
          </div>
        </div>
        <a
          href={`mailto:${expert.email}`}
          className="flex shrink-0 items-center gap-1.5 rounded-[6px] bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-status-warning hover:text-bg-primary"
        >
          <Mail className="h-3.5 w-3.5" />
          Contact
        </a>
      </div>
    </div>
  )
}
