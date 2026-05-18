"use client"

import * as React from "react"
import Link from "next/link"
import { getApiClient } from "@/lib/api-client"
import { useChatStore } from "@/store/chat-store"

export default function HistoryPage() {
  const [items, setItems] = React.useState<
    { id: string; title: string; updated_at: string; message_count: number }[]
  >([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const loadConversations = useChatStore((s) => s.loadConversations)
  const selectSession = useChatStore((s) => s.selectSession)
  const sessions = useChatStore((s) => s.sessions)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await loadConversations()
        const list = await getApiClient().listConversations()
        if (!cancelled) setItems(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load history")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadConversations])

  const openInChat = (serverId: string) => {
    const match = sessions.find((s) => s.serverId === serverId)
    if (match) {
      selectSession(match.id)
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-on-surface">History</h1>
        <p className="text-sm text-on-surface-variant">Saved conversations from your account</p>
      </header>

      {loading ? <p className="text-sm text-on-surface-variant">Loading…</p> : null}
      {error ? <p className="text-sm text-status-error">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No conversations yet. Start one in Chat.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3"
          >
            <div>
              <p className="font-medium text-on-surface">{item.title}</p>
              <p className="text-xs text-on-surface-variant">
                {item.message_count} messages · {new Date(item.updated_at).toLocaleString()}
              </p>
            </div>
            <Link
              href="/chat"
              onClick={() => openInChat(item.id)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
