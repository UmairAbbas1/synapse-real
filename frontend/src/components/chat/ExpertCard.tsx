"use client"

import * as React from "react"
import type { Expert } from "@/lib/api-client"
import { Avatar } from "@/components/ui/Avatar"

export function ExpertCard({ expert }: { expert: Expert }) {
  const slackHref =
    expert.slack_member_id && expert.slack_member_id.length > 0
      ? `slack://user?id=${encodeURIComponent(expert.slack_member_id)}`
      : `mailto:${encodeURIComponent(expert.email)}`

  return (
    <div className="mt-4 overflow-hidden rounded-[12px] border border-accent-primary/30 bg-surface-1">
      <div className="border-b border-border-subtle bg-accent-muted px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
          Suggested expert
        </p>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            initials={(() => {
              const parts = expert.name.trim().split(/\s+/).filter(Boolean)
              if (parts.length >= 2) {
                return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
              }
              if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
              return "?"
            })()}
            className="border-2 border-accent-primary text-accent-primary"
          />
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-text-primary">{expert.name}</span>
            <span className="block truncate text-xs text-text-secondary">{expert.job_title}</span>
          </div>
        </div>
        <a
          href={slackHref}
          className="inline-flex shrink-0 items-center justify-center rounded-[6px] border border-accent-primary bg-accent-muted px-4 py-2 text-xs font-bold text-accent-primary transition-all hover:bg-accent-primary hover:text-bg-primary hover:shadow-[0_0_12px_var(--accent-glow)]"
        >
          Contact via Slack
        </a>
      </div>
    </div>
  )
}
