"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import type { Message } from "@/store/chat-store"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { CitationCard } from "./CitationCard"
import { ExpertCard } from "./ExpertCard"
import { Avatar } from "@/components/ui/Avatar"
import { Tooltip } from "@/components/ui/Tooltip"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

const MAX_CITATION_PREVIEW = 5

function confidenceLabel(c: number): { text: string; className: string } {
  if (c > 0.75) return { text: "High confidence", className: "bg-status-success/15 text-status-success border-status-success/30" }
  if (c >= 0.65) return { text: "Medium confidence", className: "bg-status-warning/15 text-status-warning border-status-warning/30" }
  return { text: "Low confidence", className: "bg-status-error/15 text-status-error border-status-error/30" }
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const { user } = useAuthStore()
  const [showCitations, setShowCitations] = React.useState(false)
  const [expandedCitations, setExpandedCitations] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const citations = message.citations ?? []
  const previewCount = expandedCitations ? citations.length : Math.min(MAX_CITATION_PREVIEW, citations.length)
  const displayedCitations = citations.slice(0, previewCount)
  const moreCount = citations.length > MAX_CITATION_PREVIEW ? citations.length - MAX_CITATION_PREVIEW : 0

  const copyContent = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const conf =
    message.confidence !== undefined && message.status === "done"
      ? confidenceLabel(message.confidence)
      : null

  const latencySec =
    message.latency_ms !== undefined ? (message.latency_ms / 1000).toFixed(1) : null
  const sourceCount = citations.length

  return (
    <div className={cn("group flex w-full py-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className="mt-1 shrink-0">
          {isUser ? (
            <Avatar initials={user?.display_name?.charAt(0) || "U"} className="h-8 w-8" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary font-mono text-xs font-black text-bg-primary">
              S
            </div>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-col gap-2", isUser ? "items-end" : "w-full")}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">
              {isUser ? user?.display_name || "You" : "Synapse"}
            </span>
            {message.content ? (
              <button
                type="button"
                onClick={() => void copyContent()}
                className="rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface-2 hover:text-text-primary group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                title="Copy"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>

          {isUser ? (
            <div className="rounded-[12px] rounded-tr-[4px] bg-accent-muted px-5 py-3 text-sm text-text-primary">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="w-full text-sm text-text-primary">
              {message.status === "thinking" ? (
                <div className="rounded-[12px] border border-border-medium bg-surface-1 px-4 py-3">
                  <span className="text-text-secondary">Thinking</span>
                  <span className="ml-1 inline-flex gap-0.5 align-middle">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="inline-block h-1.5 w-1.5 rounded-full bg-accent-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              ) : null}

              {message.status === "streaming" || message.status === "done" || message.status === "error" ? (
                <div
                  className={cn(
                    "rounded-[12px] border border-border-medium bg-surface-1 px-4 py-3",
                    message.status === "error" && "border-status-error/40 bg-status-error/5"
                  )}
                >
                  {message.status === "error" ? (
                    <p className="text-status-error">{message.content}</p>
                  ) : (
                    <div>
                      <MarkdownRenderer content={message.content} />
                      {message.status === "streaming" ? (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent-primary align-middle" />
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {conf && latencySec !== null ? (
                <Tooltip
                  content={`Answered in ${latencySec}s using ${String(sourceCount)} sources`}
                  side="bottom"
                >
                  <span
                    className={cn(
                      "mt-2 inline-flex cursor-default rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      conf.className
                    )}
                  >
                    {conf.text}
                  </span>
                </Tooltip>
              ) : null}

              {message.expert ? (
                <div className="mt-4">
                  <ExpertCard expert={message.expert} />
                </div>
              ) : null}

              {citations.length > 0 ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCitations(!showCitations)}
                    className="flex items-center gap-2 text-xs font-semibold text-text-secondary transition-colors hover:text-accent-primary focus:outline-none"
                  >
                    {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Sources ({citations.length})
                  </button>

                  {showCitations ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {displayedCitations.map((citation, idx) => (
                        <CitationCard key={`${citation.source_url}-${String(idx)}`} citation={citation} />
                      ))}
                    </motion.div>
                  ) : null}

                  {showCitations && moreCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedCitations(!expandedCitations)}
                      className="mt-3 text-xs font-bold text-accent-primary hover:underline focus:outline-none"
                    >
                      {expandedCitations ? "Show fewer" : `Show ${String(moreCount)} more`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
