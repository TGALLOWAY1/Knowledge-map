import { prisma } from "@/lib/prisma";
import { cardMastery, isWeak } from "@/lib/srs";
import { hasRecentMiss } from "@/lib/analytics";

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

export interface QueueCardSrs {
  status: "NEW" | "LEARNING" | "REVIEW" | "LAPSED";
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface QueueCard {
  reviewStateId: string;
  cardType: "concept" | "quickhit";
  conceptId: string | null;
  quickHitId: string | null;
  moduleId: string;
  moduleSlug: string;
  moduleTitle: string;
  categoryName: string;
  categorySlug: string;
  lifecycleName: string | null;
  tags: string[];
  front: string;
  back: string;
  keyPoints: string[];
  status: string;
  dueAt: string;
  srs: QueueCardSrs;
}

const CARD_INCLUDE = {
  concept: {
    include: { module: { include: { category: true, lifecycleStage: true } } },
  },
  quickHit: {
    include: { module: { include: { category: true, lifecycleStage: true } } },
  },
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
    states = states.filter((s) => hasRecentMiss(s.history, cutoff));
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
    const srs: QueueCardSrs = {
      status: s.status as QueueCardSrs["status"],
      intervalDays: s.intervalDays,
      ease: s.ease,
      reps: s.reps,
      lapses: s.lapses,
    };
    if (s.concept) {
      const mod = s.concept.module;
      return [
        {
          reviewStateId: s.id,
          cardType: "concept",
          conceptId: s.concept.id,
          quickHitId: null,
          moduleId: s.concept.moduleId,
          moduleSlug: mod.slug,
          moduleTitle: mod.title,
          categoryName: mod.category.name,
          categorySlug: mod.category.slug,
          lifecycleName: mod.lifecycleStage?.name ?? null,
          tags: mod.tags,
          front: s.concept.name,
          back: s.concept.summary,
          keyPoints: s.concept.keyPoints,
          status: s.status,
          dueAt: s.dueAt.toISOString(),
          srs,
        },
      ];
    }
    if (s.quickHit) {
      const mod = s.quickHit.module;
      return [
        {
          reviewStateId: s.id,
          cardType: "quickhit",
          conceptId: null,
          quickHitId: s.quickHit.id,
          moduleId: s.quickHit.moduleId,
          moduleSlug: mod.slug,
          moduleTitle: mod.title,
          categoryName: mod.category.name,
          categorySlug: mod.category.slug,
          lifecycleName: mod.lifecycleStage?.name ?? null,
          tags: mod.tags,
          front: s.quickHit.question,
          back: s.quickHit.answer,
          keyPoints: [],
          status: s.status,
          dueAt: s.dueAt.toISOString(),
          srs,
        },
      ];
    }
    return [];
  });
}

export interface QueueModuleInfo {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  categoryName: string;
  categoryColor: string;
  lifecycleName: string | null;
  concepts: { id: string; name: string; summary: string }[];
  quickHits: { id: string; question: string; answer: string }[];
  notes: { id: string; body: string }[];
}

// Module context for the session's infographic reader: image, concepts,
// quick hits, and the user's notes for every module present in the queue.
export async function loadQueueModules(
  userId: string,
  moduleIds: string[],
): Promise<Record<string, QueueModuleInfo>> {
  if (moduleIds.length === 0) return {};
  const modules = await prisma.module.findMany({
    where: { id: { in: moduleIds } },
    include: {
      category: true,
      lifecycleStage: true,
      asset: true,
      concepts: { orderBy: { order: "asc" } },
      quickHits: { orderBy: { order: "asc" } },
      notes: { where: { userId }, orderBy: { createdAt: "desc" } },
    },
  });
  return Object.fromEntries(
    modules.map((m) => [
      m.id,
      {
        id: m.id,
        slug: m.slug,
        title: m.title,
        imageUrl: m.asset?.originalUrl ?? null,
        imageAlt: m.asset?.altText ?? m.title,
        categoryName: m.category.name,
        categoryColor: m.category.color,
        lifecycleName: m.lifecycleStage?.name ?? null,
        concepts: m.concepts.map((c) => ({ id: c.id, name: c.name, summary: c.summary })),
        quickHits: m.quickHits.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
        })),
        notes: m.notes.map((n) => ({ id: n.id, body: n.body })),
      },
    ]),
  );
}
