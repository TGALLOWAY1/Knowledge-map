import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// Replace the infographic image on a draft's source material before publish.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { assetId } = await req.json();
    if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });
    const draft = await prisma.studyModuleDraft.findUniqueOrThrow({ where: { id } });
    await prisma.sourceMaterial.update({
      where: { id: draft.sourceMaterialId },
      data: { assetId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
