import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL_STRONG } from "@/lib/ai/client";
import { DEEP_DIVE_SYSTEM, deepDiveUser } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";

// Streaming deep-dive explanation grounded in the module + source material.
// Responses are NOT auto-saved — the user bookmarks the ones worth keeping.
export async function POST(req: NextRequest) {
  try {
    const { moduleId, conceptId, question } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    const module = await prisma.module.findUniqueOrThrow({
      where: { id: moduleId },
      include: { sourceMaterial: true },
    });
    const concept = conceptId
      ? await prisma.concept.findUnique({ where: { id: conceptId } })
      : null;

    const client = anthropic();
    const stream = client.messages.stream({
      model: MODEL_STRONG,
      max_tokens: 4096,
      system: DEEP_DIVE_SYSTEM,
      messages: [
        {
          role: "user",
          content: deepDiveUser({
            moduleTitle: module.title,
            moduleSummary: module.summary,
            conceptName: concept?.name,
            conceptSummary: concept?.summary,
            keyPoints: concept?.keyPoints,
            sourceDetails: module.sourceMaterial?.details,
            question,
          }),
        },
      ],
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`\n\n[Error: ${err instanceof Error ? err.message : "stream failed"}]`),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return jsonError(err);
  }
}
