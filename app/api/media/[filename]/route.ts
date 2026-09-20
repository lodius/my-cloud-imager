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
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
  const filePath = path.join(mediaRoot, safeFilename);
  const photo = getPhotoByFilename(safeFilename);
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const headers = { "Content-Length": String(fileInfo.size), "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" };
    if (new URL(_request.url).searchParams.get("download") === "1") Object.assign(headers, { "Content-Disposition": `attachment; filename="${photo.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}"` });
    return new Response(stream, { headers });
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
}
