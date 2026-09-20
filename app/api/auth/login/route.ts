import { NextResponse } from "next/server";
import { passwordMatches, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.AUTH_PASSWORD) return NextResponse.json({ error: "AUTH_PASSWORD is not configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !passwordMatches(body.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true, configured: true });
  response.cookies.set(setSessionCookie());
  return response;
}
