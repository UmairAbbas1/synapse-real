import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { post } from '@/lib/api'

export interface User {
  id: string
  email: string
  displayName: string
  role: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: async (email, password) => {
        // Backend expects FormData for OAuth2PasswordRequestForm
        const formData = new FormData()
        formData.append("username", email)
        formData.append("password", password)
        
        const response = await post<{ access_token: string; user: User }>(
          '/auth/login', 
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        )
        set({ 
          user: response.user, 
          accessToken: response.access_token, 
          isAuthenticated: true 
        })
      },
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
      refreshToken: async () => {
        try {
          const response = await post<{ access_token: string }>('/auth/refresh')
          set({ accessToken: response.access_token })
        } catch (error) {
          get().logout()
          throw error
        }
      },
    }),
    {
      name: 'synapse-auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)
