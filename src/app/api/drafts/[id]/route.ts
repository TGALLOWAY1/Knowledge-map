import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

// Save edits from the review screen, or archive a draft.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const draft = await prisma.studyModuleDraft.update({
      where: { id },
      data: {
        ...(body.content !== undefined && { content: body.content }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json({ draft });
  } catch (err) {
    return jsonError(err);
  }
}
