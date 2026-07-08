import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { structuredCall, MODEL_STRONG } from "@/lib/ai/client";
import { GRADE_SCHEMA, type GradeResult } from "@/lib/ai/schemas";
import { GRADE_SYSTEM, gradeUser } from "@/lib/ai/prompts";
import { jsonError } from "@/lib/api";

const VERDICT_MAP = { strong: "STRONG", partial: "PARTIAL", off_track: "OFF_TRACK" } as const;

// Grade a free-response answer against the saved rubric; persist the attempt.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { questionId, answerText } = await req.json();
    if (!answerText?.trim()) {
      return NextResponse.json({ error: "answer required" }, { status: 400 });
    }

    const question = await prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      include: { rubric: true },
    });

    const grade = await structuredCall<GradeResult>({
      model: MODEL_STRONG,
      system: GRADE_SYSTEM,
      user: gradeUser({
        question: question.prompt,
        rubric: question.rubric?.content ?? {},
        answer: answerText,
      }),
      schema: GRADE_SCHEMA,
    });

    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        moduleId: question.moduleId,
        conceptId: question.conceptId,
        questionId: question.id,
        answerText,
        verdict: VERDICT_MAP[grade.verdict],
        score: Math.max(0, Math.min(100, grade.score)),
        feedback: grade.feedback,
        missedPoints: grade.missedPoints,
        suggestedAnswer: grade.suggestedAnswer,
      },
    });
    return NextResponse.json({ attempt });
  } catch (err) {
    return jsonError(err);
  }
}
