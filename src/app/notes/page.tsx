import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, Badge, EmptyState, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { DeleteItemButton } from "@/components/delete-item-button";
import { relativeTime } from "@/lib/format";
import { StickyNote, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const user = await getCurrentUser();
  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    include: {
      module: { include: { category: true } },
      concept: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Everything you've jotted down while studying, in one place."
      />
      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          hint="Open a module in your Library and use the Notes tab to capture thoughts while you study."
          action={
            <Link href="/library" className={buttonClass("primary", "sm")}>
              Browse Library
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <StickyNote className="h-3.5 w-3.5" />
                </span>
                {note.module ? (
                  <Link
                    href={`/library/${note.module.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold hover:text-violet-600 dark:hover:text-violet-300"
                  >
                    {note.module.title}
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                  </Link>
                ) : (
                  <span className="text-sm font-semibold">General note</span>
                )}
                {note.concept && <Badge color="violet">{note.concept.name}</Badge>}
                {note.module?.category && (
                  <Badge color={note.module.category.color}>{note.module.category.name}</Badge>
                )}
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">
                    {relativeTime(note.updatedAt)}
                  </span>
                  <DeleteItemButton endpoint="/api/notes" id={note.id} label="" />
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {note.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
