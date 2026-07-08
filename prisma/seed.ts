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

  // 4. Sample studio pipeline data: suggested gaps + one draft brief, so the
  //    Studio board and brief editor demo the full workflow without an AI key.
  //    Idempotent: matched by title.
  const SAMPLE_GAPS = [
    {
      title: "RAG Evaluation",
      reason: "You have RAG architecture and embeddings content, but no dedicated evaluation module.",
      recommendation:
        "A metrics-focused infographic covering retrieval quality, generation quality, and end-to-end evaluation.",
      sourceSignal: "Coverage gap: LLMs & Gen AI has no Evaluation-stage module.",
      priority: "HIGH" as const,
      category: "LLMs & Generative AI",
      lifecycleStage: "Evaluation",
    },
    {
      title: "Docker vs Containers Deep Dive",
      reason: "You have basic Docker content, but interviews often go deeper on namespaces, cgroups, and layering.",
      recommendation: "A layered diagram from kernel primitives up to Docker tooling.",
      sourceSignal: "Weak quiz performance on containerization cards.",
      priority: "MEDIUM" as const,
      category: "Software Engineering",
      lifecycleStage: "Deployment",
    },
    {
      title: "Experimentation & A/B Testing",
      reason: "Important across ML and product teams. You have stats basics but not full experimentation.",
      recommendation: "Experiment design, power analysis, common pitfalls, and sequential testing.",
      sourceSignal: "Coverage gap: Statistics & Experimentation is underrepresented.",
      priority: "MEDIUM" as const,
      category: "Statistics & Experimentation",
      lifecycleStage: "Evaluation",
    },
    {
      title: "ML System Security",
      reason: "Security comes up in system design and production ML interviews.",
      recommendation: "Threat model: data poisoning, prompt injection, model extraction, and defenses.",
      sourceSignal: "Adjacent topic to your AI Systems & Engineering modules.",
      priority: "LOW" as const,
      category: "AI Systems & Engineering",
      lifecycleStage: "Deployment",
    },
  ];
  for (const gap of SAMPLE_GAPS) {
    const exists = await prisma.conceptGap.findFirst({ where: { title: gap.title } });
    if (exists) continue;
    await prisma.conceptGap.create({
      data: {
        title: gap.title,
        reason: gap.reason,
        recommendation: gap.recommendation,
        sourceSignal: gap.sourceSignal,
        priority: gap.priority,
        status: "SUGGESTED",
        category: { connect: { slug: slugify(gap.category) } },
        lifecycleStage: { connect: { slug: slugify(gap.lifecycleStage) } },
      },
    });
  }

  const briefTitle = "RAG Evaluation Infographic";
  const briefExists = await prisma.infographicBrief.findFirst({ where: { title: briefTitle } });
  if (!briefExists) {
    await prisma.infographicBrief.create({
      data: {
        title: briefTitle,
        learningObjective:
          "Understand how to evaluate both retrieval quality and generation quality in a Retrieval-Augmented Generation system using automated metrics and human evaluation.",
        audienceLevel: "Intermediate → Advanced",
        tags: ["RAG", "Evaluation", "Metrics"],
        stage: "DRAFT",
        category: { connect: { slug: "llms-generative-ai" } },
        lifecycleStage: { connect: { slug: "evaluation" } },
        content: {
          title: briefTitle,
          learningObjective:
            "Understand how to evaluate both retrieval quality and generation quality in a Retrieval-Augmented Generation system using automated metrics and human evaluation.",
          audienceLevel: "Intermediate → Advanced",
          category: "LLMs & Generative AI",
          lifecycleStage: "Evaluation",
          tags: ["RAG", "Evaluation", "Metrics"],
          mainSections: [
            { heading: "Retrieval Quality", contents: "Hit rate, Recall@K, MRR, nDCG" },
            { heading: "Generation Quality", contents: "Answer faithfulness, groundedness, relevance" },
            { heading: "End-to-End Evaluation", contents: "Context recall + answer correctness" },
            { heading: "Human Evaluation", contents: "Helpfulness, correctness, completeness" },
            { heading: "Latency & Cost", contents: "Response time, tokens, cost per query" },
            { heading: "Failure Modes", contents: "Hallucination, irrelevant context, outdated info" },
          ],
          keyTerms: [
            { term: "Retrieval", definition: "Finding the most relevant context for a query." },
            { term: "Faithfulness", definition: "Whether the answer is supported by the retrieved context." },
            { term: "Groundedness", definition: "How firmly claims are anchored in source material." },
            { term: "nDCG", definition: "Rank-aware retrieval quality metric." },
            { term: "Recall@K", definition: "Share of relevant documents in the top K results." },
            { term: "MRR", definition: "Mean reciprocal rank of the first relevant result." },
            { term: "Hallucination", definition: "Generated claims unsupported by any source." },
            { term: "Relevance", definition: "How well the answer addresses the user's intent." },
          ],
          examples: [
            "Offline eval harness comparing retriever configurations on a golden set",
            "LLM-as-judge scoring faithfulness of generated answers",
          ],
          interviewQuestions: [
            "How would you evaluate the quality of a RAG system?",
            "What metrics would you use for the retrieval component?",
            "How do you measure hallucination in RAG?",
            "How would you run an offline eval for a RAG system?",
          ],
          visualLayout:
            "Use a clean, sectioned layout with 6 horizontal blocks. Each block should have an icon on the left, key metrics in the middle, and a short explanation on the right. Use a modern tech style with clear typography and color coding by section.",
          misconceptions: [
            "High retrieval recall alone guarantees good answers",
            "Automated metrics fully replace human evaluation",
          ],
          suggestedQuickHits: [
            {
              question: "What does Recall@K measure in RAG?",
              answer: "The fraction of relevant documents that appear in the top K retrieved results.",
            },
          ],
          suggestedConcepts: ["Retrieval Quality", "Generation Quality", "Human Evaluation"],
          notes: "Focus on practical metrics that are used in real world systems. Keep it interview-friendly.",
        },
      },
    });
  }

  console.log(
    `Seed complete: ${CATEGORIES.length} categories, ${LIFECYCLE_STAGES.length} lifecycle stages, ${created} modules migrated (${entries.length} catalog entries), ${SAMPLE_GAPS.length} sample gaps + 1 sample brief ensured.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
