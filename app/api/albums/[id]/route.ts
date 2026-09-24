import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { addPhotoToAlbum, deleteAlbum, getAlbum, listAlbumPhotos, photoIsInAlbum, removePhotoFromAlbum } from "@/lib/db";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const albumId = Number((await context.params).id);
  const album = getAlbum(albumId);
  if (!album) return NextResponse.json({ error: "Album not found" }, { status: 404 });
  const photos = listAlbumPhotos(albumId).map((photo) => ({
    ...photo,
    url: `/api/media/${encodeURIComponent(photo.filename)}`,
    thumbnailUrl: photo.thumbnailFilename ? `/api/thumbnails/${encodeURIComponent(photo.filename)}` : `/api/media/${encodeURIComponent(photo.filename)}`,
  }));
  return NextResponse.json({ album, photos });
}

export async function POST(request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const albumId = Number((await context.params).id);
  if (!getAlbum(albumId)) return NextResponse.json({ error: "Album not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.filename !== "string") return NextResponse.json({ error: "A photo filename is required" }, { status: 400 });
  if (photoIsInAlbum(albumId, body.filename)) return NextResponse.json({ error: "Photo is already in this album" }, { status: 409 });
  const result = addPhotoToAlbum(albumId, body.filename);
  if (result.changes === 0) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  return NextResponse.json({ added: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const albumId = Number((await context.params).id);
  if (!getAlbum(albumId)) return NextResponse.json({ error: "Album not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.filename === "string") {
    const result = removePhotoFromAlbum(albumId, body.filename);
    if (result.changes === 0) return NextResponse.json({ error: "Photo was not in this album" }, { status: 404 });
    return NextResponse.json({ removed: true });
  }
  deleteAlbum(albumId);
  return NextResponse.json({ deleted: true });
}