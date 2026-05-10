import { create } from "zustand"
import type { User } from "@/lib/api-client"
import { getApiClient, registerApiUnauthorizedHandler } from "@/lib/api-client"
import { registerAuthTokenGetter } from "@/lib/auth-token-bridge"
import { clearSynapseTokenCookie, setSynapseTokenCookie } from "@/lib/cookies"

const TOKEN_KEY = "synapse_token"

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
    clearSynapseTokenCookie()
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  login: async (email, password) => {
    const client = getApiClient()
    const res = await client.login(email, password)
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, res.access_token)
      setSynapseTokenCookie(res.access_token)
    }
    set({
      token: res.access_token,
      user: res.user,
      isAuthenticated: true,
      isHydrated: true,
    })
  },

  logout: async () => {
    try {
      await getApiClient().logout()
    } catch {
      /* session may already be invalid */
    } finally {
      clearSession()
      set({ token: null, user: null, isAuthenticated: false, isHydrated: true })
    }
  },

  loadFromStorage: async () => {
    if (typeof window === "undefined") {
      set({ isHydrated: true })
      return
    }
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) {
      set({ isHydrated: true })
      return
    }
    set({ token: stored })
    setSynapseTokenCookie(stored)
    try {
      const user = await getApiClient().me()
      set({ user, isAuthenticated: true, isHydrated: true })
    } catch {
      clearSession()
      set({ token: null, user: null, isAuthenticated: false, isHydrated: true })
    }
  },
}))

registerAuthTokenGetter(() => useAuthStore.getState().token)

registerApiUnauthorizedHandler(() => {
  clearSession()
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    isHydrated: true,
  })
})
