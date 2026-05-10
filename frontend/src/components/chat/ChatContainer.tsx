"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { Menu, MessageSquare, Plus, LogOut, PanelLeftClose, PanelLeft } from "lucide-react"
import { useChatStore, useChatThreads } from "@/store/chat-store"
import { useAuthStore } from "@/store/auth-store"
import { useAuth } from "@/hooks/useAuth"
import { MessageBubble } from "./MessageBubble"
import { QueryInput } from "./QueryInput"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  "What's our deployment process?",
  "How do I request PTO?",
  "What's the Q1 roadmap?",
  "How do I set up local dev?",
]

export function ChatContainer() {
  const { messages, isLoading, sendQuery, newChat, selectSession, activeSessionId } = useChatStore()
  const threads = useChatThreads()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [mobileNav, setMobileNav] = React.useState(false)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-bg-primary">
      {/* Mobile overlay */}
      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-bg-primary/70 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border-medium bg-bg-secondary transition-transform md:relative md:translate-x-0",
          mobileNav ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && "md:w-[72px]"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border-subtle px-3">
          {sidebarOpen ? (
            <span className="font-sans text-lg font-black tracking-tight text-accent-primary">SYNAPSE</span>
          ) : (
            <span className="font-sans text-lg font-black text-accent-primary">S</span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary md:inline-flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className="rounded-md p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary md:hidden"
              onClick={() => setMobileNav(false)}
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => {
              newChat()
              setMobileNav(false)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent-primary py-2.5 text-sm font-bold text-bg-primary transition-all hover:bg-accent-hover hover:shadow-[0_0_15px_var(--accent-glow)]"
          >
            <Plus className="h-4 w-4" />
            {sidebarOpen ? "New Chat" : null}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                selectSession(t.id)
                setMobileNav(false)
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-sm transition-colors",
                activeSessionId === t.id
                  ? "bg-surface-2 text-accent-primary"
                  : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {sidebarOpen ? <span className="truncate">{t.title}</span> : null}
            </button>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className={cn("flex items-center gap-2", !sidebarOpen && "justify-center")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-primary font-mono text-xs font-bold text-accent-primary">
              {user?.display_name?.charAt(0) ?? "U"}
            </div>
            {sidebarOpen ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{user?.display_name}</p>
                <p className="truncate text-xs text-text-tertiary">{user?.email}</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-[6px] border border-border-medium py-2 text-sm font-bold text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary",
              !sidebarOpen && "px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen ? "Log out" : null}
          </button>
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin/sources"
              className="mt-2 block rounded-[6px] py-2 text-center text-xs font-semibold text-accent-primary hover:underline"
            >
              {sidebarOpen ? "Admin →" : "·"}
            </Link>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border-subtle px-3 md:hidden">
          <button
            type="button"
            className="rounded-md p-2 text-text-secondary hover:bg-surface-2"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-text-primary">Chat</span>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          <div className="mx-auto max-w-4xl pb-8">
            {messages.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[12px] border border-border-medium bg-surface-1">
                  <span className="font-sans text-3xl font-black text-accent-primary">S</span>
                </div>
                <h2 className="text-lg font-bold text-text-primary">SYNAPSE</h2>
                <p className="mt-2 max-w-md text-sm text-text-secondary">
                  Ask questions grounded in your internal documents.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendQuery(q)}
                      className="rounded-full border border-border-medium bg-surface-1 px-4 py-2 text-left text-xs font-semibold text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MessageBubble message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <QueryInput onSubmit={(q) => void sendQuery(q)} isLoading={isLoading} />
      </div>
    </div>
  )
}
