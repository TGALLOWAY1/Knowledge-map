import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { structuredCall, MODEL_STRONG } from "@/lib/ai/client";
import { BRIEF_SCHEMA, type BriefContent } from "@/lib/ai/schemas";
import { BRIEF_SYSTEM, briefUser } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";

// Generate an infographic brief — from an accepted gap suggestion or a
// manually entered concept.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let gap = null;
    if (body.gapId) {
      gap = await prisma.conceptGap.findUniqueOrThrow({
        where: { id: body.gapId },
        include: { category: true, lifecycleStage: true, brief: true },
      });
      if (gap.brief) {
        return NextResponse.json({ error: "Gap already has a brief" }, { status: 409 });
      }
    }
    const title: string = body.title ?? gap?.title;
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const content = await structuredCall<BriefContent>({
      model: MODEL_STRONG,
      system: BRIEF_SYSTEM,
      user: briefUser({
        title,
        reason: gap?.reason ?? body.reason,
        recommendation: gap?.recommendation ?? undefined,
        category: gap?.category?.name ?? body.category,
        lifecycleStage: gap?.lifecycleStage?.name ?? body.lifecycleStage,
        notes: gap?.notes ?? body.notes,
      }),
      schema: BRIEF_SCHEMA,
    });

    const category = await prisma.category.findFirst({ where: { name: content.category } });
    const lifecycle = await prisma.lifecycleStage.findFirst({
      where: { name: content.lifecycleStage },
    });

    const brief = await prisma.infographicBrief.create({
      data: {
        title: content.title,
        learningObjective: content.learningObjective,
        audienceLevel: content.audienceLevel,
        tags: content.tags,
        content: content as unknown as object,
        categoryId: category?.id,
        lifecycleStageId: lifecycle?.id,
        conceptGapId: gap?.id,
      },
    });
    if (gap) {
      await prisma.conceptGap.update({
        where: { id: gap.id },
        data: { status: "PROMOTED" },
      });
    }
    return NextResponse.json({ brief });
  } catch (err) {
    return jsonError(err);
  }
}
