"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { Menu, MessageSquare, Plus, LogOut, PanelLeftClose, PanelLeft } from "lucide-react"
import { useChatStore, useChatThreads } from "@/store/chat-store"
import { useAuthStore } from "@/store/auth-store"
import { useAuth } from "@/lib/hooks/useAuth"
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
  const messages = useChatStore((s) => s.messages)
  const isLoading = useChatStore((s) => s.isLoading)
  const sendQuery = useChatStore((s) => s.sendQuery)
  const newChat = useChatStore((s) => s.newChat)
  const selectSession = useChatStore((s) => s.selectSession)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const sessions = useChatThreads()
  const threads = React.useMemo(
    () => sessions.map(({ id, title }) => ({ id, title })),
    [sessions]
  )
  const user = useAuthStore((s) => s.user)
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
    <div className="flex h-screen max-h-screen overflow-hidden bg-bg-primary font-sans selection:bg-accent-muted">
      {/* Mobile overlay */}
      {mobileNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "glass-effect border-r border-border-medium shadow-2xl md:relative md:shadow-none",
          mobileNav ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && "md:w-[80px]"
        )}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-border-subtle/50">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
              <span className="text-lg font-bold tracking-tight text-text-primary uppercase">SYNAPSE</span>
            </div>
          ) : (
            <div className="mx-auto h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
          )}
          <button
            type="button"
            className="rounded-[8px] p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              newChat()
              setMobileNav(false)
            }}
            className="group relative flex w-full items-center justify-center gap-2 rounded-[12px] bg-accent-primary py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-[0_0_20px_var(--accent-glow)] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {sidebarOpen ? "New Dialogue" : null}
            <div className="absolute inset-0 rounded-[12px] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          <div className={cn("text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2 px-2", !sidebarOpen && "text-center")}>
            {sidebarOpen ? "Recent Threads" : "···"}
          </div>
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                selectSession(t.id)
                setMobileNav(false)
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-sm transition-all duration-300",
                activeSessionId === t.id
                  ? "bg-accent-muted text-accent-primary ring-1 ring-accent-primary/20"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              )}
            >
              <MessageSquare className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", activeSessionId === t.id ? "text-accent-primary" : "text-text-tertiary")} />
              {sidebarOpen ? <span className="truncate font-medium">{t.title}</span> : null}
            </button>
          ))}
        </div>

        <div className="border-t border-border-subtle/50 p-6 bg-white/5 shadow-inner">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-primary border-2 border-border-medium font-mono text-sm font-bold text-accent-primary shadow-sm">
              {user?.display_name?.charAt(0) ?? "U"}
            </div>
            {sidebarOpen ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary leading-tight">{user?.display_name}</p>
                <p className="truncate text-[10px] font-mono text-text-tertiary uppercase mt-0.5 tracking-wider">{user?.role}</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className={cn(
              "group mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] border border-border-medium py-2.5 text-xs font-bold text-text-secondary transition-all duration-300 hover:border-error hover:text-error hover:bg-error/5 active:scale-95",
              !sidebarOpen && "px-0"
            )}
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {sidebarOpen ? "Terminate Session" : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex h-20 items-center justify-between border-b border-border-medium px-8 md:hidden">
          <button
            type="button"
            className="rounded-[10px] p-2.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-300"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
            <span className="font-bold text-text-primary uppercase tracking-tight">SYNAPSE</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-12 scroll-smooth">
          <div className="mx-auto max-w-4xl pb-32">
            {messages.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center animate-slide-up">
                <div className="relative group mb-10">
                  <div className="absolute inset-0 bg-accent-primary/20 blur-2xl rounded-full scale-150 group-hover:scale-175 transition-transform duration-1000" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[20px] bg-white border border-border-medium shadow-2xl transition-transform duration-700 group-hover:rotate-12">
                    <span className="font-sans text-5xl font-black text-accent-primary">S</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-text-primary tracking-tighter">How can I assist you, {user?.display_name?.split(' ')[0]}?</h2>
                  <p className="max-w-md text-base text-text-secondary leading-relaxed">
                    Grounding intelligence in your local environment. Select a prompt below or start a new inquiry.
                  </p>
                </div>
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendQuery(q)}
                      className="group flex items-center justify-between rounded-[16px] border border-border-medium bg-white p-5 text-left transition-all duration-300 hover:border-accent-primary hover:shadow-xl hover:-translate-y-1 active:scale-95 shadow-sm"
                    >
                      <span className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">{q}</span>
                      <Plus className="h-4 w-4 text-text-tertiary group-hover:text-accent-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <MessageBubble message={msg} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="h-8 w-8 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
                      <div className="h-4 w-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="flex gap-1 items-center mt-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-primary/40 animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-primary/60 animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-bounce" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
          <div className="mx-auto max-w-4xl pointer-events-auto">
            <div className="glass-effect rounded-[20px] shadow-2xl p-1 border-border-strong overflow-hidden transition-all duration-300 hover:shadow-accent-glow/20">
               <QueryInput onSubmit={(q) => void sendQuery(q)} isLoading={isLoading} />
            </div>
            <p className="mt-4 text-center text-[10px] text-text-tertiary uppercase tracking-[0.2em] font-mono">
              Synapse AI may hallucinate · Local Deployment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
