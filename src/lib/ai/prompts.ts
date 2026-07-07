import { CATEGORY_NAMES, LIFECYCLE_NAMES } from "@/lib/constants";
import type { BriefContent } from "@/lib/ai/schemas";

const TAXONOMY = `Valid categories: ${CATEGORY_NAMES.join("; ")}.
Valid lifecycle stages: ${LIFECYCLE_NAMES.join("; ")}.
Always pick exactly one of each, verbatim.`;

export const SUGGESTIONS_SYSTEM = `You are the curriculum planner for a personal AI/ML/software-engineering interview-prep app built around visual infographics. You identify knowledge gaps and propose new infographic topics.
${TAXONOMY}
Suggestions must be concrete, interview-relevant, and non-overlapping with existing modules. Each "reason" should reference the signal that motivated it (weak performance, missing coverage, adjacent topic, or stated goal).`;

export function suggestionsUser(input: {
  publishedModules: { title: string; category: string; lifecycleStage: string }[];
  weakConcepts: string[];
  recentlyMissed: string[];
  overdueCategories: string[];
  coverage: { category: string; count: number }[];
  lifecycleCoverage: { stage: string; count: number }[];
  goals?: string;
  count: number;
}): string {
  return `Existing published modules:
${input.publishedModules.map((m) => `- ${m.title} [${m.category} / ${m.lifecycleStage}]`).join("\n") || "(none yet)"}

Weak concepts (low mastery): ${input.weakConcepts.join(", ") || "none"}
Recently missed concepts: ${input.recentlyMissed.join(", ") || "none"}
Categories with overdue reviews: ${input.overdueCategories.join(", ") || "none"}
Module count by category: ${input.coverage.map((c) => `${c.category}=${c.count}`).join(", ")}
Module count by lifecycle stage: ${input.lifecycleCoverage.map((c) => `${c.stage}=${c.count}`).join(", ")}
${input.goals ? `Study goals stated by the user: ${input.goals}` : ""}

Propose ${input.count} new infographic topics that would most improve interview readiness. Prioritize: (1) topics addressing weak/missed concepts, (2) underrepresented categories and lifecycle stages, (3) natural extensions of existing modules (e.g. if RAG architecture exists but not RAG evaluation).`;
}

export const BRIEF_SYSTEM = `You are an instructional designer creating briefs for technical infographics used in AI/ML/software engineering interview prep. A brief is the blueprint from which both the infographic image and the study content are produced, so it must be substantive and technically accurate.
${TAXONOMY}`;

export function briefUser(input: {
  title: string;
  reason?: string;
  recommendation?: string;
  category?: string;
  lifecycleStage?: string;
  notes?: string;
}): string {
  return `Create an infographic brief for: "${input.title}"
${input.reason ? `Why this matters: ${input.reason}` : ""}
${input.recommendation ? `Recommended contents: ${input.recommendation}` : ""}
${input.category ? `Category hint: ${input.category}` : ""}
${input.lifecycleStage ? `Lifecycle stage hint: ${input.lifecycleStage}` : ""}
${input.notes ? `User notes: ${input.notes}` : ""}

Include 4-7 main sections, 6-12 key terms, concrete examples, 5-8 common interview questions, a visual layout recommendation suited to a tall mobile-readable infographic, misconceptions to address, 4-6 suggested quick hits (short Q&A), and 4-8 suggested flashcard concepts.`;
}

export const IMAGE_PROMPT_SYSTEM = `You write image-generation prompts for GPT Image 2 that produce polished, dense-but-legible technical infographics for interview prep. Your prompts consistently produce clean editorial-quality results.`;

export function imagePromptUser(brief: BriefContent): string {
  return `Write a single GPT Image 2 prompt for a technical infographic based on this brief.

Title: ${brief.title}
Learning objective: ${brief.learningObjective}
Sections:
${brief.mainSections.map((s, i) => `${i + 1}. ${s.heading}: ${s.contents}`).join("\n")}
Key terms: ${brief.keyTerms.map((t) => t.term).join(", ")}
Visual layout recommendation: ${brief.visualLayout}
Misconceptions to address: ${brief.misconceptions.join("; ")}

The prompt must specify:
- the infographic title text
- overall layout structure and visual hierarchy (numbered sections, flow direction)
- every section with its label and 1-line contents
- style guidance (clean, modern, editorial technical infographic; consistent palette; generous spacing)
- icon/diagram suggestions per section
- text-density guidance: short labels and phrases only, no paragraphs
- mobile legibility: large readable type, high contrast, minimum ~14pt-equivalent labels
- explicit constraints: avoid clutter, avoid decorative complexity that adds no information, keep every label readable and correctly spelled, keep the infographic genuinely useful for interview prep
- portrait orientation suited to vertical scrolling on a phone

Return only the finished prompt text.`;
}

