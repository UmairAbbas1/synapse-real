import { useState } from 'react'
import { useChatStore, Message, Citation, Expert } from '@/stores/chatStore'
import { post } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useQuery() {
  const { messages, addMessage, updateLastMessage, isStreaming, setStreaming } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Need token for SSE auth
  const token = useAuthStore((state) => state.accessToken)

  const submitQuery = async (question: string) => {
    if (!question.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }
    addMessage(userMessage)

    const aiMessageId = crypto.randomUUID()
    addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    })

    setIsLoading(true)
    setError(null)
    setStreaming(true)

    // Attempt SSE Streaming first
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
    const streamUrl = `${baseURL}/query/stream?q=${encodeURIComponent(question)}&token=${token}`

    try {
      if (typeof window !== "undefined" && window.EventSource) {
        const eventSource = new EventSource(streamUrl)
        let accumulatedResponse = ""

        eventSource.onmessage = (event) => {
          setIsLoading(false) // First token arrived, stop ThinkingIndicator by marking loading false (but streaming true)
          try {
            const data = JSON.parse(event.data)

            if (data.type === "token") {
              accumulatedResponse += data.token
              updateLastMessage(accumulatedResponse)
            } else if (data.type === "done") {
              updateLastMessage(accumulatedResponse, data.citations, data.expert || undefined)
              eventSource.close()
              setStreaming(false)
            }
          } catch (e) {
            console.error("Error parsing SSE data", e)
          }
        }

        eventSource.onerror = async (err) => {
          console.error("SSE Error:", err)
          eventSource.close()
          
          // If SSE fails immediately or refuses connection, fallback to standard POST
          if (accumulatedResponse === "") {
            await fallbackToPost(question)
          } else {
            setError('Stream disconnected abruptly.')
            setStreaming(false)
          }
        }
      } else {
        // Fallback for browsers without EventSource
        await fallbackToPost(question)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize connection.')
      setStreaming(false)
    }
  }

  const fallbackToPost = async (question: string) => {
    try {
      const response = await post<{
        answer: string
        citations: Citation[]
        expert_suggestion?: Expert | null
      }>('/query', { query: question })

      updateLastMessage(response.answer, response.citations, response.expert_suggestion || undefined)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch answer from Synapse.')
      updateLastMessage('An error occurred while communicating with the server.')
    } finally {
      setIsLoading(false)
      setStreaming(false)
    }
  }

  return {
    messages,
    isLoading, // True until first token arrives or post finishes
    isStreaming, // True until stream is done
    error,
    submitQuery
  }
}
