import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

// Explicitly save a deep-dive explanation (or star a module/concept).
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const bookmark = await prisma.bookmark.create({
      data: {
        userId: user.id,
        moduleId: body.moduleId || null,
        conceptId: body.conceptId || null,
        kind: body.kind ?? "deep_dive",
        title: body.title ?? "Saved explanation",
        body: body.body ?? null,
      },
    });
    return NextResponse.json({ bookmark });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { id } = await req.json();
    await prisma.bookmark.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
