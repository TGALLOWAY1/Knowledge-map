import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DraftEditor } from "@/components/draft-editor";
import type { GeneratedModule } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await prisma.studyModuleDraft.findUnique({
    where: { id },
    include: { sourceMaterial: { include: { asset: true, brief: true } }, module: true },
  });
  if (!draft) notFound();

  return (
    <DraftEditor
      draft={{
        id: draft.id,
        status: draft.status,
        generationVersion: draft.generationVersion,
        content: draft.content as unknown as GeneratedModule,
        moduleSlug: draft.module?.slug ?? null,
        briefId: draft.sourceMaterial.briefId,
        sourceConcept: draft.sourceMaterial.concept,
        hasImagePrompt: !!draft.sourceMaterial.imagePrompt,
        sourceCreatedAt: draft.sourceMaterial.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
        asset: draft.sourceMaterial.asset
          ? {
              id: draft.sourceMaterial.asset.id,
              originalUrl: draft.sourceMaterial.asset.originalUrl,
              thumbnailUrl: draft.sourceMaterial.asset.thumbnailUrl,
            }
          : null,
      }}
    />
  );
}
