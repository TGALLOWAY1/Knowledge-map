import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// Manually add a backlog idea.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const gap = await prisma.conceptGap.create({
      data: {
        title: body.title,
        reason: body.reason ?? "Manually added",
        notes: body.notes,
        priority: body.priority ?? "MEDIUM",
        status: "BACKLOG",
        categoryId: body.categoryId || undefined,
        lifecycleStageId: body.lifecycleStageId || undefined,
      },
    });
    return NextResponse.json({ gap });
  } catch (err) {
    return jsonError(err);
  }
}
