import { create } from "zustand"
import type { Citation, Expert } from "@/lib/api-client"
import { getApiClient } from "@/lib/api-client"
import { useAuthStore } from "@/store/auth-store"

export type MessageStatus = "thinking" | "streaming" | "done" | "error"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  expert?: Expert | null
  confidence?: number
  latency_ms?: number
  status: MessageStatus
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  /** Server conversation id when persisted */
  serverId?: string
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  isLoading: boolean
  isHydrating: boolean
  messages: Message[]
  loadConversations: () => Promise<void>
  sendQuery: (text: string) => Promise<void>
  clearChat: () => void
  newChat: () => void
  selectSession: (id: string) => void
}

function makeId(): string {
  return crypto.randomUUID()
}

function withUpdatedSession(
  sessions: ChatSession[],
  sessionId: string,
  updater: (s: ChatSession) => ChatSession
): ChatSession[] {
  return sessions.map((s) => (s.id === sessionId ? updater(s) : s))
}

function mapServerMessage(m: {
  id: string
  role: string
  content: string
  extra: Record<string, unknown> | null
}): Message {
  const extra = m.extra ?? {}
  return {
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    citations: Array.isArray(extra.citations) ? (extra.citations as Citation[]) : undefined,
    expert: (extra.expert as Expert | null | undefined) ?? undefined,
    confidence: typeof extra.confidence === "number" ? extra.confidence : undefined,
    latency_ms: typeof extra.latency_ms === "number" ? extra.latency_ms : undefined,
    status: "done",
  }
}

async function ensureServerConversation(sessionId: string): Promise<string | null> {
  const state = useChatStore.getState()
  const session = state.sessions.find((s) => s.id === sessionId)
  if (!session) return null
  if (session.serverId) return session.serverId

  try {
    const created = await getApiClient().createConversation(session.title)
    useChatStore.setState((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === sessionId ? { ...sess, serverId: created.id } : sess
      ),
    }))
    return created.id
  } catch {
    return null
  }
}

async function persistTurn(
  sessionId: string,
  userText: string,
  assistant: Message
): Promise<void> {
  const serverId = await ensureServerConversation(sessionId)
  if (!serverId) return

  const client = getApiClient()
  try {
    await client.appendConversationMessage(serverId, {
      role: "user",
      content: userText,
    })
    await client.appendConversationMessage(serverId, {
      role: "assistant",
      content: assistant.content,
      extra: {
        citations: assistant.citations ?? [],
        expert: assistant.expert ?? null,
        confidence: assistant.confidence ?? null,
        latency_ms: assistant.latency_ms ?? null,
        status: assistant.status,
      },
    })
    const session = useChatStore.getState().sessions.find((s) => s.id === sessionId)
    if (session && session.title === "New conversation") {
      const title = userText.trim().slice(0, 48) + (userText.trim().length > 48 ? "…" : "")
      await client.updateConversationTitle(serverId, title)
      useChatStore.setState((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === sessionId ? { ...sess, title } : sess
        ),
      }))
    }
  } catch {
    /* non-fatal — chat still works in UI */
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  isHydrating: false,
  messages: [],

  loadConversations: async () => {
    if (!useAuthStore.getState().token) return
    set({ isHydrating: true })
    try {
      const list = await getApiClient().listConversations()
      const sessions: ChatSession[] = await Promise.all(
        list.map(async (summary) => {
          try {
            const detail = await getApiClient().getConversation(summary.id)
            return {
              id: makeId(),
              serverId: detail.id,
              title: detail.title,
              messages: detail.messages.map(mapServerMessage),
            }
          } catch {
            return {
              id: makeId(),
              serverId: summary.id,
              title: summary.title,
              messages: [],
            }
          }
        })
      )
      const active = sessions[0] ?? null
      set({
        sessions,
        activeSessionId: active?.id ?? null,
        messages: active ? [...active.messages] : [],
        isHydrating: false,
      })
    } catch {
      set({ isHydrating: false })
    }
  },

  selectSession: (id) => {
    const sess = get().sessions.find((s) => s.id === id)
    set({
      activeSessionId: id,
      messages: sess ? [...sess.messages] : [],
    })
  },

  newChat: () => {
    const id = makeId()
    const session: ChatSession = { id, title: "New conversation", messages: [] }
    set((s) => ({
      sessions: [session, ...s.sessions].slice(0, 30),
      activeSessionId: id,
      messages: [],
    }))
  },

  clearChat: () => {
    const id = get().activeSessionId
    if (!id) {
      set({ messages: [] })
      return
    }
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, messages: [] } : sess)),
      messages: [],
    }))
  },

  sendQuery: async (text) => {
    if (!text.trim()) return
    if (!useAuthStore.getState().token) return

    let sessionId = get().activeSessionId
    if (!sessionId) {
      sessionId = makeId()
      const session: ChatSession = { id: sessionId, title: "New conversation", messages: [] }
      set((s) => ({
        sessions: [session, ...s.sessions],
        activeSessionId: sessionId,
        messages: [],
      }))
    }

    const titleFromQuery = text.trim().slice(0, 48) + (text.trim().length > 48 ? "…" : "")

    const userMessage: Message = {
      id: makeId(),
      role: "user",
      content: text.trim(),
      status: "done",
    }

    const assistantId = makeId()
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "thinking",
    }

    set((s) => {
      const nextMessages = [...s.messages, userMessage, assistantPlaceholder]
      const sessions = withUpdatedSession(s.sessions, sessionId!, (sess) => ({
        ...sess,
        title: sess.title === "New conversation" ? titleFromQuery : sess.title,
        messages: nextMessages,
      }))
      return { sessions, messages: nextMessages, isLoading: true }
    })

    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now()
    const client = getApiClient()

    const updateAssistant = (patch: Partial<Message>) => {
      set((s) => {
        const msgs = s.messages.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
        const sessions = withUpdatedSession(s.sessions, sessionId!, (sess) => ({
          ...sess,
          messages: msgs,
        }))
        return { messages: msgs, sessions }
      })
    }

    await client.queryStream(text.trim(), {
      onRetrieval: () => {
        updateAssistant({ status: "streaming" })
      },
      onToken: (token) => {
        const last = get().messages.find((m) => m.id === assistantId)
        const nextContent = (last?.content ?? "") + token
        updateAssistant({ content: nextContent, status: "streaming" })
      },
      onComplete: (data) => {
        const latency_ms = Math.round(
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
        )
        const finalAssistant: Message = {
          id: assistantId,
          role: "assistant",
          content: get().messages.find((m) => m.id === assistantId)?.content ?? "",
          citations: data.citations,
          expert: data.expert,
          confidence: data.confidence,
          latency_ms,
          status: "done",
        }
        updateAssistant({
          citations: data.citations,
          expert: data.expert,
          confidence: data.confidence,
          latency_ms,
          status: "done",
        })
        set({ isLoading: false })
        void persistTurn(sessionId!, text.trim(), finalAssistant)
      },
      onError: (msg) => {
        updateAssistant({ content: msg, status: "error" })
        set({ isLoading: false })
      },
    })
  },
}))

export function useChatThreads() {
  return useChatStore((s) => s.sessions)
}
