import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[16px] border border-border-medium bg-white/60 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export { Card }
