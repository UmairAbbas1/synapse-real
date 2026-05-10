const COOKIE_NAME = "synapse_token"
const MAX_AGE_SEC = 60 * 60 * 24 * 30

export function setSynapseTokenCookie(token: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)};path=/;max-age=${String(MAX_AGE_SEC)};SameSite=Lax`
}

export function clearSynapseTokenCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`
}
