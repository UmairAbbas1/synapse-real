import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "text",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "card" | "avatar"
}) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-[linear-gradient(110deg,var(--surface-2),45%,var(--surface-3),55%,var(--surface-2))] bg-[length:200%_100%]",
        variant === "text" && "h-4 w-full rounded",
        variant === "card" && "h-32 w-full rounded-[12px]",
        variant === "avatar" && "h-10 w-10 rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
