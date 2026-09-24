import { NextResponse } from "next/server";
import { listPhotos } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const photos = listPhotos().map((photo) => ({
    ...photo,
    url: `/api/media/${encodeURIComponent(photo.filename)}`,
    thumbnailUrl: photo.thumbnailFilename
      ? `/api/thumbnails/${encodeURIComponent(photo.filename)}`
      : `/api/media/${encodeURIComponent(photo.filename)}`,
  }));

  return NextResponse.json({ photos, count: photos.length });
}
