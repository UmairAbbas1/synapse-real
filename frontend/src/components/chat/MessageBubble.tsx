"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Message } from "@/stores/chatStore"
import { MarkdownRenderer } from "./MarkdownRenderer"
import { CitationCard } from "./CitationCard"
import { ExpertCard } from "./ExpertCard"
import { Avatar } from "@/components/ui/Avatar"
import { useAuth } from "@/hooks/useAuth"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const { user } = useAuth()
  const [showCitations, setShowCitations] = React.useState(false)

  return (
    <div className={cn("group flex w-full py-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] gap-4", isUser ? "flex-row-reverse" : "flex-row w-full")}>
        {/* Avatar */}
        <div className="shrink-0 mt-1">
          {isUser ? (
            <Avatar initials={user?.displayName?.charAt(0) || "U"} className="h-8 w-8" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-bg-primary font-black text-xs">
              S
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "w-full min-w-0")}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">
              {isUser ? user?.displayName || "You" : "Synapse"}
            </span>
            <span className="text-xs text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
              {format(message.timestamp, "h:mm a")}
            </span>
          </div>

          {isUser ? (
            <div className="rounded-[16px] rounded-tr-[4px] bg-surface-2 px-5 py-3 text-sm text-text-primary shadow-sm whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="w-full text-sm text-text-primary">
              <MarkdownRenderer content={message.content} />
              
              {/* Citations Section */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowCitations(!showCitations)}
                    className="flex items-center gap-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary focus:outline-none"
                  >
                    {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {message.citations.length} Sources
                  </button>
                  
                  {showCitations && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {message.citations.map((citation, idx) => (
                        <CitationCard key={`${citation.source_id}-${idx}`} citation={citation} />
                      ))}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Expert Routing Section */}
              {message.expert && (
                <div className="mt-4">
                  <ExpertCard expert={message.expert} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
