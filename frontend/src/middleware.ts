import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE_NAME = "synapse_token"

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token || token.length === 0) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/chat",
    "/chat/:path*",
    "/admin",
    "/admin/:path*",
    "/history",
    "/history/:path*",
    "/settings",
    "/settings/:path*",
    "/graph",
    "/graph/:path*",
  ],
}
