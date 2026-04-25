import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    // Dynamically import store to avoid circular dependency
    const { useAuthStore } = require("@/stores/authStore")
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { useAuthStore } = require("@/stores/authStore")
      useAuthStore.getState().logout()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } else if (error.response?.status === 429) {
      const toast = require("react-hot-toast").default
      toast.error("Rate limit exceeded. Please try again later.")
    }
    return Promise.reject(error)
  }
)

export const get = <T>(url: string, config = {}) => api.get<T>(url, config).then(res => res.data)
export const post = <T>(url: string, data?: any, config = {}) => api.post<T>(url, data, config).then(res => res.data)
export const put = <T>(url: string, data?: any, config = {}) => api.put<T>(url, data, config).then(res => res.data)
export const del = <T>(url: string, config = {}) => api.delete<T>(url, config).then(res => res.data)
