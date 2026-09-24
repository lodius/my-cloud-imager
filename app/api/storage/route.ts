import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

async function directoryBytes(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const sizes = await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return directoryBytes(entryPath);
      const file = await stat(entryPath);
      return file.isFile() ? file.size : 0;
    }));
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
  const appRoot = process.cwd();
  try {
    const filesystem = await statfs(mediaRoot);
    const totalBytes = filesystem.blocks * filesystem.bsize;
    const freeBytes = filesystem.bavail * filesystem.bsize;
    const usedBytes = totalBytes - freeBytes;
    const mediaBytes = await directoryBytes(mediaRoot);
    const appBytes = await directoryBytes(appRoot);
    return NextResponse.json({ totalBytes, freeBytes, usedBytes, mediaBytes, appBytes, percentUsed: totalBytes ? Math.round((usedBytes / totalBytes) * 100) : 0, mediaPercent: totalBytes ? Math.min(100, Math.round((mediaBytes / totalBytes) * 100)) : 0, mediaRoot: process.env.MEDIA_ROOT ?? "data/photos" });
  } catch {
    return NextResponse.json({ error: "Storage information unavailable" }, { status: 503 });
  }
}
