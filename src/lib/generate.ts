import { prisma } from "@/lib/prisma";
import { structuredCall, MODEL_STRONG } from "@/lib/ai/client";
import { MODULE_SCHEMA, type GeneratedModule } from "@/lib/ai/schemas";
import { MODULE_SYSTEM, moduleUser } from "@/lib/ai/prompts";

// Generates (or regenerates) a StudyModuleDraft from source material.
// Source material — not the image — is the source of truth.

export async function generateDraft(sourceMaterialId: string) {
  const source = await prisma.sourceMaterial.findUniqueOrThrow({
    where: { id: sourceMaterialId },
  });

  const content = await structuredCall<GeneratedModule>({
    model: MODEL_STRONG,
    system: MODULE_SYSTEM,
    user: moduleUser({
      concept: source.concept,
      details: source.details,
      imagePrompt: source.imagePrompt,
      notes: source.notes,
    }),
    schema: MODULE_SCHEMA,
  });

  const version = source.generationVersion + 1;
  await prisma.sourceMaterial.update({
    where: { id: source.id },
    data: { generationVersion: version },
  });

  const existing = await prisma.studyModuleDraft.findFirst({
    where: { sourceMaterialId: source.id, status: "NEEDS_REVIEW" },
  });
  if (existing) {
    return prisma.studyModuleDraft.update({
      where: { id: existing.id },
      data: { content: content as object, generationVersion: version },
    });
  }
  return prisma.studyModuleDraft.create({
    data: {
      sourceMaterialId: source.id,
      content: content as object,
      generationVersion: version,
    },
  });
}
