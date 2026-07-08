import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { structuredCall, MODEL_STRONG } from "@/lib/ai/client";
import { IMAGE_PROMPT_SCHEMA, type BriefContent } from "@/lib/ai/schemas";
import { IMAGE_PROMPT_SYSTEM, imagePromptUser } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";

// Generate (or regenerate) the GPT Image 2 prompt from the approved brief.
// Moves the brief into Awaiting Image.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const brief = await prisma.infographicBrief.findUniqueOrThrow({
      where: { id },
      include: { imagePrompts: { orderBy: { version: "desc" }, take: 1 } },
    });

    const result = await structuredCall<{ promptText: string }>({
      model: MODEL_STRONG,
      system: IMAGE_PROMPT_SYSTEM,
      user: imagePromptUser(brief.content as unknown as BriefContent),
      schema: IMAGE_PROMPT_SCHEMA,
    });

    const version = (brief.imagePrompts[0]?.version ?? 0) + 1;
    const prompt = await prisma.imageGenerationPrompt.create({
      data: { briefId: brief.id, promptText: result.promptText, version },
    });
    await prisma.infographicBrief.update({
      where: { id: brief.id },
      data: { stage: "AWAITING_IMAGE" },
    });
    return NextResponse.json({ prompt });
  } catch (err) {
    return jsonError(err);
  }
}
