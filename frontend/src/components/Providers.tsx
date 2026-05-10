"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth-store"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient())

  React.useEffect(() => {
    void useAuthStore.getState().loadFromStorage()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
