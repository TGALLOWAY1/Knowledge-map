import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDraft } from "@/lib/generate";
import { jsonError } from "@/lib/api";
import type { BriefContent } from "@/lib/ai/schemas";

// The user has generated the infographic externally and uploaded it.
// Link the asset to the brief's source material and generate a study module
// draft from the source material (brief + image prompt), not from the image.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { assetId } = await req.json();
    if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

    const brief = await prisma.infographicBrief.findUniqueOrThrow({
      where: { id },
      include: {
        imagePrompts: { orderBy: { version: "desc" }, take: 1 },
        sourceMaterial: true,
      },
    });
    const content = brief.content as unknown as BriefContent;
    const detailText = [
      `Learning objective: ${content.learningObjective}`,
      ...content.mainSections.map((s) => `${s.heading}: ${s.contents}`),
      `Key terms: ${content.keyTerms.map((t) => `${t.term} — ${t.definition}`).join("; ")}`,
      `Misconceptions: ${content.misconceptions.join("; ")}`,
    ].join("\n");

    const source = brief.sourceMaterial
      ? await prisma.sourceMaterial.update({
          where: { id: brief.sourceMaterial.id },
          data: { assetId },
        })
      : await prisma.sourceMaterial.create({
          data: {
            concept: brief.title,
            details: detailText,
            imagePrompt: brief.imagePrompts[0]?.promptText,
            briefId: brief.id,
            assetId,
          },
        });

    await prisma.infographicBrief.update({
      where: { id: brief.id },
      data: { stage: "IMAGE_ATTACHED" },
    });

    const draft = await generateDraft(source.id);
    return NextResponse.json({ draft });
  } catch (err) {
    return jsonError(err);
  }
}
