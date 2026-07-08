import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { jsonError } from "@/lib/api";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Path A: direct upload from phone/tablet/desktop into app-controlled storage.
export async function POST(req: NextRequest) {
  const job = await prisma.ingestionJob.create({
    data: { kind: "upload", status: "RUNNING" },
  });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.put(buffer, { filename: file.name, mimeType: file.type });

    const asset = await prisma.infographicAsset.create({
      data: {
        source: "UPLOAD",
        storageKey: stored.storageKey,
        thumbnailKey: stored.thumbnailKey,
        originalUrl: stored.originalUrl,
        thumbnailUrl: stored.thumbnailUrl,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: stored.width,
        height: stored.height,
      },
    });

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", payload: { assetId: asset.id, filename: file.name } },
    });
    return NextResponse.json({ asset });
  } catch (err) {
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: err instanceof Error ? err.message : String(err) },
    });
    return jsonError(err);
  }
}