export const MODULE_SYSTEM = `You generate study modules for an interview-prep app from infographic source material. The source material (concept, infographic details, image prompt) is the source of truth — base all content on it, supplemented by accurate domain knowledge. Content must be interview-ready: precise, technical, and free of filler.
${TAXONOMY}`;

export function moduleUser(input: {
  concept: string;
  details?: string | null;
  imagePrompt?: string | null;
  notes?: string | null;
}): string {
  return `Source material:
Concept/title: ${input.concept}
${input.details ? `Infographic details:\n${input.details}` : ""}
${input.imagePrompt ? `Image-generation prompt used:\n${input.imagePrompt}` : ""}
${input.notes ? `Notes: ${input.notes}` : ""}

Generate a complete study module:
- title (clean, concise), subtitle, 2-3 sentence summary
- category and lifecycle stage (from the valid lists)
- 3-6 lowercase tags
- alt text describing the infographic for accessibility (1-2 sentences)
- 4-8 concepts, each with a 1-2 sentence summary and 2-4 key points
- 4-6 quick hits: short interview-style questions with strong 2-4 sentence answers
- 2-3 free-response interview questions, each with a grading rubric (3-5 criteria with descriptions, plus a strong-answer outline)`;
}

export const QUESTION_SYSTEM = `You write challenging free-response interview questions with grading rubrics for AI/ML/software engineering interview prep. Questions should be the kind a strong interviewer at a top company would ask.`;

export function questionUser(input: {
  moduleTitle: string;
  conceptName?: string;
  conceptSummary?: string;
  existingPrompts: string[];
}): string {
  return `Module: ${input.moduleTitle}
${input.conceptName ? `Focus concept: ${input.conceptName} — ${input.conceptSummary ?? ""}` : "Focus: the module as a whole"}
${input.existingPrompts.length ? `Avoid duplicating these existing questions:\n${input.existingPrompts.map((p) => `- ${p}`).join("\n")}` : ""}

Write one free-response interview question with a rubric (3-5 criteria with descriptions and a strong-answer outline).`;
}

export const GRADE_SYSTEM = `You grade free-response interview answers strictly against a rubric, like a rigorous but fair interviewer. Score 0-100. Verdict: "strong" (would pass this part of an interview), "partial" (some key points but notable gaps), "off_track" (misunderstands the question or is substantially wrong). Feedback must be specific and actionable. List concretely what was missed and provide an improved answer.`;

export function gradeUser(input: {
  question: string;
  rubric: unknown;
  answer: string;
}): string {
  return `Question: ${input.question}

Rubric: ${JSON.stringify(input.rubric)}

Candidate's answer:
${input.answer}

Grade this answer.`;
}

export const DEEP_DIVE_SYSTEM = `You are an expert tutor for AI/ML/software engineering interview prep. Explain concepts clearly and rigorously, grounded in the provided module and source material. Use short paragraphs and concrete examples; connect the explanation back to how it comes up in interviews. Format with markdown.`;

export function deepDiveUser(input: {
  moduleTitle: string;
  moduleSummary?: string | null;
  conceptName?: string;
  conceptSummary?: string;
  keyPoints?: string[];
  sourceDetails?: string | null;
  question: string;
}): string {
  return `Module: ${input.moduleTitle}
${input.moduleSummary ? `Module summary: ${input.moduleSummary}` : ""}
${input.conceptName ? `Concept: ${input.conceptName} — ${input.conceptSummary ?? ""}` : ""}
${input.keyPoints?.length ? `Key points: ${input.keyPoints.join("; ")}` : ""}
${input.sourceDetails ? `Source material details:\n${input.sourceDetails.slice(0, 3000)}` : ""}

User's question: ${input.question}`;
}
