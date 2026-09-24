import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createAlbum, listAlbumCoverFilenames, listAlbums } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const albums = listAlbums().map((album) => ({ ...album, coverUrls: listAlbumCoverFilenames(album.id).map((filename) => `/api/thumbnails/${encodeURIComponent(filename)}`) }));
  return NextResponse.json({ albums });
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 80) {
    return NextResponse.json({ error: "Album name must be between 1 and 80 characters" }, { status: 400 });
  }
  try {
    createAlbum(body.name);
    const albums = listAlbums().map((album) => ({ ...album, coverUrls: listAlbumCoverFilenames(album.id).map((filename) => `/api/thumbnails/${encodeURIComponent(filename)}`) }));
    return NextResponse.json({ albums }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An album with that name already exists" }, { status: 409 });
  }
}
