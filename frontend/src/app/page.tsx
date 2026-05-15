"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/chat")
      } else {
        router.push("/login")
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Optional: show a cool loading screen instead of blank while checking auth
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        <p className="text-sm text-text-secondary animate-pulse">Initializing Synapse...</p>
      </div>
    </div>
  )
}
