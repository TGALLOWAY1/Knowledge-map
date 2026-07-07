import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { structuredCall, MODEL_STRONG } from "@/lib/ai/client";
import { QUESTION_SCHEMA, type GeneratedRubric } from "@/lib/ai/schemas";
import { QUESTION_SYSTEM, questionUser } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";

// Retrieve a cached interview question for a module/concept, or generate a
// new one. Cached questions + approved rubrics are reused (cost control).
export async function POST(req: NextRequest) {
  try {
    const { moduleId, conceptId, forceNew } = await req.json();
    const module = await prisma.module.findUniqueOrThrow({
      where: { id: moduleId },
      include: { questions: { include: { rubric: true } } },
    });

    const pool = module.questions.filter((q) =>
      conceptId ? q.conceptId === conceptId : true,
    );
    if (pool.length > 0 && !forceNew) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return NextResponse.json({ question: pick });
    }

    const concept = conceptId
      ? await prisma.concept.findUnique({ where: { id: conceptId } })
      : null;

    const generated = await structuredCall<{ prompt: string; rubric: GeneratedRubric }>({
      model: MODEL_STRONG,
      system: QUESTION_SYSTEM,
      user: questionUser({
        moduleTitle: module.title,
        conceptName: concept?.name,
        conceptSummary: concept?.summary,
        existingPrompts: module.questions.map((q) => q.prompt),
      }),
      schema: QUESTION_SCHEMA,
    });

    const question = await prisma.question.create({
      data: {
        module: { connect: { id: module.id } },
        ...(concept && { concept: { connect: { id: concept.id } } }),
        prompt: generated.prompt,
        rubric: { create: { content: generated.rubric as object } },
      },
      include: { rubric: true },
    });
    return NextResponse.json({ question });
  } catch (err) {
    return jsonError(err);
  }
}
