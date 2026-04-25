import { useState } from 'react'
import { useChatStore, Message, Citation, Expert } from '@/stores/chatStore'
import { post } from '@/lib/api'

export function useQuery() {
  const { messages, addMessage, updateLastMessage, isStreaming, setStreaming } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitQuery = async (question: string) => {
    if (!question.trim()) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }
    addMessage(userMessage)

    const aiMessageId = crypto.randomUUID()
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    addMessage(initialAiMessage)

    setIsLoading(true)
    setError(null)
    setStreaming(true)

    try {
      // In a real SSE implementation, we'd use EventSource or fetch reader.
      // Assuming a non-streaming POST for MVP if streaming isn't natively hooked yet,
      // but let's simulate the stream response structure or just use standard POST.
      
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
    isLoading,
    isStreaming,
    error,
    submitQuery
  }
}
