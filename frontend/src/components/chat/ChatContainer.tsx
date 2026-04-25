"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@/hooks/useQuery"
import { MessageBubble } from "./MessageBubble"
import { QueryInput } from "./QueryInput"
import { ThinkingIndicator } from "./ThinkingIndicator"

export function ChatContainer() {
  const { messages, isLoading, isStreaming, error, submitQuery } = useQuery()
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom smoothly when messages update or streaming state changes
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages, isStreaming])

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-bg-primary overflow-hidden relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8"
      >
        <div className="mx-auto max-w-4xl flex flex-col w-full pb-10">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-1 shadow-[0_0_30px_var(--accent-muted)]">
                <span className="text-3xl font-black text-accent-primary">S</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Ask Synapse anything</h2>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Securely query your company's internal documents, Slack threads, and Jira tickets. 
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <ThinkingIndicator />
            </motion.div>
          )}

          {error && (
            <div className="mt-4 rounded-[8px] bg-status-error/10 border border-status-error/20 p-4 text-sm text-status-error text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 w-full">
        <QueryInput 
          onSubmit={submitQuery} 
          isStreaming={isStreaming} 
        />
      </div>
    </div>
  )
}
