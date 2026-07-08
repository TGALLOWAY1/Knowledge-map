import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// Gap actions: add to backlog, dismiss, mark covered, edit notes/priority.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const gap = await prisma.conceptGap.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        priority: body.priority,
      },
    });
    return NextResponse.json({ gap });
  } catch (err) {
    return jsonError(err);
  }
}
