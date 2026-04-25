"use client"

import * as React from "react"
import { Send, Square } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QueryInputProps {
  onSubmit: (query: string) => void
  isStreaming: boolean
  onStop?: () => void
  disabled?: boolean
}

export function QueryInput({ onSubmit, isStreaming, onStop, disabled }: QueryInputProps) {
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      // Max 4 rows (approx 96px). Min 1 row.
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!value.trim() || isStreaming || disabled) return
    onSubmit(value.trim())
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  return (
    <div className="relative w-full border-t border-border-subtle bg-bg-primary px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-[12px] border border-border-strong bg-surface-1 p-2 shadow-sm transition-colors focus-within:border-accent-primary">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          placeholder="Ask Synapse anything... (Cmd+Enter to send)"
          className="max-h-[96px] min-h-[40px] w-full resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={1}
        />
        
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-surface-3 text-text-primary transition-colors hover:bg-status-error hover:text-white focus:outline-none"
            title="Stop generating"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-accent-primary text-bg-primary transition-all hover:bg-accent-hover hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {value.length > 1800 && (
        <div className="mx-auto mt-2 max-w-4xl text-right">
          <span className={cn("text-xs", value.length > 2000 ? "text-status-error" : "text-status-warning")}>
            {value.length} / 2000 characters
          </span>
        </div>
      )}
    </div>
  )
}
