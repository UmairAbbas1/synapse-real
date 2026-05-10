import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"

export function useAuth() {
  const { user, token, isAuthenticated, isHydrated, login, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isHydrated) return
    setIsLoading(false)
  }, [isHydrated])

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || !isHydrated,
    login,
    logout: () => {
      void logout().finally(() => {
        router.push("/login")
      })
    },
  }
}
