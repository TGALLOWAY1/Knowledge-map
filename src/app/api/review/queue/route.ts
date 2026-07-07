import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildQueue, type QueueScope } from "@/lib/queue";
import { jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const p = req.nextUrl.searchParams;
    const kind = p.get("scope") ?? "all";

    let scope: QueueScope = { kind: "all" };
    if (kind === "due" || kind === "weak" || kind === "missed" || kind === "new") {
      scope = { kind };
    } else if (kind === "category" && p.get("slug")) {
      scope = { kind: "category", slug: p.get("slug")! };
    } else if (kind === "lifecycle" && p.get("slug")) {
      scope = { kind: "lifecycle", slug: p.get("slug")! };
    } else if (kind === "module" && p.get("moduleId")) {
      scope = { kind: "module", moduleId: p.get("moduleId")! };
    }

    const limit = Math.min(Number(p.get("limit")) || 30, 100);
    const cards = await buildQueue(user.id, scope, limit);
    return NextResponse.json({ cards });
  } catch (err) {
    return jsonError(err);
  }
}
