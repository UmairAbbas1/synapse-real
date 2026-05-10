/**
 * Thin helpers for legacy call sites. Prefer `getApiClient()` for new code.
 */
import { getApiClient } from "@/lib/api-client"

export async function get<T>(url: string): Promise<T> {
  return getApiClient().get<T>(url)
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  return getApiClient().post<T>(url, data)
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  return getApiClient().put<T>(url, data)
}

export async function del<T>(url: string): Promise<T> {
  return getApiClient().deleteReq<T>(url)
}
