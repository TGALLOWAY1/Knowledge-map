import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  loadCardStates,
  summarize,
  reviewStreak,
  hasRecentMiss,
  type CardStateLite,
} from "@/lib/analytics";
import { isWeak, cardMastery } from "@/lib/srs";
import {
  Card,
  StatTile,
  Badge,
  ProgressBar,
  buttonClass,
  EmptyState,
} from "@/components/ui";
import { TodayFocus, type FocusItem } from "@/components/today-focus";
import { SuggestionCard } from "@/components/suggestion-card";
import { greeting, formatDate, dueLabel } from "@/lib/format";
import {
  CalendarDays,
  TrendingDown,
  Target,
  CheckCircle2,
  Flame,
  Plus,
  ChevronRight,
  Lightbulb,
  FileText,
  Image as ImageIcon,
  ClipboardCheck,
  Inbox,
  SlidersHorizontal,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TIPS = [
  "Mix up your review! Studies show interleaving topics improves long-term retention.",
  "Rate honestly — “Again” is a scheduling signal, not a failure. The algorithm needs it.",
  "Explaining a concept out loud before revealing the answer strengthens recall far more than re-reading.",
  "Short daily sessions beat long weekly marathons. Ten minutes today protects your streak.",
  "Turn a missed card into an infographic concept — building the visual is itself a powerful encoding step.",
  "Use Test Me on your weakest module once a week; retrieval practice under pressure mirrors interviews.",
  "When a card feels too easy, it probably belongs in a deeper module. Split big topics into focused ones.",
];

function toFocusItem(s: CardStateLite, now: Date): FocusItem {
  return {
    id: s.id,
    label: s.cardLabel,
    moduleTitle: s.moduleTitle,
    moduleId: s.moduleId,
    categoryName: s.categoryName,
    dueText: s.status === "NEW" ? "New" : dueLabel(s.dueAt, now),
    isConcept: s.conceptId !== null,
  };
}

export default async function TodayPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const [states, streak, counts, topGap, modules] = await Promise.all([
    loadCardStates(user.id),
    reviewStreak(user.id),
    Promise.all([
      prisma.infographicBrief.count({ where: { stage: "DRAFT" } }),
      prisma.infographicBrief.count({ where: { stage: "AWAITING_IMAGE" } }),
      prisma.studyModuleDraft.count({ where: { status: "NEEDS_REVIEW" } }),
      prisma.conceptGap.count({ where: { status: "BACKLOG" } }),
    ]),
    prisma.conceptGap.findFirst({
      where: { status: "SUGGESTED" },
      include: { category: true, lifecycleStage: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.module.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true, asset: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  const [draftCount, awaitingCount, reviewCount, backlogCount] = counts;

  const stats = summarize(states);
  const asSrs = (s: CardStateLite) => ({
    status: s.status as "NEW" | "LEARNING" | "REVIEW" | "LAPSED",
    intervalDays: s.intervalDays,
    reps: s.reps,
    lapses: s.lapses,
  });

  const missCutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const dueItems = states
    .filter((s) => s.status !== "NEW" && s.dueAt <= now)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .concat(
      states
        .filter((s) => s.status !== "NEW" && s.dueAt > now)
        .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
        .slice(0, 5),
    )
    .slice(0, 8)
    .map((s) => toFocusItem(s, now));
  const weakItems = states
    .filter((s) => isWeak(asSrs(s)))
    .sort((a, b) => cardMastery(asSrs(a)) - cardMastery(asSrs(b)))
    .slice(0, 8)
    .map((s) => toFocusItem(s, now));
  const missedItems = states
    .filter((s) => hasRecentMiss(s.history, missCutoff))
    .slice(0, 8)
    .map((s) => toFocusItem(s, now));

  // Continue Learning: recently reviewed modules, by most recent review.
  const lastByModule = new Map<string, Date>();
  const masteryByModule = new Map<string, { sum: number; n: number }>();
  for (const s of states) {
    if (s.lastReviewedAt) {
      const prev = lastByModule.get(s.moduleId);
      if (!prev || s.lastReviewedAt > prev) lastByModule.set(s.moduleId, s.lastReviewedAt);
    }
    const m = masteryByModule.get(s.moduleId) ?? { sum: 0, n: 0 };
    m.sum += cardMastery(asSrs(s));
    m.n += 1;
    masteryByModule.set(s.moduleId, m);
  }
  const continueModules = modules
    .filter((m) => lastByModule.has(m.id))
    .sort((a, b) => lastByModule.get(b.id)!.getTime() - lastByModule.get(a.id)!.getTime())
    .slice(0, 3);
  const moduleMastery = (id: string) => {
    const m = masteryByModule.get(id);
    return m && m.n > 0 ? m.sum / m.n : 0;
  };

  const tip = TIPS[Math.floor((now.getTime() / 86400000) % TIPS.length)];
  const firstName = (user.name ?? "there").split(" ")[0];

  const studioRows = [
    { label: "Draft briefs", count: draftCount, tab: "briefs", icon: FileText },
    { label: "Awaiting image", count: awaitingCount, tab: "awaiting", icon: ImageIcon },
    { label: "Needs review", count: reviewCount, tab: "review", icon: ClipboardCheck },
    { label: "Backlog", count: backlogCount, tab: "backlog", icon: Inbox },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting(now)}, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Here&apos;s what&apos;s happening with your learning today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-sm text-zinc-500 sm:flex">
            <CalendarDays className="h-4 w-4" />
            {formatDate(now)}
          </span>
          <Link href="/review" className={buttonClass("secondary", "sm")}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Change focus
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label="Due Today"
          value={stats.dueCount}
          sub="Review concepts"
          icon={CalendarDays}
          tone="violet"
          href="/review/session?scope=due"
          accent
        />
        <StatTile
          label="Weak Concepts"
          value={stats.weakCount}
          sub="Needs more practice"
          icon={TrendingDown}
          tone="amber"
          href="/review/session?scope=weak"
        />
        <StatTile
          label="Recent Misses"
          value={stats.missedCount}
          sub="From last 7 days"
          icon={Target}
          tone="red"
          href="/review/session?scope=missed"
        />
        <StatTile
          label="Overall Mastery"
          value={`${Math.round(stats.mastery * 100)}%`}
          progress={stats.mastery}
          icon={CheckCircle2}
          tone="emerald"
          href="/analytics"
        />
        <StatTile
          label="Day Streak"
          value={streak}
          sub={streak > 0 ? "Keep it going!" : "Start today"}
          icon={Flame}
          tone="sky"
          href="/analytics"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Left column */}
        <div className="space-y-4">
          <TodayFocus
            due={dueItems}
            weak={weakItems}
            missed={missedItems}
            startScope={stats.dueCount > 0 ? "due" : "all"}
          />

          {topGap && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold">Knowledge Gaps</h2>
                <Link
                  href="/studio?tab=suggestions"
                  className="text-xs font-medium text-violet-600 dark:text-violet-300"
                >
                  View all
                </Link>
              </div>
              <SuggestionCard
                gap={{
                  id: topGap.id,
                  title: topGap.title,
                  reason: topGap.reason,
                  priority: topGap.priority,
                  categoryName: topGap.category?.name,
                  categoryColor: topGap.category?.color,
                  lifecycleName: topGap.lifecycleStage?.name,
                }}
                compact
              />
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Continue Learning</h2>
              <Link
                href="/library"
                className="text-xs font-medium text-violet-600 dark:text-violet-300"
              >
                View all
              </Link>
            </div>
            {continueModules.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                Start a review session and your recent modules will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {continueModules.map((m, i) =>
                  i === 0 ? (
                    <div
                      key={m.id}
                      className="flex gap-3 rounded-lg border border-black/5 p-3 dark:border-white/10"
                    >
                      {m.asset?.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.asset.thumbnailUrl}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-lg object-cover object-top"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate text-sm font-semibold">{m.title}</p>
                        <p className="text-xs text-zinc-500">You were reviewing</p>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={moduleMastery(m.id)} className="flex-1" />
                          <span className="text-xs tabular-nums text-zinc-500">
                            {Math.round(moduleMastery(m.id) * 100)}%
                          </span>
                        </div>
                        <Link
                          href={`/library/${m.slug}`}
                          className={buttonClass("primary", "sm")}
                        >
                          Continue
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={m.id}
                      href={`/library/${m.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-black/5 px-3 py-2.5 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 dark:border-white/10"
                    >
                      {m.asset?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.asset.thumbnailUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover object-top"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                          <FileText className="h-4 w-4 text-violet-500" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.title}</span>
                        <span className="block text-xs text-zinc-500">
                          {m.category.name} · {Math.round(moduleMastery(m.id) * 100)}% mastery
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                    </Link>
                  ),
                )}
              </div>
            )}
          </Card>

          <Card className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Drafts &amp; Studio</h2>
              <Link
                href="/studio"
                className="text-xs font-medium text-violet-600 dark:text-violet-300"
              >
                View studio
              </Link>
            </div>
            <div className="space-y-1.5">
              {studioRows.map(({ label, count, tab, icon: Icon }) => (
                <Link
                  key={tab}
                  href={`/studio?tab=${tab}`}
                  className="flex items-center gap-2.5 rounded-lg border border-black/5 px-3 py-2 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 dark:border-white/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                </Link>
              ))}
              <Link
                href="/studio/add"
                className="flex items-center gap-3 rounded-lg border border-dashed border-black/15 px-3 py-3 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5 dark:border-white/20"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                  <Plus className="h-4 w-4 text-zinc-500" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Add Existing Infographic</span>
                  <span className="block text-xs text-zinc-500">
                    Quickly add an infographic you&apos;ve already created.
                  </span>
                </span>
              </Link>
            </div>
          </Card>
        </div>
      </div>

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

      <Card className="flex items-center gap-3 px-5 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Lightbulb className="h-4 w-4" />
        </span>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Tip of the day</span>
          {"  ·  "}
          {tip}
        </p>
        <Badge color="sky" className="ml-auto hidden shrink-0 sm:inline-flex">
          Daily rotation
        </Badge>
      </Card>
    </div>
  );
}
