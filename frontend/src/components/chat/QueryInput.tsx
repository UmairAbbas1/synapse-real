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
    <div className="w-full bg-transparent px-4 py-2">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <textarea
            value={value}
            onChange={(e) => {
              const v = e.target.value
              if (v.length <= 4000) setValue(v)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Message Synapse..."
            rows={lineCount}
            className="max-h-64 min-h-[44px] w-full resize-none bg-transparent py-3 text-[14px] font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all border-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "text-[10px] font-mono tracking-tighter transition-all duration-300",
            len > 3500 ? "text-error opacity-100" : "text-secondary opacity-0 group-focus-within:opacity-100"
          )}>
            {len}/4k
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || isLoading || disabled}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-300 active:scale-95",
              !value.trim() || isLoading || disabled
                ? "bg-surface-variant text-on-surface-variant opacity-50"
                : "bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105"
            )}
            title="Send Inquiry"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
