"use client"

import * as React from "react"
import { Command } from "cmdk"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { MessageSquare, Clock, Settings, Network, Search, Moon, Sun, Trash2, LogOut } from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { useAuth } from "@/hooks/useAuth"
import { useChatStore } from "@/store/chat-store"

export function CommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const router = useRouter()
  const { theme, toggleTheme } = useUIStore()
  const { logout } = useAuth()
  const { messages, clearChat } = useChatStore()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isOpen])

  const runCommand = React.useCallback((command: () => void) => {
    setIsOpen(false)
    command()
  }, [])

  // Extract recent queries (last 5 user messages)
  const recentQueries = React.useMemo(() => {
    return messages
      .filter((m) => m.role === "user")
      .slice(-5)
      .reverse()
  }, [messages])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] sm:pt-[25vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-glass-bg backdrop-blur-[20px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-xl overflow-hidden rounded-[12px] bg-surface-1 shadow-2xl ring-1 ring-border-strong mx-4"
          >
            <Command 
              className="flex h-full w-full flex-col bg-transparent"
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false)
              }}
            >
              <div className="flex items-center border-b border-border-subtle px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 text-text-tertiary" />
                <Command.Input
                  autoFocus
                  value={search}
                  onValueChange={setSearch}
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-text-tertiary text-text-primary"
                  placeholder="Search Synapse or type a command..."
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 cmdk-list">
                <Command.Empty className="py-6 text-center text-sm text-text-secondary">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation">
                  <Command.Item onSelect={() => runCommand(() => router.push("/chat"))}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Go to Chat
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push("/history"))}>
                    <Clock className="mr-2 h-4 w-4" /> Go to History
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push("/admin"))}>
                    <Settings className="mr-2 h-4 w-4" /> Go to Admin Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push("/admin/graph"))}>
                    <Network className="mr-2 h-4 w-4" /> Go to Knowledge Graph
                  </Command.Item>
                </Command.Group>

                {recentQueries.length > 0 && (
                  <Command.Group heading="Recent Queries">
                    {recentQueries.map((q) => (
                      <Command.Item 
                        key={q.id} 
                        onSelect={() => runCommand(() => {
                          // Could pre-fill chat input or navigate to specific history item
                          router.push("/chat")
                        })}
                      >
                        <Search className="mr-2 h-4 w-4 text-text-tertiary" /> 
                        <span className="truncate">{q.content}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Actions">
                  <Command.Item onSelect={() => runCommand(() => toggleTheme())}>
                    {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    Toggle {theme === "dark" ? "Light" : "Dark"} Mode
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => clearChat())}>
                    <Trash2 className="mr-2 h-4 w-4 text-status-error" />
                    Clear Chat History
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => logout())}>
                    <LogOut className="mr-2 h-4 w-4 text-status-error" />
                    Sign Out
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
