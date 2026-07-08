import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState, buttonClass } from "@/components/ui";
import { GapActions, GenerateSuggestions, AddBacklogForm } from "@/components/studio-gaps";
import { Plus } from "lucide-react";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "suggestions", label: "Suggestions" },
  { key: "backlog", label: "Backlog" },
  { key: "briefs", label: "Draft Briefs" },
  { key: "awaiting", label: "Awaiting Image" },
  { key: "review", label: "Needs Review" },
  { key: "published", label: "Published" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "suggestions";

  const counts = {
    suggestions: await prisma.conceptGap.count({ where: { status: "SUGGESTED" } }),
    backlog: await prisma.conceptGap.count({ where: { status: "BACKLOG" } }),
    briefs: await prisma.infographicBrief.count({ where: { stage: "DRAFT" } }),
    awaiting: await prisma.infographicBrief.count({ where: { stage: "AWAITING_IMAGE" } }),
    review: await prisma.studyModuleDraft.count({ where: { status: "NEEDS_REVIEW" } }),
    published: await prisma.module.count({ where: { status: "PUBLISHED" } }),
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Infographic Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">
            gap → brief → image prompt → image → review → published module
          </p>
        </div>
        <Link href="/studio/add" className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Add Existing Infographic
        </Link>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/studio?tab=${t.key}`}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-violet-600 text-white"
                : "bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300",
            )}
          >
            {t.label}
            <span
              className={clsx(
                "rounded-full px-1.5 text-[10px] tabular-nums",
                tab === t.key ? "bg-white/20" : "bg-black/10 dark:bg-white/10",
              )}
            >
              {counts[t.key]}
            </span>
          </Link>
        ))}
      </div>

      {tab === "suggestions" && <SuggestionsTab />}
      {tab === "backlog" && <BacklogTab />}
      {tab === "briefs" && <BriefsTab stage="DRAFT" />}
      {tab === "awaiting" && <BriefsTab stage="AWAITING_IMAGE" />}
      {tab === "review" && <ReviewTab />}
      {tab === "published" && <PublishedTab />}
    </div>
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
            <Card key={g.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <Badge color={g.priority === "HIGH" ? "red" : g.priority === "MEDIUM" ? "amber" : "zinc"}>
                  {g.priority.toLowerCase()}
                </Badge>
                {g.category && <Badge color={g.category.color}>{g.category.name}</Badge>}
                {g.lifecycleStage && <Badge>{g.lifecycleStage.name}</Badge>}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium">Why this matters: </span>
                {g.reason}
              </p>
              {g.recommendation && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">Recommended infographic: </span>
                  {g.recommendation}
                </p>
              )}
              {g.sourceSignal && (
                <p className="text-xs text-zinc-500">Signal: {g.sourceSignal}</p>
              )}
              <GapActions gapId={g.id} />
            </Card>
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
      <AddBacklogForm />
      {gaps.length === 0 ? (
        <EmptyState title="Backlog is empty" hint="Accept suggestions or add ideas manually." />
      ) : (
        <div className="space-y-3">
          {gaps.map((g) => (
            <Card key={g.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <Badge color={g.priority === "HIGH" ? "red" : g.priority === "MEDIUM" ? "amber" : "zinc"}>
                  {g.priority.toLowerCase()}
                </Badge>
                {g.category && <Badge color={g.category.color}>{g.category.name}</Badge>}
                {g.lifecycleStage && <Badge>{g.lifecycleStage.name}</Badge>}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{g.reason}</p>
              {g.notes && <p className="text-xs text-zinc-500">{g.notes}</p>}
              <GapActions gapId={g.id} inBacklog />
            </Card>
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.sourceMaterial.asset.thumbnailUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover object-top"
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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.asset.thumbnailUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover object-top"
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
