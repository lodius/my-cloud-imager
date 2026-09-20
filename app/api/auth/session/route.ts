import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.AUTH_PASSWORD), authenticated: await isAuthenticated() }, { headers: { "Cache-Control": "no-store" } });
}
