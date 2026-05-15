"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, MessageSquare, Plus, LogOut, PanelLeftClose, PanelLeft, ChatBubbleOutline } from "lucide-react"
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
    <div className="flex h-screen max-h-screen overflow-hidden bg-background font-body-md text-on-background selection:bg-primary-container/30">
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
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col transition-all duration-300 ease-in-out",
          "bg-surface/80 backdrop-blur-2xl border-r border-white/20 shadow-2xl md:relative md:shadow-none",
          mobileNav ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          !sidebarOpen && "md:w-[80px]"
        )}
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-outline-variant/20">
          {sidebarOpen ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">smart_toy</span>
              </div>
              <div>
                <h2 className="font-headline-md text-[18px] text-primary leading-tight font-semibold">Synapse</h2>
                <p className="font-label-sm text-[11px] text-secondary tracking-widest uppercase">Enterprise</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
            </div>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface-variant hover:bg-white/5 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              newChat()
              setMobileNav(false)
            }}
            className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3 text-sm font-semibold text-on-primary-container transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(0,229,204,0.15)]"
          >
            <Plus className="h-4 w-4" />
            {sidebarOpen ? "New Dialogue" : null}
          </button>
          
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface py-3 text-sm font-semibold text-on-surface transition-all hover:border-primary hover:text-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              {sidebarOpen ? "Admin Console" : null}
            </Link>
          )}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          <div className={cn("font-label-sm text-[11px] text-secondary uppercase tracking-widest mb-2 px-2", !sidebarOpen && "text-center")}>
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
                "group flex w-full items-center gap-4 p-3 rounded-lg transition-all duration-300 ease-in-out",
                activeSessionId === t.id
                  ? "bg-primary-container/30 text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              )}
            >
              <MessageSquare className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110")} />
              {sidebarOpen ? <span className="truncate font-body-md text-[14px]">{t.title}</span> : null}
            </button>
          ))}
        </div>

        <div className="border-t border-outline-variant/20 p-6 bg-white/5">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container font-mono text-sm font-bold text-primary">
              {user?.display_name?.charAt(0) ?? "U"}
            </div>
            {sidebarOpen ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-on-surface leading-tight">{user?.display_name}</p>
                <p className="truncate text-[11px] font-mono text-secondary uppercase mt-0.5 tracking-wider">{user?.role}</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className={cn(
              "group mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/50 py-2.5 text-xs font-semibold text-secondary transition-all hover:border-error hover:text-error hover:bg-error/5 active:scale-95",
              !sidebarOpen && "px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen ? "Sign Out" : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col relative bg-background">
        <header className="flex h-16 items-center justify-between border-b border-outline-variant/20 px-6 bg-surface/80 backdrop-blur-xl md:hidden sticky top-0 z-40">
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface hover:bg-primary/10 transition-colors"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-headline-md text-[18px] font-semibold text-on-surface">Synapse</span>
          </div>
          <div className="w-10" />
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-12 scroll-smooth">
          <div className="mx-auto max-w-[800px] pb-40">
            {messages.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center animate-slide-up">
                <div className="relative group mb-8">
                  <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center shadow-lg transition-transform duration-700 group-hover:rotate-12">
                     <span className="material-symbols-outlined text-[40px] text-on-primary-container">smart_toy</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-[24px] font-semibold text-on-surface tracking-tight">How can I assist you, {user?.display_name?.split(' ')[0]}?</h2>
                  <p className="max-w-md text-[14px] text-secondary leading-relaxed">
                    Grounding intelligence in your enterprise graph.
                  </p>
                </div>
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendQuery(q)}
                      className="group flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface p-5 text-left transition-all duration-300 hover:border-primary hover:shadow-md active:scale-95"
                    >
                      <span className="text-[14px] font-semibold text-on-surface group-hover:text-primary transition-colors">{q}</span>
                      <Plus className="h-4 w-4 text-secondary group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
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
                    className="flex flex-col gap-4"
                  >
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-container rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-on-primary-container">smart_toy</span>
                        </div>
                        <span className="font-label-sm text-[12px] font-semibold text-primary">Synapse</span>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/20 w-fit flex gap-1 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                      </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 w-full px-margin-mobile pb-8 bg-gradient-to-t from-background via-background/90 to-transparent pt-10">
          <div className="max-w-[800px] mx-auto pointer-events-auto">
            <div className="relative bg-surface/80 backdrop-blur-[20px] rounded-xl border border-outline-variant/40 shadow-lg p-2 transition-all flex">
               <QueryInput onSubmit={(q) => void sendQuery(q)} isLoading={isLoading} />
            </div>
            <p className="mt-4 text-center font-label-sm text-[11px] text-secondary uppercase tracking-widest">
              Synapse Intelligence · Local Deployment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
