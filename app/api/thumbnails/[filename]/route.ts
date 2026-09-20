import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getPhotoByFilename } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { filename } = await context.params;
  const safeFilename = path.basename(filename);
  const photo = getPhotoByFilename(safeFilename);
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
  if (!photo?.thumbnailFilename) return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });

  const thumbnailPath = path.join(mediaRoot, path.basename(photo.thumbnailFilename));
  try {
    const fileInfo = await stat(thumbnailPath);
    const stream = Readable.toWeb(createReadStream(thumbnailPath)) as ReadableStream;
    return new Response(stream, {
      headers: { "Content-Length": String(fileInfo.size), "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }
}