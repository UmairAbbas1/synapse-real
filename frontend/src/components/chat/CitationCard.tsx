"use client"

import * as React from "react"
import { ExternalLink, MessageSquare, Github, LayoutGrid, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Citation } from "@/lib/api-client"

export function CitationCard({ citation }: { citation: Citation }) {
  const getIcon = () => {
    const t = citation.source_type.toLowerCase()
    if (t === "slack") return <MessageSquare className="h-4 w-4 shrink-0 text-[#E01E5A]" />
    if (t === "github") return <Github className="h-4 w-4 shrink-0 text-[#181717]" />
    if (t === "jira") return <LayoutGrid className="h-4 w-4 shrink-0 text-[#0052CC]" />
    if (t === "gdrive" || t === "google_drive")
      return <FileText className="h-4 w-4 shrink-0 text-[#34A853]" />
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
      className="group flex flex-col justify-between rounded-[16px] border border-border-medium bg-white/40 p-4 transition-all duration-300 hover:border-accent-primary hover:bg-white hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2 rounded-[10px] bg-white shadow-sm border border-border-subtle group-hover:bg-accent-muted transition-colors">
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
             <span className="truncate text-xs font-bold text-text-primary tracking-tight transition-colors group-hover:text-accent-primary">
              {citation.title}
            </span>
            <span className="text-[10px] text-text-tertiary uppercase font-mono tracking-wider mt-0.5">
              {citation.source_type}
            </span>
          </div>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 mt-1" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="h-1 w-1 rounded-full bg-text-tertiary" />
           <span className="text-[10px] font-medium text-text-secondary">
             {citation.author || "System"} · {rel}
           </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-accent-muted/50 border border-accent-primary/10 px-2 py-0.5">
           <div className="h-1 w-1 rounded-full bg-accent-primary" />
           <span className="font-mono text-[9px] font-bold text-accent-primary uppercase tracking-tighter">
            {pct}% Match
          </span>
        </div>
      </div>
    </a>
  )
}
