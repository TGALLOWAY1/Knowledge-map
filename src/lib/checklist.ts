import type { GeneratedModule } from "@/lib/ai/schemas";
import { CATEGORY_NAMES } from "@/lib/constants";

// Publishing checklist for a study module draft. Pure so the draft editor can
// recompute it live on every edit and the publish endpoint can enforce the
// same rules server-side.

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
}

export function draftChecklist(content: GeneratedModule, hasImage: boolean): ChecklistItem[] {
  const concepts = content.concepts ?? [];
  const quickHits = content.quickHits ?? [];
  const questions = content.questions ?? [];
  return [
    { key: "image", label: "Image attached", ok: hasImage, required: true },
    {
      key: "metadata",
      label: "Metadata complete",
      ok:
        Boolean(content.title?.trim()) &&
        (CATEGORY_NAMES as readonly string[]).includes(content.category) &&
        Boolean(content.lifecycleStage?.trim()),
      required: true,
    },
    {
      key: "concepts",
      label:
        concepts.length > 0 ? `${concepts.length} concepts generated` : "Concepts generated",
      ok: concepts.length > 0 && concepts.every((c) => c.name.trim() && c.summary.trim()),
      required: true,
    },
    {
      key: "quickHits",
      label:
        quickHits.length > 0 ? `${quickHits.length} quick hits reviewed` : "Quick hits added",
      ok: quickHits.length > 0 && quickHits.every((q) => q.question.trim() && q.answer.trim()),
      required: true,
    },
    {
      key: "questions",
      label:
        questions.length > 0
          ? `${questions.length} interview questions reviewed`
          : "Interview questions added",
      ok: questions.length > 0,
      required: false,
    },
    {
      key: "altText",
      label: "Alt text added",
      ok: Boolean(content.altText?.trim()),
      required: true,
    },
  ];
}

export function checklistReady(items: ChecklistItem[]): boolean {
  return items.every((item) => item.ok || !item.required);
}

export function failingRequired(items: ChecklistItem[]): string[] {
  return items.filter((item) => item.required && !item.ok).map((item) => item.label);
}
