import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { structuredCall, MODEL_LIGHT } from "@/lib/ai/client";
import { GAP_SUGGESTIONS_SCHEMA, type GapSuggestion } from "@/lib/ai/schemas";
import { SUGGESTIONS_SYSTEM, suggestionsUser } from "@/lib/ai/prompts";
import { loadCardStates, summarize } from "@/lib/analytics";
import { jsonError } from "@/lib/api";

// Knowledge-gap suggestions: AI proposes new infographic topics from weak
// performance, coverage gaps, and stated goals. Persists as ConceptGap rows.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const goals: string | undefined = body.goals;
    const count = Math.min(Number(body.count) || 5, 10);

    const [modules, states] = await Promise.all([
      prisma.module.findMany({
        where: { status: "PUBLISHED" },
        include: { category: true, lifecycleStage: true },
      }),
      loadCardStates(user.id),
    ]);
    const stats = summarize(states);

    const now = new Date();
    const overdueCategories = [
      ...new Set(
        states
          .filter((s) => s.status !== "NEW" && now.getTime() - s.dueAt.getTime() > 24 * 3600 * 1000)
          .map((s) => s.categoryName),
      ),
    ];
    const recentlyMissed = states
      .filter((s) => {
        const h = (s.history as { at: string; rating: string }[]) ?? [];
        return h.slice(-3).some((x) => x.rating === "again");
      })
      .map((s) => s.cardLabel)
      .slice(0, 15);

    const result = await structuredCall<{ suggestions: GapSuggestion[] }>({
      model: MODEL_LIGHT,
      system: SUGGESTIONS_SYSTEM,
      user: suggestionsUser({
        publishedModules: modules.map((m) => ({
          title: m.title,
          category: m.category.name,
          lifecycleStage: m.lifecycleStage?.name ?? "—",
        })),
        weakConcepts: stats.weakest.map((w) => w.label),
        recentlyMissed,
        overdueCategories,
        coverage: stats.byCategory.map((c) => ({ category: c.name, count: c.cards })),
        lifecycleCoverage: stats.byLifecycle.map((l) => ({ stage: l.name, count: l.cards })),
        goals,
        count,
      }),
      schema: GAP_SUGGESTIONS_SCHEMA,
    });

    const created = [];
    for (const s of result.suggestions) {
      const category = await prisma.category.findFirst({ where: { name: s.category } });
      const lifecycle = await prisma.lifecycleStage.findFirst({
        where: { name: s.lifecycleStage },
      });
      created.push(
        await prisma.conceptGap.create({
          data: {
            title: s.title,
            reason: s.reason,
            recommendation: s.recommendation,
            sourceSignal: s.sourceSignal,
            priority: s.priority,
            categoryId: category?.id,
            lifecycleStageId: lifecycle?.id,
          },
        }),
      );
    }
    return NextResponse.json({ gaps: created });
  } catch (err) {
    return jsonError(err);
  }
}
