import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BriefWorkbench } from "@/components/brief-workbench";
import type { BriefContent } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = await prisma.infographicBrief.findUnique({
    where: { id },
    include: {
      category: true,
      lifecycleStage: true,
      conceptGap: true,
      imagePrompts: { orderBy: { version: "desc" } },
      sourceMaterial: { include: { asset: true, drafts: true } },
    },
  });
  if (!brief) notFound();

  const draft = brief.sourceMaterial?.drafts.find((d) => d.status === "NEEDS_REVIEW");

  return (
    <BriefWorkbench
      brief={{
        id: brief.id,
        title: brief.title,
        stage: brief.stage,
        categoryName: brief.category?.name ?? null,
        lifecycleName: brief.lifecycleStage?.name ?? null,
        gapPriority: brief.conceptGap?.priority ?? null,
        content: brief.content as unknown as BriefContent,
        prompts: brief.imagePrompts.map((p) => ({
          id: p.id,
          version: p.version,
          promptText: p.promptText,
          createdAt: p.createdAt.toISOString(),
        })),
        draftId: draft?.id ?? null,
        asset: brief.sourceMaterial?.asset
          ? {
              id: brief.sourceMaterial.asset.id,
              originalUrl: brief.sourceMaterial.asset.originalUrl,
              thumbnailUrl: brief.sourceMaterial.asset.thumbnailUrl,
            }
          : null,
        createdAt: brief.createdAt.toISOString(),
        updatedAt: brief.updatedAt.toISOString(),
      }}
    />
  );
}
