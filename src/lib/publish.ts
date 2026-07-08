import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/constants";
import type { GeneratedModule } from "@/lib/ai/schemas";

// Publishes a reviewed StudyModuleDraft: creates the Module with its
// concepts, quick hits, questions and rubrics, initializes review state for
// every card, and links source material + asset.

export async function publishDraft(draftId: string, userId: string) {
  const draft = await prisma.studyModuleDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { sourceMaterial: true },
  });
  const content = draft.content as unknown as GeneratedModule;

  const category = await prisma.category.findFirst({ where: { name: content.category } });
  if (!category) throw new Error(`Unknown category: ${content.category}`);
  const lifecycle = await prisma.lifecycleStage.findFirst({
    where: { name: content.lifecycleStage },
  });

  const baseSlug = slugify(content.title) || "module";
  let slug = baseSlug;
  for (let i = 2; await prisma.module.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  const assetId = draft.sourceMaterial.assetId;
  if (assetId && content.altText) {
    await prisma.infographicAsset.update({
      where: { id: assetId },
      data: { altText: content.altText },
    });
  }

  const module = await prisma.module.create({
    data: {
      slug,
      title: content.title,
      subtitle: content.subtitle,
      summary: content.summary,
      tags: content.tags,
      categoryId: category.id,
      lifecycleStageId: lifecycle?.id,
      assetId: assetId ?? undefined,
      sourceMaterialId: draft.sourceMaterialId,
      concepts: {
        create: content.concepts.map((c, order) => ({
          name: c.name,
          summary: c.summary,
          keyPoints: c.keyPoints,
          order,
        })),
      },
      quickHits: {
        create: content.quickHits.map((q, order) => ({
          question: q.question,
          answer: q.answer,
          order,
        })),
      },
    },
    include: { concepts: true, quickHits: true },
  });

  for (const q of content.questions ?? []) {
    await prisma.question.create({
      data: {
        module: { connect: { id: module.id } },
        prompt: q.prompt,
        rubric: { create: { content: q.rubric as object } },
      },
    });
  }

  await initReviewStates(userId, module.id);

  await prisma.studyModuleDraft.update({
    where: { id: draft.id },
    data: { status: "PUBLISHED", moduleId: module.id },
  });
  await prisma.sourceMaterial.update({
    where: { id: draft.sourceMaterialId },
    data: { publishedAt: new Date() },
  });
  if (draft.sourceMaterial.briefId) {
    await prisma.infographicBrief.update({
      where: { id: draft.sourceMaterial.briefId },
      data: { stage: "IMAGE_ATTACHED" },
    });
  }

  return module;
}

// Ensure every concept and quick hit of a module has a ReviewState row.
export async function initReviewStates(userId: string, moduleId: string) {
  const [concepts, quickHits, existing] = await Promise.all([
    prisma.concept.findMany({ where: { moduleId }, select: { id: true } }),
    prisma.quickHit.findMany({ where: { moduleId }, select: { id: true } }),
    prisma.reviewState.findMany({
      where: { userId, OR: [{ concept: { moduleId } }, { quickHit: { moduleId } }] },
      select: { conceptId: true, quickHitId: true },
    }),
  ]);

  // SQLite's createMany has no skipDuplicates, so filter out cards that already
  // have a ReviewState (e.g. when republishing an existing module).
  const seenConcepts = new Set(existing.map((s) => s.conceptId).filter(Boolean));
  const seenQuickHits = new Set(existing.map((s) => s.quickHitId).filter(Boolean));

  const data = [
    ...concepts.filter((c) => !seenConcepts.has(c.id)).map((c) => ({ userId, conceptId: c.id })),
    ...quickHits.filter((q) => !seenQuickHits.has(q.id)).map((q) => ({ userId, quickHitId: q.id })),
  ];
  if (data.length > 0) await prisma.reviewState.createMany({ data });
}
