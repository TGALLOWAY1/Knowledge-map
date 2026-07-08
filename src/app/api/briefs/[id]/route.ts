import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import type { BriefContent } from "@/lib/ai/schemas";

// Edit a brief before generating the final image prompt, or archive it.
// When structured content is sent, the relational columns (category,
// lifecycle stage, audience level, learning objective, tags) are kept in
// sync so board badges and filters stay correct.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    let synced: Record<string, unknown> = {};
    if (body.content !== undefined) {
      const content = body.content as Partial<BriefContent>;
      const [category, lifecycleStage] = await Promise.all([
        content.category
          ? prisma.category.findFirst({ where: { name: content.category } })
          : null,
        content.lifecycleStage
          ? prisma.lifecycleStage.findFirst({ where: { name: content.lifecycleStage } })
          : null,
      ]);
      synced = {
        ...(category && { categoryId: category.id }),
        ...(lifecycleStage && { lifecycleStageId: lifecycleStage.id }),
        ...(content.audienceLevel !== undefined && { audienceLevel: content.audienceLevel }),
        ...(content.learningObjective !== undefined && {
          learningObjective: content.learningObjective,
        }),
        ...(content.tags !== undefined && { tags: content.tags }),
      };
    }

    const brief = await prisma.infographicBrief.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.stage !== undefined && { stage: body.stage }),
        ...(body.learningObjective !== undefined && {
          learningObjective: body.learningObjective,
        }),
        ...synced,
      },
    });
    return NextResponse.json({ brief });
  } catch (err) {
    return jsonError(err);
  }
}
