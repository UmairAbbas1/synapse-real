"use client"

import * as React from "react"
import { ExternalLink, MessageSquare, Github, LayoutGrid, FileText } from "lucide-react"
import { Citation } from "@/stores/chatStore"

export function CitationCard({ citation }: { citation: Citation }) {
  // Simple icon mapping based on source_type
  const getIcon = () => {
    switch (citation.source_type.toLowerCase()) {
      case "slack": return <MessageSquare className="h-4 w-4 shrink-0 text-[#E01E5A]" />
      case "github": return <Github className="h-4 w-4 shrink-0 text-text-primary" />
      case "jira": return <LayoutGrid className="h-4 w-4 shrink-0 text-[#0052CC]" />
      case "google_drive": return <FileText className="h-4 w-4 shrink-0 text-[#F4B400]" />
      default: return <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
    }
  }

  const percentage = Math.round(citation.relevance_score * 100)

  return (
    <a
      href={citation.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col justify-between rounded-[8px] bg-surface-1 border-l-[4px] border-l-accent-primary border border-border-subtle p-3 transition-colors hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {getIcon()}
          <span className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
            {citation.title}
          </span>
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span className="truncate max-w-[60%]">
          {citation.source_type} · {citation.author_name || "Unknown"} · {citation.created_at || "Recent"}
        </span>
        <span className="font-mono text-[10px] text-accent-muted bg-accent-primary/10 px-1.5 py-0.5 rounded">
          {percentage}% match
        </span>
      </div>
    </a>
  )
}
