import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// Edit a brief before generating the final image prompt, or archive it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
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
      },
    });
    return NextResponse.json({ brief });
  } catch (err) {
    return jsonError(err);
  }
}
