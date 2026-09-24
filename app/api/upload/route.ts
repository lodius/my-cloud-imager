import { mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getPhotoByChecksum, insertPhoto } from "@/lib/db";

export const runtime = "nodejs";

sharp.cache({ memory: 32, files: 0, items: 20 });
sharp.concurrency(Number(process.env.SHARP_CONCURRENCY ?? 1));

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const formData = await request.formData();
  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File);
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
  const maxFileSize = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);

  if (files.length === 0) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  await mkdir(mediaRoot, { recursive: true });
  const saved = [];
  const duplicates = [];
  for (const file of files) {
    if (file.size > maxFileSize) {
      return NextResponse.json({ error: `${file.name} exceeds the ${Math.round(maxFileSize / 1024 / 1024)} MB limit` }, { status: 413 });
    }
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      return NextResponse.json({ error: `Unsupported image format: ${file.name}` }, { status: 415 });
    }
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = path.join(mediaRoot, `${randomUUID()}-${safeName}`);
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(originalBuffer).digest("hex");
    const existingPhoto = getPhotoByChecksum(checksum);
    if (existingPhoto) {
      duplicates.push(file.name);
      continue;
    }
    const imageMetadata = await sharp(originalBuffer).metadata().catch(() => undefined);
    if (!imageMetadata?.width || !imageMetadata.height || imageMetadata.width > 10000 || imageMetadata.height > 10000) {
      return NextResponse.json({ error: `${file.name} is not a supported image or exceeds the 10000px dimension limit` }, { status: 422 });
    }
    const exif = await exifr.parse(originalBuffer, { pick: ["DateTimeOriginal", "CreateDate", "Model", "latitude", "longitude"] }).catch(() => undefined);
    const thumbnailFilename = `${path.basename(destination)}.webp`;
    const thumbnailPath = path.join(mediaRoot, thumbnailFilename);
    await writeFile(destination, originalBuffer);
    await sharp(originalBuffer).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbnailPath);
    const filename = path.basename(destination);
    const createdAt = new Date().toISOString();
    const capturedAt = exif?.DateTimeOriginal instanceof Date
      ? exif.DateTimeOriginal.toISOString()
      : exif?.CreateDate instanceof Date
        ? exif.CreateDate.toISOString()
        : createdAt;
    insertPhoto({
      filename,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      width: imageMetadata.width,
      height: imageMetadata.height,
      capturedAt,
      createdAt,
      thumbnailFilename,
      cameraModel: typeof exif?.Model === "string" ? exif.Model.trim() : undefined,
      latitude: typeof exif?.latitude === "number" ? exif.latitude : undefined,
      longitude: typeof exif?.longitude === "number" ? exif.longitude : undefined,
      checksum,
    });
    saved.push(filename);
  }

  return NextResponse.json({ saved, duplicates });
}
