import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

// Seeds the taxonomy and migrates the prototype's infographic collection
// (data/infographic-catalog.json — cataloged from the original Google Drive
// images) into real database records: source material, assets, published
// modules with concepts/quick hits, and review state for the default user.
//
// Idempotent: re-running updates nothing that already exists (matched by slug).

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "ai-systems-engineering", name: "AI Systems & Engineering", color: "violet" },
  { slug: "llms-generative-ai", name: "LLMs & Generative AI", color: "fuchsia" },
  { slug: "ml-foundations", name: "ML Foundations", color: "sky" },
  { slug: "software-engineering", name: "Software Engineering", color: "emerald" },
  { slug: "frameworks-tooling", name: "Frameworks & Tooling", color: "amber" },
  { slug: "statistics-experimentation", name: "Statistics & Experimentation", color: "rose" },
  { slug: "tools-productivity", name: "Tools & Productivity", color: "cyan" },
];

const LIFECYCLE_STAGES = [
  { slug: "problem-framing", name: "Problem Framing" },
  { slug: "data-features", name: "Data & Features" },
  { slug: "modeling", name: "Modeling" },
  { slug: "evaluation", name: "Evaluation" },
  { slug: "deployment", name: "Deployment" },
  { slug: "monitoring", name: "Monitoring" },
  { slug: "systems-design", name: "Systems Design" },
  { slug: "interview-practice", name: "Interview Practice" },
];

interface CatalogEntry {
  driveFileId: string;
  driveFileName: string;
  title: string;
  subtitle?: string;
  category: string;
  lifecycleStage: string;
  tags?: string[];
  summary?: string;
  concepts: { name: string; summary: string; keyPoints: string[] }[];
  quickHits: { question: string; answer: string }[];
  sourceText?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  // 1. Taxonomy
  for (const [order, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, color: c.color, order },
      create: { ...c, order },
    });
  }
  for (const [order, s] of LIFECYCLE_STAGES.entries()) {
    await prisma.lifecycleStage.upsert({
      where: { slug: s.slug },
      update: { name: s.name, order },
      create: { ...s, order },
    });
  }

  // 2. Default user
  const email = process.env.DEFAULT_USER_EMAIL ?? "owner@knowledge-map.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Owner" },
  });

  // 3. Prototype content migration
  const catalogPath = path.join(__dirname, "..", "data", "infographic-catalog.json");
  let entries: CatalogEntry[] = [];
  try {
    entries = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    console.warn("No data/infographic-catalog.json found — seeding taxonomy only.");
  }

  const categories = await prisma.category.findMany();
  const lifecycles = await prisma.lifecycleStage.findMany();
  const fallbackCategory = categories.find((c) => c.slug === "ml-foundations")!;

  let created = 0;
  for (const entry of entries) {
    if (!entry.title || entry.title === "UNKNOWN" || entry.concepts.length === 0) {
      console.warn(`Skipping uncataloged file ${entry.driveFileName}`);
      continue;
    }
    const slug = slugify(entry.title);
    if (await prisma.module.findUnique({ where: { slug } })) continue;

    const category =
      categories.find((c) => c.name === entry.category) ?? fallbackCategory;
    const lifecycle = lifecycles.find((l) => l.name === entry.lifecycleStage);

    // Drive-hosted for now (source: DRIVE); the preferred final state is
    // importing these into app storage — the asset row carries driveFileId
    // so an importer can rehost without touching modules.
    const asset = await prisma.infographicAsset.create({
      data: {
        source: "DRIVE",
        driveFileId: entry.driveFileId,
        originalUrl: `https://drive.google.com/thumbnail?id=${entry.driveFileId}&sz=w2000`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${entry.driveFileId}&sz=w640`,
        altText: entry.summary ?? entry.title,
      },
    });

    const source = await prisma.sourceMaterial.create({
      data: {
        concept: entry.title,
        details: entry.sourceText ?? null,
        notes: "Migrated from the InterviewPrepConsole prototype (Drive collection).",
        assetId: asset.id,
        publishedAt: new Date(),
      },
    });

    const module = await prisma.module.create({
      data: {
        slug,
        title: entry.title,
        subtitle: entry.subtitle ?? null,
        summary: entry.summary ?? null,
        tags: entry.tags ?? [],
        categoryId: category.id,
        lifecycleStageId: lifecycle?.id,
        assetId: asset.id,
        sourceMaterialId: source.id,
        concepts: {
          create: entry.concepts.map((c, order) => ({
            name: c.name,
            summary: c.summary,
            keyPoints: c.keyPoints ?? [],
            order,
          })),
        },
        quickHits: {
          create: (entry.quickHits ?? []).map((q, order) => ({
            question: q.question,
            answer: q.answer,
            order,
          })),
        },
      },
      include: { concepts: true, quickHits: true },
    });

    await prisma.reviewState.createMany({
      data: [
        ...module.concepts.map((c) => ({ userId: user.id, conceptId: c.id })),
        ...module.quickHits.map((q) => ({ userId: user.id, quickHitId: q.id })),
      ],
      skipDuplicates: true,
    });
    created++;
  }

  console.log(
    `Seed complete: ${CATEGORIES.length} categories, ${LIFECYCLE_STAGES.length} lifecycle stages, ${created} modules migrated (${entries.length} catalog entries).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
