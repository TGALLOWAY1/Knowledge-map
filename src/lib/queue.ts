import { prisma } from "@/lib/prisma";
import { cardMastery, isWeak } from "@/lib/srs";

// Review queue construction for mixed review / scoped review sessions.

export type QueueScope =
  | { kind: "all" }
  | { kind: "due" }
  | { kind: "category"; slug: string }
  | { kind: "lifecycle"; slug: string }
  | { kind: "module"; moduleId: string }
  | { kind: "weak" }
  | { kind: "missed" }
  | { kind: "new" };

export interface QueueCard {
  reviewStateId: string;
  cardType: "concept" | "quickhit";
  moduleId: string;
  moduleTitle: string;
  categoryName: string;
  front: string;
  back: string;
  keyPoints: string[];
  status: string;
  dueAt: string;
}

const CARD_INCLUDE = {
  concept: { include: { module: { include: { category: true } } } },
  quickHit: { include: { module: { include: { category: true } } } },
} as const;

export async function buildQueue(
  userId: string,
  scope: QueueScope,
  limit = 30,
): Promise<QueueCard[]> {
  const now = new Date();
  const base = { userId };

  let where: Record<string, unknown> = base;
  if (scope.kind === "due") {
    where = { ...base, dueAt: { lte: now }, status: { not: "NEW" } };
  } else if (scope.kind === "new") {
    where = { ...base, status: "NEW" };
  } else if (scope.kind === "category") {
    where = {
      ...base,
      OR: [
        { concept: { module: { category: { slug: scope.slug } } } },
        { quickHit: { module: { category: { slug: scope.slug } } } },
      ],
    };
  } else if (scope.kind === "lifecycle") {
    where = {
      ...base,
      OR: [
        { concept: { module: { lifecycleStage: { slug: scope.slug } } } },
        { quickHit: { module: { lifecycleStage: { slug: scope.slug } } } },
      ],
    };
  } else if (scope.kind === "module") {
    where = {
      ...base,
      OR: [
        { concept: { moduleId: scope.moduleId } },
        { quickHit: { moduleId: scope.moduleId } },
      ],
    };
  }

  let states = await prisma.reviewState.findMany({
    where,
    include: CARD_INCLUDE,
    orderBy: { dueAt: "asc" },
    take: scope.kind === "weak" || scope.kind === "missed" ? 500 : limit * 3,
  });

  if (scope.kind === "weak") {
    states = states.filter((s) => isWeak(s));
  } else if (scope.kind === "missed") {
    const cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    states = states.filter((s) => {
      const history = (s.history as { at: string; rating: string }[]) ?? [];
      return history.some((h) => h.rating === "again" && new Date(h.at) >= cutoff);
    });
  } else if (scope.kind === "all") {
    // Mixed review: due first, then new, then the rest by mastery ascending.
    const due = states.filter((s) => s.status !== "NEW" && s.dueAt <= now);
    const fresh = states.filter((s) => s.status === "NEW");
    const rest = states
      .filter((s) => s.status !== "NEW" && s.dueAt > now)
      .sort((a, b) => cardMastery(a) - cardMastery(b));
    states = [...due, ...fresh, ...rest];
  }

  return states.slice(0, limit).flatMap((s): QueueCard[] => {
    if (s.concept) {
      return [
        {
          reviewStateId: s.id,
          cardType: "concept",
          moduleId: s.concept.moduleId,
          moduleTitle: s.concept.module.title,
          categoryName: s.concept.module.category.name,
          front: s.concept.name,
          back: s.concept.summary,
          keyPoints: s.concept.keyPoints as string[],
          status: s.status,
          dueAt: s.dueAt.toISOString(),
        },
      ];
    }
    if (s.quickHit) {
      return [
        {
          reviewStateId: s.id,
          cardType: "quickhit",
          moduleId: s.quickHit.moduleId,
          moduleTitle: s.quickHit.module.title,
          categoryName: s.quickHit.module.category.name,
          front: s.quickHit.question,
          back: s.quickHit.answer,
          keyPoints: [],
          status: s.status,
          dueAt: s.dueAt.toISOString(),
        },
      ];
    }
    return [];
  });
}
