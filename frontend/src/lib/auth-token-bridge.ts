/** Resolves the current bearer token without importing the auth store (avoids cycles). */

let getTokenFn: () => string | null = () => null

export function registerAuthTokenGetter(fn: () => string | null): void {
  getTokenFn = fn
}

export function getAuthTokenFromBridge(): string | null {
  return getTokenFn()
}
