"use client"

import * as React from "react"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QueryInputProps {
  onSubmit: (query: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function QueryInput({ onSubmit, isLoading, disabled }: QueryInputProps) {
  const [value, setValue] = React.useState("")

  const lineCount = React.useMemo(() => {
    const lines = value.split("\n").length
    return Math.min(4, Math.max(1, lines))
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    if (!value.trim() || isLoading || disabled) return
    onSubmit(value.trim())
    setValue("")
  }

  const len = value.length

  return (
    <div className="w-full border-t border-border-subtle bg-bg-primary px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 border-b border-border-strong pb-2 transition-colors focus-within:border-accent-primary">
          <textarea
            value={value}
            onChange={(e) => {
              const v = e.target.value
              if (v.length <= 2000) setValue(v)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
            rows={lineCount}
            className="max-h-32 min-h-10 w-full resize-none bg-transparent py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                len > 2000 ? "text-status-error" : "text-text-tertiary"
              )}
            >
              {len} / 2000
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || isLoading || disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-accent-primary text-bg-primary transition-all hover:bg-accent-hover hover:shadow-[0_0_15px_var(--accent-glow)] focus:outline-none disabled:pointer-events-none disabled:opacity-50"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
