import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { structuredCall, MODEL_STRONG, AiNotConfiguredError } from "@/lib/ai/client";
import { IMAGE_PROMPT_SCHEMA, type BriefContent } from "@/lib/ai/schemas";
import { IMAGE_PROMPT_SYSTEM, imagePromptUser } from "@/lib/ai/prompts";
import { buildImagePromptTemplate } from "@/lib/image-prompt";
import { jsonError } from "@/lib/api";

// Generate (or regenerate) the image prompt from the approved brief, or save
// a hand-edited prompt when the request body carries { promptText }. Falls
// back to a deterministic template when the AI service is not configured.
// Moves the brief into Awaiting Image.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const brief = await prisma.infographicBrief.findUniqueOrThrow({
      where: { id },
      include: { imagePrompts: { orderBy: { version: "desc" }, take: 1 } },
    });

    let promptText: string;
    let generated: "manual" | "ai" | "template";
    if (typeof body.promptText === "string" && body.promptText.trim()) {
      promptText = body.promptText.trim();
      generated = "manual";
    } else {
      const content = brief.content as unknown as BriefContent;
      try {
        const result = await structuredCall<{ promptText: string }>({
          model: MODEL_STRONG,
          system: IMAGE_PROMPT_SYSTEM,
          user: imagePromptUser(content),
          schema: IMAGE_PROMPT_SCHEMA,
        });
        promptText = result.promptText;
        generated = "ai";
      } catch (err) {
        if (err instanceof AiNotConfiguredError) {
          promptText = buildImagePromptTemplate(content);
          generated = "template";
        } else {
          throw err;
        }
      }
    }

    const version = (brief.imagePrompts[0]?.version ?? 0) + 1;
    const prompt = await prisma.imageGenerationPrompt.create({
      data: { briefId: brief.id, promptText, version },
    });
    await prisma.infographicBrief.update({
      where: { id: brief.id },
      data: { stage: "AWAITING_IMAGE" },
    });
    return NextResponse.json({ prompt, generated });
  } catch (err) {
    return jsonError(err);
  }
}
