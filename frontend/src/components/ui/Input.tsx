import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col space-y-1.5">
        {label && (
          <label className="text-sm font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full border-b border-border-strong bg-transparent py-2 text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-status-error focus:border-status-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-status-error mt-1">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-text-tertiary mt-1">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
