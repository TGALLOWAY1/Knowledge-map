// Canonical taxonomy. Seeded into the database; slugs are stable identifiers.

export const CATEGORIES = [
  { slug: "ai-systems-engineering", name: "AI Systems & Engineering", color: "violet" },
  { slug: "llms-generative-ai", name: "LLMs & Generative AI", color: "fuchsia" },
  { slug: "ml-foundations", name: "ML Foundations", color: "sky" },
  { slug: "software-engineering", name: "Software Engineering", color: "emerald" },
  { slug: "frameworks-tooling", name: "Frameworks & Tooling", color: "amber" },
  { slug: "statistics-experimentation", name: "Statistics & Experimentation", color: "rose" },
  { slug: "tools-productivity", name: "Tools & Productivity", color: "cyan" },
] as const;

export const LIFECYCLE_STAGES = [
  { slug: "problem-framing", name: "Problem Framing" },
  { slug: "data-features", name: "Data & Features" },
  { slug: "modeling", name: "Modeling" },
  { slug: "evaluation", name: "Evaluation" },
  { slug: "deployment", name: "Deployment" },
  { slug: "monitoring", name: "Monitoring" },
  { slug: "systems-design", name: "Systems Design" },
  { slug: "interview-practice", name: "Interview Practice" },
] as const;

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
export const LIFECYCLE_NAMES = LIFECYCLE_STAGES.map((s) => s.name);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
