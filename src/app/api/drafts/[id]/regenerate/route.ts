import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDraft } from "@/lib/generate";
import { jsonError } from "@/lib/api";

// Regenerate study content from the (possibly edited) source material.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.studyModuleDraft.findUniqueOrThrow({ where: { id } });
    const draft = await generateDraft(existing.sourceMaterialId);
    return NextResponse.json({ draft });
  } catch (err) {
    return jsonError(err);
  }
}
