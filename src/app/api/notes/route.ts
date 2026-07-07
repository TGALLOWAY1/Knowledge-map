import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "note body required" }, { status: 400 });
    }
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        moduleId: body.moduleId || null,
        conceptId: body.conceptId || null,
        body: body.body,
      },
    });
    return NextResponse.json({ note });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { id } = await req.json();
    await prisma.note.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
