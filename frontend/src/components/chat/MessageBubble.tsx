"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import type { Message } from "@/store/chat-store"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { CitationCard } from "./CitationCard"
import { ExpertCard } from "./ExpertCard"
import { Avatar } from "@/components/ui/Avatar"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

const MAX_CITATION_PREVIEW = 5

function confidenceLabel(c: number): { text: string; className: string } {
  if (c > 0.75) return { text: "High confidence", className: "bg-[#15803d]/10 text-[#15803d]" }
  if (c >= 0.65) return { text: "Medium confidence", className: "bg-[#d97706]/10 text-[#d97706]" }
  return { text: "Low confidence", className: "bg-[#dc2626]/10 text-[#dc2626]" }
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

  if (isUser) {
    return (
      <div className="flex justify-end w-full py-4">
        <div className="max-w-[85%] bg-surface/80 backdrop-blur-[20px] rounded-xl p-4 border border-outline-variant/30 shadow-sm flex flex-col gap-2">
           <div className="flex items-center gap-2 self-end mb-1">
             <span className="font-label-sm text-[11px] text-secondary uppercase tracking-widest">{user?.display_name || "Authorized User"}</span>
           </div>
           <p className="font-body-md text-[14px] text-on-surface whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-container rounded-full flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <span className="font-label-sm text-[12px] font-semibold text-primary">Synapse AI</span>
        </div>
        {message.content && (
          <button
            type="button"
            onClick={() => void copyContent()}
            className="p-1.5 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-[#15803d]" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="space-y-4 max-w-[95%]">
        {message.status === "thinking" ? (
           <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20 w-fit flex gap-2 items-center">
             <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                 <motion.div
                   key={i}
                   className="h-1.5 w-1.5 rounded-full bg-primary"
                   animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                   transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                 />
               ))}
             </div>
             <span className="font-label-sm text-[11px] text-secondary uppercase tracking-widest ml-2">Processing Context...</span>
           </div>
        ) : null}

        {message.status === "streaming" || message.status === "done" || message.status === "error" ? (
          <div
            className={cn(
              "bg-surface/80 backdrop-blur-[20px] rounded-xl p-5 border shadow-sm transition-all duration-500",
              message.status === "error" ? "border-[#dc2626]/40 bg-[#dc2626]/5" : "border-outline-variant/30"
            )}
          >
            {message.status === "error" ? (
              <div className="flex items-center gap-3 text-[#dc2626]">
                <div className="h-2 w-2 rounded-full bg-[#dc2626] animate-pulse" />
                <p className="font-label-sm uppercase text-[11px] tracking-widest">{message.content}</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-on-surface font-body-md text-[14px] leading-relaxed">
                <MarkdownRenderer content={message.content} />
                {message.status === "streaming" ? (
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary rounded-full align-middle" />
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {conf && (
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono-md text-[11px] font-medium border border-outline-variant/30",
              conf.className
            )}>
              <div className="h-1.5 w-1.5 rounded-full bg-current" />
              {conf.text}
            </div>
          )}
          
          {latencySec !== null && (
            <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface px-3 py-1 font-mono-md text-[11px] text-secondary">
              Latency: {latencySec}s
            </div>
          )}

          {sourceCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCitations(!showCitations)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono-md text-[11px] font-medium transition-all",
                showCitations 
                  ? "bg-primary-container text-on-primary-container border-primary-container" 
                  : "bg-surface text-secondary border-outline-variant/30 hover:border-primary hover:text-primary"
              )}
            >
              {sourceCount} Documents Grounded
              {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {message.expert && (
          <div className="mt-4 border-l-2 border-primary/20 pl-4">
            <div className="mb-2 font-label-sm text-[11px] text-secondary uppercase tracking-widest">Expert Node Analysis</div>
            <ExpertCard expert={message.expert} />
          </div>
        )}

        {showCitations && citations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-4"
          >
            <div className="h-px w-full bg-outline-variant/20" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {displayedCitations.map((citation, idx) => (
                <CitationCard key={`${citation.source_url}-${String(idx)}`} citation={citation} />
              ))}
            </div>
            {moreCount > 0 && (
              <button
                type="button"
                onClick={() => setExpandedCitations(!expandedCitations)}
                className="font-label-sm text-[11px] text-primary uppercase tracking-widest hover:underline px-2"
              >
                {expandedCitations ? "Collate Results" : `Verify ${moreCount} More Sources`}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
