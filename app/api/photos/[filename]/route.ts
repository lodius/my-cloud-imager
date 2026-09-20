import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { deletePhoto, getPhotoByFilename, updatePhotoState } from "@/lib/db";
import { unlink } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ filename: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { filename } = await context.params;
  const body = await request.json().catch(() => ({}));
  const field = body.action === "favorite" ? "is_favorite" : body.action === "archive" ? "is_archived" : null;
  if (!field || typeof body.value !== "boolean") return NextResponse.json({ error: "Invalid photo action" }, { status: 400 });
  const result = updatePhotoState(filename, field, body.value);
  if (result.changes === 0) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  return NextResponse.json({ filename, action: body.action, value: body.value });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { filename } = await context.params;
  const photo = getPhotoByFilename(filename);
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
  await Promise.all([photo.filename, photo.thumbnailFilename].filter(Boolean).map((name) => unlink(path.join(mediaRoot, path.basename(name as string))).catch(() => undefined)));
  deletePhoto(filename);
  return NextResponse.json({ deleted: filename });
}
