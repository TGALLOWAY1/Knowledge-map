import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cardMastery, isWeak } from "@/lib/srs";
import { CATEGORIES, LIFECYCLE_STAGES } from "@/lib/constants";
import { Card, Badge, ProgressBar, EmptyState, inputClass } from "@/components/ui";
import { SmartImage } from "@/components/smart-image";
import clsx from "clsx";

export const dynamic = "force-dynamic";

interface Search {
  category?: string;
  stage?: string;
  q?: string;
  tag?: string;
  filter?: string; // "due" | "weak" | "new" | "mastered"
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const modules = await prisma.module.findMany({
    where: {
      status: "PUBLISHED",
      ...(params.category && { category: { slug: params.category } }),
      ...(params.stage && { lifecycleStage: { slug: params.stage } }),
      ...(params.tag && { tags: { has: params.tag } }),
      ...(params.q && {
        OR: [
          { title: { contains: params.q, mode: "insensitive" as const } },
          { subtitle: { contains: params.q, mode: "insensitive" as const } },
          { summary: { contains: params.q, mode: "insensitive" as const } },
          { concepts: { some: { name: { contains: params.q, mode: "insensitive" as const } } } },
        ],
      }),
    },
    include: {
      category: true,
      lifecycleStage: true,
      asset: true,
      concepts: { include: { reviewStates: { where: { userId: user.id } } } },
      quickHits: { include: { reviewStates: { where: { userId: user.id } } } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const now = new Date();
  const enriched = modules.map((m) => {
    const states = [
      ...m.concepts.flatMap((c) => c.reviewStates),
      ...m.quickHits.flatMap((q) => q.reviewStates),
    ];
    const srs = states.map((s) => ({
      status: s.status,
      intervalDays: s.intervalDays,
      reps: s.reps,
      lapses: s.lapses,
    }));
    const mastery = srs.length
      ? srs.reduce((sum, s) => sum + cardMastery(s), 0) / srs.length
      : 0;
    const due = states.filter((s) => s.status !== "NEW" && s.dueAt <= now).length;
    const overdue = states.filter(
      (s) => s.status !== "NEW" && now.getTime() - s.dueAt.getTime() > 24 * 3600 * 1000,
    ).length;
    const weak = srs.some((s) => isWeak(s));
    const isNew = states.every((s) => s.status === "NEW");
    return { module: m, mastery, due, overdue, weak, isNew };
  });

  const filtered = enriched.filter((e) => {
    if (params.filter === "due") return e.due > 0;
    if (params.filter === "overdue") return e.overdue > 0;
    if (params.filter === "weak") return e.weak;
    if (params.filter === "new") return e.isNew;
    if (params.filter === "mastered") return e.mastery >= 0.7;
    return true;
  });

  const link = (patch: Partial<Search>) => {
    const merged = { ...params, ...patch };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/library${qs ? `?${qs}` : ""}`;
  };

  const chip = (active: boolean) =>
    clsx(
      "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
      active
        ? "bg-violet-600 text-white"
        : "bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15",
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <form action="/library" className="w-full sm:w-64">
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.stage && <input type="hidden" name="stage" value={params.stage} />}
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search modules & concepts…"
            className={inputClass}
          />
        </form>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={link({ category: undefined })} className={chip(!params.category)}>
          All categories
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={link({ category: params.category === c.slug ? undefined : c.slug })}
            className={chip(params.category === c.slug)}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={link({ stage: undefined })} className={chip(!params.stage)}>
          All lifecycle stages
        </Link>
        {LIFECYCLE_STAGES.map((s) => (
          <Link
            key={s.slug}
            href={link({ stage: params.stage === s.slug ? undefined : s.slug })}
            className={chip(params.stage === s.slug)}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["", "All"],
          ["due", "Due"],
          ["overdue", "Overdue"],
          ["weak", "Weak"],
          ["new", "Unstudied"],
          ["mastered", "Mastered"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={link({ filter: value || undefined })}
            className={chip((params.filter ?? "") === value)}
          >
            {label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No modules match"
          hint="Adjust the filters, or publish new modules from the Studio."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ module: m, mastery, due }) => (
            <Link key={m.id} href={`/library/${m.slug}`} className="group block">
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <SmartImage
                    src={m.asset?.thumbnailUrl ?? m.asset?.originalUrl}
                    alt={m.asset?.altText ?? m.title}
                    className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                    fallback={
                      <div className="flex h-full items-center justify-center text-3xl font-semibold text-zinc-300 dark:text-zinc-600">
                        {m.title.slice(0, 1)}
                      </div>
                    }
                  />
                  {due > 0 && (
                    <Badge color="red" className="absolute right-2 top-2 bg-white/90 dark:bg-zinc-900/90">
                      {due} due
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color={m.category.color}>{m.category.name}</Badge>
                    {m.lifecycleStage && <Badge>{m.lifecycleStage.name}</Badge>}
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold">{m.title}</h3>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={mastery} className="flex-1" />
                    <span className="text-[11px] tabular-nums text-zinc-500">
                      {Math.round(mastery * 100)}%
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
