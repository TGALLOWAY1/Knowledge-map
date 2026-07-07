import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  loadCardStates,
  summarize,
  reviewStreak,
  accuracyOverTime,
} from "@/lib/analytics";
import { CATEGORIES, LIFECYCLE_STAGES } from "@/lib/constants";
import { Card, SectionHeader, StatTile, ProgressBar, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const [states, streak, accuracy, attempts, moduleCounts, lifecycleCounts, recentAttempts] =
    await Promise.all([
      loadCardStates(user.id),
      reviewStreak(user.id),
      accuracyOverTime(user.id),
      prisma.attempt.count({ where: { userId: user.id } }),
      prisma.module.groupBy({
        by: ["categoryId"],
        where: { status: "PUBLISHED" },
        _count: true,
      }),
      prisma.module.groupBy({
        by: ["lifecycleStageId"],
        where: { status: "PUBLISHED" },
        _count: true,
      }),
      prisma.attempt.findMany({
        where: { userId: user.id },
        include: { module: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = summarize(states);
  const categories = await prisma.category.findMany();
  const lifecycles = await prisma.lifecycleStage.findMany();
  const catCount = (id: string) => moduleCounts.find((m) => m.categoryId === id)?._count ?? 0;
  const lcCount = (id: string) =>
    lifecycleCounts.find((m) => m.lifecycleStageId === id)?._count ?? 0;

  const maxAttempts = Math.max(1, ...accuracy.map((a) => a.attempts));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Overall mastery" value={`${Math.round(stats.mastery * 100)}%`} />
        <StatTile label="Review streak" value={`${streak}d`} />
        <StatTile label="Test-me attempts" value={attempts} />
        <StatTile label="Due / overdue" value={`${stats.dueCount} / ${stats.overdueCount}`} />
      </div>

      <section>
        <SectionHeader title="Mastery by category" />
        <Card className="divide-y divide-black/5 dark:divide-white/10">
          {stats.byCategory.map((c) => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3">
              <span className="w-40 shrink-0 truncate text-sm sm:w-56">{c.name}</span>
              <ProgressBar value={c.mastery} className="flex-1" />
              <span className="w-12 text-right text-xs tabular-nums text-zinc-500">
                {Math.round(c.mastery * 100)}%
              </span>
              {c.due > 0 && <Badge color="red">{c.due} due</Badge>}
            </div>
          ))}
          {stats.byCategory.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-500">No review data yet.</p>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Mastery by lifecycle stage" />
        <Card className="divide-y divide-black/5 dark:divide-white/10">
          {stats.byLifecycle.map((c) => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3">
              <span className="w-40 shrink-0 truncate text-sm sm:w-56">{c.name}</span>
              <ProgressBar value={c.mastery} className="flex-1" />
              <span className="w-12 text-right text-xs tabular-nums text-zinc-500">
                {Math.round(c.mastery * 100)}%
              </span>
            </div>
          ))}
          {stats.byLifecycle.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-500">No review data yet.</p>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Accuracy over time (Test Me)" />
        <Card className="px-4 py-4">
          {accuracy.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No graded attempts yet — try “Test me” on a module.
            </p>
          ) : (
            <div className="space-y-2">
              {accuracy.map((a) => (
                <div key={a.week} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs tabular-nums text-zinc-500">
                    {a.week}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded bg-violet-500"
                      style={{ width: `${a.avgScore}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    {a.avgScore}/100 · {a.attempts}×
                    <span className="sr-only"> attempts, bar width {Math.round((a.attempts / maxAttempts) * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Weakest concepts" />
        <Card className="divide-y divide-black/5 dark:divide-white/10">
          {stats.weakest.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">Nothing weak right now. 🎉</p>
          ) : (
            stats.weakest.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{w.label}</p>
                  <p className="truncate text-xs text-zinc-500">{w.moduleTitle}</p>
                </div>
                <span className="text-xs tabular-nums text-zinc-500">
                  {Math.round(w.mastery * 100)}%
                </span>
              </div>
            ))
          )}
        </Card>
        {stats.weakCount > 0 && (
          <Link
            href="/review/session?scope=weak"
            className="mt-2 inline-block text-sm font-medium text-violet-600 dark:text-violet-300"
          >
            Drill weak concepts →
          </Link>
        )}
      </section>

      <section>
        <SectionHeader title="Content coverage" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Modules per category
            </p>
            {CATEGORIES.map((c) => {
              const cat = categories.find((x) => x.slug === c.slug);
              const n = cat ? catCount(cat.id) : 0;
              return (
                <div key={c.slug} className="flex items-center justify-between py--1 text-sm leading-7">
                  <span>{c.name}</span>
                  <Badge color={n === 0 ? "red" : c.color}>{n === 0 ? "gap" : n}</Badge>
                </div>
              );
            })}
          </Card>
          <Card className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Modules per lifecycle stage
            </p>
            {LIFECYCLE_STAGES.map((s) => {
              const lc = lifecycles.find((x) => x.slug === s.slug);
              const n = lc ? lcCount(lc.id) : 0;
              return (
                <div key={s.slug} className="flex items-center justify-between text-sm leading-7">
                  <span>{s.name}</span>
                  <Badge color={n === 0 ? "red" : "zinc"}>{n === 0 ? "gap" : n}</Badge>
                </div>
              );
            })}
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="Recent feedback" />
        <div className="space-y-2">
          {recentAttempts.length === 0 ? (
            <Card className="px-4 py-6 text-sm text-zinc-500">No attempts yet.</Card>
          ) : (
            recentAttempts.map((a) => (
              <Card key={a.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.module.title}</span>
                  <Badge
                    color={a.verdict === "STRONG" ? "green" : a.verdict === "PARTIAL" ? "amber" : "red"}
                  >
                    {a.score}/100
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-zinc-500">{a.feedback}</p>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
