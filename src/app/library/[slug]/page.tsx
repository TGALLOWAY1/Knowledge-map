import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ModuleReader, type ReaderTab } from "@/components/module-reader";

export const dynamic = "force-dynamic";

const READER_TABS = ["concepts", "quiz", "notes", "ask"] as const;

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const initialTab: ReaderTab = READER_TABS.includes(tab as ReaderTab)
    ? (tab as ReaderTab)
    : "concepts";
  const user = await getCurrentUser();

  const module = await prisma.module.findUnique({
    where: { slug },
    include: {
      category: true,
      lifecycleStage: true,
      asset: true,
      sourceMaterial: true,
      concepts: { orderBy: { order: "asc" } },
      quickHits: { orderBy: { order: "asc" } },
      notes: { where: { userId: user.id }, orderBy: { createdAt: "desc" } },
      bookmarks: { where: { userId: user.id }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!module || module.status !== "PUBLISHED") notFound();

  const related = await prisma.module.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: module.id },
      OR: [
        { categoryId: module.categoryId },
        { tags: { hasSome: module.tags } },
      ],
    },
    include: { category: true },
    take: 4,
  });

  return (
    <ModuleReader
      initialTab={initialTab}
      module={{
        id: module.id,
        slug: module.slug,
        title: module.title,
        subtitle: module.subtitle,
        summary: module.summary,
        tags: module.tags,
        categoryName: module.category.name,
        categoryColor: module.category.color,
        lifecycleName: module.lifecycleStage?.name ?? null,
        imageUrl: module.asset?.originalUrl ?? null,
        imageAlt: module.asset?.altText ?? module.title,
        concepts: module.concepts.map((c) => ({
          id: c.id,
          name: c.name,
          summary: c.summary,
          keyPoints: c.keyPoints,
        })),
        quickHits: module.quickHits.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
        })),
        notes: module.notes.map((n) => ({ id: n.id, body: n.body })),
        bookmarks: module.bookmarks.map((b) => ({
          id: b.id,
          title: b.title,
          body: b.body,
        })),
        related: related.map((r) => ({
          slug: r.slug,
          title: r.title,
          categoryName: r.category.name,
          categoryColor: r.category.color,
        })),
      }}
    />
  );
}
