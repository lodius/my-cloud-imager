import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("photos").filter((entry): entry is File => entry instanceof File);
  const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");

  if (files.length === 0) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  await mkdir(mediaRoot, { recursive: true });
  const saved = [];
  for (const file of files) {
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = path.join(mediaRoot, `${Date.now()}-${safeName}`);
    await writeFile(destination, Buffer.from(await file.arrayBuffer()));
    saved.push(path.basename(destination));
  }

  return NextResponse.json({ saved });
}
