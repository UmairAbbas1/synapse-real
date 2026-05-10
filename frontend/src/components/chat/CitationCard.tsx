"use client"

import * as React from "react"
import { ExternalLink, MessageSquare, Github, LayoutGrid, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Citation } from "@/lib/api-client"

export function CitationCard({ citation }: { citation: Citation }) {
  const getIcon = () => {
    const t = citation.source_type.toLowerCase()
    if (t === "slack") return <MessageSquare className="h-4 w-4 shrink-0 text-status-error" />
    if (t === "github") return <Github className="h-4 w-4 shrink-0 text-text-primary" />
    if (t === "jira") return <LayoutGrid className="h-4 w-4 shrink-0 text-info" />
    if (t === "gdrive" || t === "google_drive")
      return <FileText className="h-4 w-4 shrink-0 text-status-warning" />
    return <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
  }

  const pct = Math.round(citation.relevance_score * 100)
  let rel = ""
  try {
    rel = formatDistanceToNow(new Date(citation.timestamp), { addSuffix: true })
  } catch {
    rel = "recent"
  }

  return (
    <a
      href={citation.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col justify-between rounded-[12px] border border-border-medium bg-surface-1 p-3 transition-colors hover:border-accent-primary hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {getIcon()}
          <span className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent-primary">
            {citation.title}
          </span>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span className="truncate pr-2">
          {citation.source_type} · {citation.author || "Unknown"} · {rel}
        </span>
        <span className="shrink-0 rounded-[4px] bg-accent-muted px-1.5 py-0.5 font-mono text-[10px] text-accent-primary">
          {pct}% match
        </span>
      </div>
    </a>
  )
}
