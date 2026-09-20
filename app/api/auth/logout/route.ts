import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(clearSessionCookie());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
