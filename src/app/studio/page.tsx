import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { loadCardStates, summarize } from "@/lib/analytics";
import { CATEGORIES, LIFECYCLE_STAGES } from "@/lib/constants";
import { Card, Badge, EmptyState, ProgressBar, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { SmartImage } from "@/components/smart-image";
import { SuggestionCard } from "@/components/suggestion-card";
import { GenerateSuggestions, AddBacklogForm } from "@/components/studio-gaps";
import {
  Plus,
  BookOpen,
  Lightbulb,
  Inbox,
  FileText,
  Image as ImageIcon,
  ClipboardCheck,
  Rocket,
  Radar,
  Play,
  Target,
  Database,
  Boxes,
  Gauge,
  Activity,
  Network,
  MessageSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "suggestions", label: "Suggestions", icon: Lightbulb },
  { key: "backlog", label: "Backlog", icon: Inbox },
  { key: "briefs", label: "Draft Briefs", icon: FileText },
  { key: "awaiting", label: "Awaiting Image", icon: ImageIcon },
  { key: "review", label: "Needs Review", icon: ClipboardCheck },
  { key: "published", label: "Published", icon: Rocket },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STAGE_ICONS: Record<string, { icon: typeof Target; color: string }> = {
  "Problem Framing": { icon: Target, color: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  "Data & Features": { icon: Database, color: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
  Modeling: { icon: Boxes, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  Evaluation: { icon: Gauge, color: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
  Deployment: { icon: Rocket, color: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300" },
  Monitoring: { icon: Activity, color: "bg-rose-500/10 text-rose-600 dark:text-rose-300" },
  "Systems Design": { icon: Network, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300" },
  "Interview Practice": { icon: MessageSquare, color: "bg-red-500/10 text-red-600 dark:text-red-300" },
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "suggestions";

  const [suggestions, backlog, briefs, awaiting, review, published] = await Promise.all([
    prisma.conceptGap.count({ where: { status: "SUGGESTED" } }),
    prisma.conceptGap.count({ where: { status: "BACKLOG" } }),
    prisma.infographicBrief.count({ where: { stage: "DRAFT" } }),
    prisma.infographicBrief.count({ where: { stage: "AWAITING_IMAGE" } }),
    prisma.studyModuleDraft.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.module.count({ where: { status: "PUBLISHED" } }),
  ]);
  const counts = { suggestions, backlog, briefs, awaiting, review, published };

  return (
    <div>
      <PageHeader
        title="Infographic Studio"
        subtitle="Build your visual curriculum from idea to infographic to mastery."
        actions={
          <>
            <Link href="/help" className={buttonClass("secondary", "md")}>
              <BookOpen className="h-4 w-4" /> Studio Guide
            </Link>
            <Link href="/studio/add" className={buttonClass("secondary", "md")}>
              <ImageIcon className="h-4 w-4" /> Add Existing
            </Link>
            <Link href="/studio?tab=backlog#add" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" /> New Concept
            </Link>
          </>
        }
      />

      <div className="-mx-4 mb-5 overflow-x-auto border-b border-black/5 px-4 sm:mx-0 sm:px-0 dark:border-white/10">
        <div className="flex min-w-max gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={`/studio?tab=${key}`}
              className={clsx(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === key
                  ? "border-violet-600 text-violet-700 dark:text-violet-300"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className={clsx(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  tab === key
                    ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : "bg-black/5 dark:bg-white/10",
                )}
              >
                {counts[key]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {tab === "suggestions" && (
            <Card className="flex flex-wrap items-center gap-3 border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <Radar className="h-4.5 w-4.5" />
              </span>
              <p className="min-w-0 flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                We analyze your review performance, missed cards, and curriculum coverage to
                suggest high-impact topics you should turn into infographics next.
              </p>
              <Link
                href="/help#suggestions"
                className={clsx(buttonClass("secondary", "sm"), "shrink-0")}
              >
                <Play className="h-3.5 w-3.5" /> How suggestions work
              </Link>
            </Card>
          )}

          {tab === "suggestions" && <SuggestionsTab />}
          {tab === "backlog" && <BacklogTab />}
          {tab === "briefs" && <BriefsTab stage="DRAFT" />}
          {tab === "awaiting" && <BriefsTab stage="AWAITING_IMAGE" />}
          {tab === "review" && <ReviewTab />}
          {tab === "published" && <PublishedTab />}
        </div>

        <aside className="space-y-4">
          <CoveragePanel />
          <Card className="space-y-2 px-4 py-4">
            <p className="text-sm font-semibold">Why these suggestions?</p>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              We look at your review performance, recently missed cards, curriculum balance
              across categories and lifecycle stages, and your stated goals.
            </p>
            <Link
              href="/help#suggestions"
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              Learn more →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

async function CoveragePanel() {
  const user = await getCurrentUser();
  const states = await loadCardStates(user.id);
  const stats = summarize(states);
  const byLifecycle = new Map(stats.byLifecycle.map((g) => [g.name, g]));
  const byCategory = new Map(stats.byCategory.map((g) => [g.name, g]));

  return (
    <Card className="space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Curriculum Coverage</p>
        <Link
          href="/analytics"
          className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
        >
          View full
        </Link>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Lifecycle stages
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {LIFECYCLE_STAGES.map((stage) => {
            const meta = STAGE_ICONS[stage.name];
            const Icon = meta?.icon ?? Target;
            const g = byLifecycle.get(stage.name);
            const mastery = g?.mastery ?? 0;
            return (
              <div key={stage.slug} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      meta?.color ?? "bg-zinc-500/10 text-zinc-500",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-[11px] font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ProgressBar value={mastery} className="flex-1" />
                  <span className="text-[10px] tabular-nums text-zinc-500">
                    {Math.round(mastery * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">Average card mastery per stage.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Categories
        </p>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const g = byCategory.get(cat.name);
            const mastered = g?.mastered ?? 0;
            const total = g?.cards ?? 0;
            return (
              <div key={cat.slug} className="flex items-center gap-2">
                <span className="w-40 truncate text-xs">{cat.name}</span>
                <ProgressBar value={total ? mastered / total : 0} className="flex-1" />
                <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-zinc-500">
                  {mastered} / {total}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">Cards mastered / total cards.</p>
      </div>
    </Card>
  );
}

async function SuggestionsTab() {
  const gaps = await prisma.conceptGap.findMany({
    where: { status: "SUGGESTED" },
    include: { category: true, lifecycleStage: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return (
    <div className="space-y-4">
      <GenerateSuggestions />
      {gaps.length === 0 ? (
        <EmptyState
          title="No suggestions yet"
          hint="Generate suggestions from your weak areas, coverage gaps, and study goals."
        />
      ) : (
        <div className="space-y-3">
          {gaps.map((g) => (
            <SuggestionCard
              key={g.id}
              gap={{
                id: g.id,
                title: g.title,
                reason: g.reason,
                recommendation: g.recommendation,
                sourceSignal: g.sourceSignal,
                priority: g.priority,
                categoryName: g.category?.name,
                categoryColor: g.category?.color,
                lifecycleName: g.lifecycleStage?.name,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function BacklogTab() {
  const gaps = await prisma.conceptGap.findMany({
    where: { status: "BACKLOG" },
    include: { category: true, lifecycleStage: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return (
    <div className="space-y-4">
      <div id="add">
        <AddBacklogForm />
      </div>
      {gaps.length === 0 ? (
        <EmptyState title="Backlog is empty" hint="Accept suggestions or add ideas manually." />
      ) : (
        <div className="space-y-3">
          {gaps.map((g) => (
            <SuggestionCard
              key={g.id}
              gap={{
                id: g.id,
                title: g.title,
                reason: g.reason,
                recommendation: g.recommendation,
                sourceSignal: g.sourceSignal,
                notes: g.notes,
                priority: g.priority,
                categoryName: g.category?.name,
                categoryColor: g.category?.color,
                lifecycleName: g.lifecycleStage?.name,
              }}
              inBacklog
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function BriefsTab({ stage }: { stage: "DRAFT" | "AWAITING_IMAGE" }) {
  const briefs = await prisma.infographicBrief.findMany({
    where: { stage },
    include: {
      category: true,
      lifecycleStage: true,
      imagePrompts: { orderBy: { version: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (briefs.length === 0) {
    return (
      <EmptyState
        title={stage === "DRAFT" ? "No draft briefs" : "Nothing awaiting an image"}
        hint={
          stage === "DRAFT"
            ? "Generate a brief from a suggestion or backlog item."
            : "Generate an image prompt from a draft brief to move it here."
        }
      />
    );
  }
  return (
    <div className="space-y-2">
      {briefs.map((b) => (
        <Link key={b.id} href={`/studio/briefs/${b.id}`} className="block">
          <Card className="flex items-center justify-between gap-3 px-4 py-3 transition-shadow hover:shadow-md">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{b.title}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {b.learningObjective ?? "—"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {b.category && <Badge color={b.category.color}>{b.category.name}</Badge>}
              <Badge color={stage === "DRAFT" ? "amber" : "sky"}>
                {stage === "DRAFT" ? "draft brief" : "awaiting image"}
              </Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

async function ReviewTab() {
  const drafts = await prisma.studyModuleDraft.findMany({
    where: { status: "NEEDS_REVIEW" },
    include: { sourceMaterial: { include: { asset: true } } },
    orderBy: { updatedAt: "desc" },
  });
  if (drafts.length === 0) {
    return (
      <EmptyState
        title="Nothing needs review"
        hint="Drafts appear here after study content is generated from source material."
      />
    );
  }
  return (
    <div className="space-y-2">
      {drafts.map((d) => {
        const content = d.content as { title?: string; summary?: string };
        return (
          <Link key={d.id} href={`/studio/drafts/${d.id}`} className="block">
            <Card className="flex items-center gap-3 px-4 py-3 transition-shadow hover:shadow-md">
              {d.sourceMaterial.asset?.thumbnailUrl && (
                <SmartImage
                  src={d.sourceMaterial.asset.thumbnailUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover object-top"
                  fallbackClassName="h-12 w-12 shrink-0 rounded-lg"
                  fallbackLabel=""
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {content.title ?? d.sourceMaterial.concept}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  generation v{d.generationVersion}
                </p>
              </div>
              <Badge color="amber">needs review</Badge>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

async function PublishedTab() {
  const modules = await prisma.module.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true, asset: true },
    orderBy: { publishedAt: "desc" },
  });
  if (modules.length === 0) {
    return <EmptyState title="Nothing published yet" />;
  }
  return (
    <div className="space-y-2">
      {modules.map((m) => (
        <Link key={m.id} href={`/library/${m.slug}`} className="block">
          <Card className="flex items-center gap-3 px-4 py-3 transition-shadow hover:shadow-md">
            {m.asset?.thumbnailUrl && (
              <SmartImage
                src={m.asset.thumbnailUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover object-top"
                fallbackClassName="h-12 w-12 shrink-0 rounded-lg"
                fallbackLabel=""
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{m.title}</p>
              <p className="truncate text-xs text-zinc-500">
                published {m.publishedAt.toLocaleDateString()}
              </p>
            </div>
            <Badge color={m.category.color}>{m.category.name}</Badge>
          </Card>
        </Link>
      ))}
    </div>
  );
}
