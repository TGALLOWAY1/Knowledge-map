import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publishDraft } from "@/lib/publish";
import { jsonError } from "@/lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const module = await publishDraft(id, user.id);
    return NextResponse.json({ module });
  } catch (err) {
    return jsonError(err);
  }
}
