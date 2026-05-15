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
    return Math.min(8, Math.max(1, lines))
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
    <div className="w-full bg-transparent px-6 py-3">
      <div className="flex items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <textarea
            value={value}
            onChange={(e) => {
              const v = e.target.value
              if (v.length <= 4000) setValue(v)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Search knowledge or ask Synapse..."
            rows={lineCount}
            className="max-h-64 min-h-[44px] w-full resize-none bg-transparent py-3 text-[15px] font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 pb-1.5">
          <div className={cn(
            "text-[10px] font-mono tracking-tighter transition-all duration-300",
            len > 3500 ? "text-error opacity-100" : "text-text-tertiary opacity-0 group-focus-within:opacity-100"
          )}>
            {len}/4k
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || isLoading || disabled}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-all duration-500 active:scale-90",
              !value.trim() || isLoading || disabled
                ? "bg-bg-hover text-text-tertiary"
                : "bg-accent-primary text-white shadow-lg shadow-accent-primary/30 hover:shadow-accent-primary/50 hover:scale-105"
            )}
            title="Send Inquiry"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
