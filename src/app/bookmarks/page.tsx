import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, Badge, EmptyState, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { DeleteItemButton } from "@/components/delete-item-button";
import { relativeTime } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { Bookmark, ArrowUpRight, ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  deep_dive: { label: "Deep dive", color: "violet" },
  module: { label: "Module", color: "sky" },
  concept: { label: "Concept", color: "emerald" },
  quickhit: { label: "Quick hit", color: "amber" },
};

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    include: {
      module: { include: { category: true } },
      concept: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Bookmarks"
        subtitle="Saved explanations, starred modules, and cards you want to revisit."
      />
      {bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          hint="Bookmark cards during review sessions, or save deep-dive explanations from the module reader."
          action={
            <Link href="/review" className={buttonClass("primary", "sm")}>
              Start Reviewing
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => {
            const kind = KIND_LABELS[bm.kind] ?? { label: bm.kind, color: "zinc" };
            return (
              <Card key={bm.id} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Bookmark className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold">{bm.title}</span>
                  <Badge color={kind.color}>{kind.label}</Badge>
                  {bm.concept && <Badge color="emerald">{bm.concept.name}</Badge>}
                  {bm.module?.category && (
                    <Badge color={bm.module.category.color}>{bm.module.category.name}</Badge>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">
                      {relativeTime(bm.createdAt)}
                    </span>
                    <DeleteItemButton endpoint="/api/bookmarks" id={bm.id} label="" />
                  </span>
                </div>
                {bm.module && (
                  <Link
                    href={`/library/${bm.module.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                  >
                    {bm.module.title}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
                {bm.body && (
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      Show saved content
                    </summary>
                    <div
                      className="prose-lite mt-2 text-sm text-zinc-700 dark:text-zinc-300"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(bm.body) }}
                    />
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
