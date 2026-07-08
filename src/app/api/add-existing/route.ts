import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDraft } from "@/lib/generate";
import { jsonError } from "@/lib/api";

// Fast migration path for infographics the user already created:
// concept + details/prompt + uploaded image → source material → module draft.
// No OCR required — the pasted source content is the source of truth.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.concept) {
      return NextResponse.json({ error: "concept required" }, { status: 400 });
    }
    const source = await prisma.sourceMaterial.create({
      data: {
        concept: body.concept,
        details: body.details || null,
        imagePrompt: body.imagePrompt || null,
        notes: body.notes || null,
        modelUsed: body.modelUsed || null,
        assetId: body.assetId || null,
      },
    });
    const draft = await generateDraft(source.id);
    return NextResponse.json({ draft, sourceMaterialId: source.id });
  } catch (err) {
    return jsonError(err);
  }
}
