import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { loadCardStates, summarize, reviewStreak } from "@/lib/analytics";
import {
  Card,
  SectionHeader,
  StatTile,
  Badge,
  buttonClass,
  EmptyState,
} from "@/components/ui";
import { Play, Lightbulb, Plus, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await getCurrentUser();
  const [states, streak, awaitingImage, needsReview, suggestions, moduleCount] =
    await Promise.all([
      loadCardStates(user.id),
      reviewStreak(user.id),
      prisma.infographicBrief.findMany({
        where: { stage: "AWAITING_IMAGE" },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.studyModuleDraft.findMany({
        where: { status: "NEEDS_REVIEW" },
        include: { sourceMaterial: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.conceptGap.findMany({
        where: { status: "SUGGESTED" },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 4,
      }),
      prisma.module.count({ where: { status: "PUBLISHED" } }),
    ]);

  const stats = summarize(states);
  const recentlyMissed = states
    .filter((s) => {
      const h = (s.history as { at: string; rating: string }[]) ?? [];
      return h.slice(-2).some((x) => x.rating === "again");
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {moduleCount} modules · {stats.totalCards} cards in rotation
          </p>
        </div>
        {streak > 0 && (
          <Badge color="amber" className="gap-1 px-3 py-1 text-xs">
            <Flame className="h-3.5 w-3.5" /> {streak}-day streak
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Due today" value={stats.dueCount} href="/review/session?scope=due" accent />
        <StatTile label="Weak concepts" value={stats.weakCount} href="/review/session?scope=weak" />
        <StatTile label="New cards" value={stats.newCount} href="/review/session?scope=new" />
        <StatTile label="Overall mastery" value={`${Math.round(stats.mastery * 100)}%`} href="/analytics" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/review/session?scope=all" className={buttonClass("primary", "lg")}>
          <Play className="h-4 w-4" /> Start Mixed Review
        </Link>
        <Link href="/studio?tab=suggestions" className={buttonClass("secondary", "lg")}>
          <Lightbulb className="h-4 w-4" /> Explore Knowledge Gaps
        </Link>
        <Link href="/studio/add" className={buttonClass("secondary", "lg")}>
          <Plus className="h-4 w-4" /> Add Existing Infographic
        </Link>
      </div>

      {needsReview.length > 0 && (
        <section>
          <SectionHeader
            title="Drafts needing review"
            action={<Link href="/studio?tab=review" className="text-xs text-violet-600 dark:text-violet-300">View all</Link>}
          />
          <div className="space-y-2">
            {needsReview.map((d) => {
              const content = d.content as { title?: string };
              return (
                <Link key={d.id} href={`/studio/drafts/${d.id}`} className="block">
                  <Card className="flex items-center justify-between px-4 py-3 transition-shadow hover:shadow-md">
                    <span className="text-sm font-medium">
                      {content.title ?? d.sourceMaterial.concept}
                    </span>
                    <Badge color="amber">needs review</Badge>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {awaitingImage.length > 0 && (
        <section>
          <SectionHeader
            title="Awaiting image"
            action={<Link href="/studio?tab=awaiting" className="text-xs text-violet-600 dark:text-violet-300">View all</Link>}
          />
          <div className="space-y-2">
            {awaitingImage.map((b) => (
              <Link key={b.id} href={`/studio/briefs/${b.id}`} className="block">
                <Card className="flex items-center justify-between px-4 py-3 transition-shadow hover:shadow-md">
                  <span className="text-sm font-medium">{b.title}</span>
                  <Badge color="sky">awaiting image</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <SectionHeader
            title="Suggested infographic gaps"
            action={<Link href="/studio?tab=suggestions" className="text-xs text-violet-600 dark:text-violet-300">View all</Link>}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((g) => (
              <Card key={g.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{g.title}</span>
                  <Badge color={g.priority === "HIGH" ? "red" : g.priority === "MEDIUM" ? "amber" : "zinc"}>
                    {g.priority.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{g.reason}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {recentlyMissed.length > 0 && (
        <section>
          <SectionHeader title="Recently missed" />
          <div className="space-y-2">
            {recentlyMissed.map((s) => (
              <Card key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.cardLabel}</p>
                  <p className="text-xs text-zinc-500">{s.moduleTitle}</p>
                </div>
                <Link
                  href={`/review/session?scope=missed`}
                  className="text-xs font-medium text-violet-600 dark:text-violet-300"
                >
                  Drill
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {stats.totalCards === 0 && (
        <EmptyState
          title="No study content yet"
          hint="Seed the database (npm run db:seed) or add your first infographic in the Studio."
          action={
            <Link href="/studio/add" className={buttonClass("primary", "md")}>
              Add Existing Infographic
            </Link>
          }
        />
      )}
    </div>
  );
}
