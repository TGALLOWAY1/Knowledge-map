import type { BriefContent } from "@/lib/ai/schemas";

// Deterministic image-prompt template assembled from the brief. Used as a
// fallback when the AI service is not configured — the UI labels the result
// as template-based so no AI involvement is implied.

export function buildImagePromptTemplate(brief: BriefContent): string {
  const sections = brief.mainSections
    .map((s, i) => `${i + 1}. ${s.heading}${s.contents ? ` — ${s.contents}` : ""}`)
    .join("\n");
  const terms = brief.keyTerms.map((t) => t.term).join(", ");

  const parts = [
    `Create a high-resolution technical infographic titled "${brief.title}".`,
    brief.learningObjective && `Goal of the infographic: ${brief.learningObjective}`,
    `Design the infographic as ${brief.mainSections.length} sections stacked top to bottom. Each section should have an icon or small diagram on the left, key points in the center (short bulleted phrases), and a one-line explanation on the right.\n\nSections (in order):\n${sections}`,
    terms && `Key terms to feature prominently: ${terms}.`,
    brief.visualLayout && `Layout guidance: ${brief.visualLayout}`,
    brief.misconceptions.length > 0 &&
      `Include a small callout box addressing these misconceptions: ${brief.misconceptions.join("; ")}.`,
    [
      "Style: clean, modern, editorial technical infographic.",
      "Use a consistent professional color palette with a distinct color per section.",
      "Generous spacing and a clear visual hierarchy with numbered section headings.",
      "Short labels and phrases only — no paragraphs of text.",
      "Large, readable, high-contrast type (minimum ~14pt-equivalent labels).",
      "Avoid clutter and decorative complexity that adds no information.",
      "Every label must be readable and correctly spelled.",
      "Portrait orientation suited to vertical scrolling on a phone.",
    ].join(" "),
  ];

  return parts.filter(Boolean).join("\n\n");
}
