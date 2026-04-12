import { NextResponse } from "next/server";

/** Placeholder until NextAuth / Keycloak integration (Phase 4+). */
export async function GET() {
  return NextResponse.json(
    { detail: "Authentication route not configured yet." },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { detail: "Authentication route not configured yet." },
    { status: 501 },
  );
}
