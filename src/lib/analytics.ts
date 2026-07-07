import { prisma } from "@/lib/prisma";
import { cardMastery, isWeak } from "@/lib/srs";

// Aggregations shared by the Today dashboard and the Analytics page.

export interface CardStateLite {
  id: string;
  status: string;
  dueAt: Date;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  history: unknown;
  conceptId: string | null;
  quickHitId: string | null;
  categorySlug: string;
  categoryName: string;
  lifecycleSlug: string | null;
  lifecycleName: string | null;
  moduleId: string;
  moduleTitle: string;
  cardLabel: string;
}

export async function loadCardStates(userId: string): Promise<CardStateLite[]> {
  const states = await prisma.reviewState.findMany({
    where: { userId },
    include: {
      concept: { include: { module: { include: { category: true, lifecycleStage: true } } } },
      quickHit: { include: { module: { include: { category: true, lifecycleStage: true } } } },
    },
  });
  return states.flatMap((s): CardStateLite[] => {
    const mod = s.concept?.module ?? s.quickHit?.module;
    if (!mod || mod.status !== "PUBLISHED") return [];
    return [
      {
        id: s.id,
        status: s.status,
        dueAt: s.dueAt,
        intervalDays: s.intervalDays,
        ease: s.ease,
        reps: s.reps,
        lapses: s.lapses,
        history: s.history,
        conceptId: s.conceptId,
        quickHitId: s.quickHitId,
        categorySlug: mod.category.slug,
        categoryName: mod.category.name,
        lifecycleSlug: mod.lifecycleStage?.slug ?? null,
        lifecycleName: mod.lifecycleStage?.name ?? null,
        moduleId: mod.id,
        moduleTitle: mod.title,
        cardLabel: s.concept?.name ?? s.quickHit?.question ?? "",
      },
    ];
  });
}

export function summarize(states: CardStateLite[]) {
  const now = new Date();
  const asSrs = (s: CardStateLite) => ({
    status: s.status as "NEW" | "LEARNING" | "REVIEW" | "LAPSED",
    intervalDays: s.intervalDays,
    reps: s.reps,
    lapses: s.lapses,
  });

  const due = states.filter((s) => s.status !== "NEW" && s.dueAt <= now);
  const overdue = due.filter(
    (s) => now.getTime() - s.dueAt.getTime() > 24 * 3600 * 1000,
  );
  const fresh = states.filter((s) => s.status === "NEW");
  const weak = states.filter((s) => isWeak(asSrs(s)));
  const mastery =
    states.length === 0
      ? 0
      : states.reduce((sum, s) => sum + cardMastery(asSrs(s)), 0) / states.length;

  const byGroup = (key: (s: CardStateLite) => string | null) => {
    const groups = new Map<string, { total: number; sum: number; due: number }>();
    for (const s of states) {
      const k = key(s);
      if (!k) continue;
      const g = groups.get(k) ?? { total: 0, sum: 0, due: 0 };
      g.total += 1;
      g.sum += cardMastery(asSrs(s));
      if (s.status !== "NEW" && s.dueAt <= now) g.due += 1;
      groups.set(k, g);
    }
    return [...groups.entries()].map(([name, g]) => ({
      name,
      mastery: g.total ? g.sum / g.total : 0,
      cards: g.total,
      due: g.due,
    }));
  };

  return {
    totalCards: states.length,
    dueCount: due.length,
    overdueCount: overdue.length,
    newCount: fresh.length,
    weakCount: weak.length,
    mastery,
    byCategory: byGroup((s) => s.categoryName).sort((a, b) => a.mastery - b.mastery),
    byLifecycle: byGroup((s) => s.lifecycleName).sort((a, b) => a.mastery - b.mastery),
    weakest: weak
      .map((s) => ({
        label: s.cardLabel,
        moduleTitle: s.moduleTitle,
        moduleId: s.moduleId,
        mastery: cardMastery(asSrs(s)),
      }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 10),
  };
}

export async function reviewStreak(userId: string): Promise<number> {
  const states = await prisma.reviewState.findMany({
    where: { userId, reps: { gt: 0 } },
    select: { history: true },
  });
  const days = new Set<string>();
  for (const s of states) {
    for (const h of (s.history as { at: string }[]) ?? []) {
      days.add(new Date(h.at).toISOString().slice(0, 10));
    }
  }
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    select: { createdAt: true },
  });
  for (const a of attempts) days.add(a.createdAt.toISOString().slice(0, 10));

  let streak = 0;
  const cursor = new Date();
  // Today counts if studied; otherwise start from yesterday.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function accuracyOverTime(userId: string, weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * 24 * 3600 * 1000);
  const attempts = await prisma.attempt.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, score: true },
  });
  const buckets = new Map<string, { sum: number; n: number }>();
  for (const a of attempts) {
    const d = new Date(a.createdAt);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    b.sum += a.score;
    b.n += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()].map(([week, b]) => ({
    week,
    avgScore: Math.round(b.sum / b.n),
    attempts: b.n,
  }));
}
