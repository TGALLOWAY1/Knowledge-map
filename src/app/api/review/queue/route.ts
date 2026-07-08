import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildQueue, loadQueueModules, type QueueScope } from "@/lib/queue";
import { loadCardStates, summarize, reviewStreak } from "@/lib/analytics";
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

    // Session context: infographic reader data + global counters.
    const moduleIds = [...new Set(cards.map((c) => c.moduleId))];
    const [modules, states, streak] = await Promise.all([
      loadQueueModules(user.id, moduleIds),
      loadCardStates(user.id),
      reviewStreak(user.id),
    ]);
    const stats = summarize(states);
    const todayKey = new Date().toISOString().slice(0, 10);
    let reviewedToday = 0;
    for (const s of states) {
      for (const h of (s.history as { at: string }[] | null) ?? []) {
        if (h.at.slice(0, 10) === todayKey) reviewedToday += 1;
      }
    }

    return NextResponse.json({
      cards,
      modules,
      meta: {
        dueCount: stats.dueCount,
        weakCount: stats.weakCount,
        missedCount: stats.missedCount,
        reviewedToday,
        streak,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
