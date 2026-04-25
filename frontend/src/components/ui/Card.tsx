import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[12px] border border-border-subtle bg-surface-1 text-text-primary",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
