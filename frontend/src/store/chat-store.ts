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
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  isLoading: boolean
  /** Messages for the active session (derived helper via selector). */
  messages: Message[]
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

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  messages: [],

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
        updateAssistant({
          citations: data.citations,
          expert: data.expert,
          confidence: data.confidence,
          latency_ms,
          status: "done",
        })
        set({ isLoading: false })
      },
      onError: (msg) => {
        updateAssistant({ content: msg, status: "error" })
        set({ isLoading: false })
      },
    })
  },
}))

/** Thread list for sidebar */
export function useChatThreads() {
  return useChatStore((s) => s.sessions)
}
