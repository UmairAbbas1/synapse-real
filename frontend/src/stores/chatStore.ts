import { create } from 'zustand'

export interface Citation {
  source_id: string
  source_type: string
  source_url: string
  title: string
  author_name?: string
  created_at?: string
  relevance_score: number
}

export interface Expert {
  id: string
  name: string
  job_title: string
  email: string
  relevance_score: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  expert?: Expert
}

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  addMessage: (msg: Message) => void
  updateLastMessage: (content: string, citations?: Citation[], expert?: Expert) => void
  setStreaming: (isStreaming: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (content, citations, expert) => set((state) => {
    const newMessages = [...state.messages]
    if (newMessages.length > 0) {
      const lastIdx = newMessages.length - 1
      const lastMessage = newMessages[lastIdx]
      if (lastMessage) {
        newMessages[lastIdx] = {
          ...lastMessage,
          content,
          ...(citations && { citations }),
          ...(expert && { expert })
        }
      }
    }
    return { messages: newMessages }
  }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearMessages: () => set({ messages: [] })
}))
