import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ModuleReader } from "@/components/module-reader";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  // Related = same category or a shared tag. SQLite can't query inside a JSON
  // list, so score the (small) published set in application code.
  const moduleTags = module.tags as string[];
  const related = (
    await prisma.module.findMany({
      where: { status: "PUBLISHED", id: { not: module.id } },
      include: { category: true },
    })
  )
    .filter(
      (r) =>
        r.categoryId === module.categoryId ||
        (r.tags as string[]).some((t) => moduleTags.includes(t)),
    )
    .slice(0, 4);

  return (
    <ModuleReader
      module={{
        id: module.id,
        slug: module.slug,
        title: module.title,
        subtitle: module.subtitle,
        summary: module.summary,
        tags: module.tags as string[],
        categoryName: module.category.name,
        categoryColor: module.category.color,
        lifecycleName: module.lifecycleStage?.name ?? null,
        imageUrl: module.asset?.originalUrl ?? null,
        imageAlt: module.asset?.altText ?? module.title,
        concepts: module.concepts.map((c) => ({
          id: c.id,
          name: c.name,
          summary: c.summary,
          keyPoints: c.keyPoints as string[],
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
