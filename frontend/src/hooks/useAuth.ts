import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { user, accessToken, isAuthenticated, login, logout, refreshToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Validate token on mount
    const validateSession = async () => {
      setIsLoading(true)
      if (accessToken) {
        try {
          // Token is present, we could ping /api/v1/auth/me to verify
          // If it fails, the api interceptor will call logout()
        } catch (error) {
          logout()
        }
      }
      setIsLoading(false)
    }

    validateSession()
  }, [accessToken, logout])

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: () => {
      logout()
      router.push('/login')
    },
    refreshToken,
  }
}
