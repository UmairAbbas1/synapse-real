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
    <div className={cn("group flex w-full py-8", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[90%] gap-6 animate-fade-in", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className="mt-1 shrink-0">
          {isUser ? (
            <div className="relative">
               <Avatar initials={user?.display_name?.charAt(0) || "U"} className="h-10 w-10 ring-2 ring-accent-primary/20 shadow-lg" />
               <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-status-success border-2 border-white shadow-sm" />
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-accent-primary/40 blur-md rounded-full group-hover:blur-lg transition-all" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary font-sans text-sm font-black text-white shadow-xl">
                S
              </div>
            </div>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-col gap-3", isUser ? "items-end" : "w-full")}>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.15em]">
              {isUser ? user?.display_name || "Authorized User" : "Synapse Intelligence"}
            </span>
            {message.content && !isUser ? (
              <button
                type="button"
                onClick={() => void copyContent()}
                className="rounded-full p-1.5 text-text-tertiary opacity-0 transition-all hover:bg-bg-hover hover:text-text-primary group-hover:opacity-100 focus:opacity-100"
              >
                {copied ? <Check className="h-3 w-3 text-status-success" /> : <Copy className="h-3 w-3" />}
              </button>
            ) : null}
          </div>

          {isUser ? (
            <div className="rounded-[20px] rounded-tr-[4px] bg-accent-primary px-6 py-4 text-sm font-medium text-white shadow-lg shadow-accent-primary/10 leading-relaxed max-w-2xl">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="w-full text-sm text-text-primary">
              {message.status === "thinking" ? (
                <div className="rounded-[20px] border border-border-medium bg-bg-primary/50 backdrop-blur-md px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-1">
                     {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-accent-primary"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Processing Context...</span>
                </div>
              ) : null}

              {message.status === "streaming" || message.status === "done" || message.status === "error" ? (
                <div
                  className={cn(
                    "rounded-[20px] border border-border-medium bg-white px-8 py-6 shadow-sm transition-all duration-500",
                    message.status === "error" && "border-status-error/40 bg-status-error/5 shadow-none"
                  )}
                >
                  {message.status === "error" ? (
                    <div className="flex items-center gap-3 text-status-error">
                      <div className="h-2 w-2 rounded-full bg-status-error animate-pulse" />
                      <p className="font-semibold uppercase text-[10px] tracking-widest">{message.content}</p>
                    </div>
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <MarkdownRenderer content={message.content} />
                      {message.status === "streaming" ? (
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-accent-primary rounded-full align-middle" />
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                {conf && (
                  <div className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm",
                    conf.className
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", conf.className.split(' ')[1])} />
                    {conf.text}
                  </div>
                )}
                
                {latencySec !== null && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border-medium bg-bg-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                    Latency: {latencySec}s
                  </div>
                )}

                {sourceCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCitations(!showCitations)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                      showCitations 
                        ? "bg-accent-primary text-white border-accent-primary shadow-lg shadow-accent-primary/20" 
                        : "bg-white text-text-secondary border-border-medium hover:border-accent-primary hover:text-accent-primary"
                    )}
                  >
                    {sourceCount} Documents Grounded
                    {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {message.expert && (
                <div className="mt-6 border-l-2 border-accent-primary/20 pl-6">
                  <div className="mb-3 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Expert Node Analysis</div>
                  <ExpertCard expert={message.expert} />
                </div>
              )}

              {showCitations && citations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className="h-px w-full bg-gradient-to-r from-border-medium via-transparent to-transparent" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    {displayedCitations.map((citation, idx) => (
                      <CitationCard key={`${citation.source_url}-${String(idx)}`} citation={citation} />
                    ))}
                  </div>
                  {moreCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedCitations(!expandedCitations)}
                      className="text-[11px] font-bold text-accent-primary uppercase tracking-widest hover:underline px-2"
                    >
                      {expandedCitations ? "Collate Results" : `Verify ${moreCount} More Sources`}
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
