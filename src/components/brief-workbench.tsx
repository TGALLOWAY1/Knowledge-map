"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Card, Badge, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { Breadcrumbs } from "@/components/page-header";
import { ProgressStepper } from "@/components/stepper";
import { ChipEditor } from "@/components/chip-editor";
import { ImageUpload, type UploadedAsset } from "@/components/upload";
import { relativeTime, formatDate, wordCount } from "@/lib/format";
import { CATEGORY_NAMES, LIFECYCLE_NAMES } from "@/lib/constants";
import {
  Copy,
  Check,
  Loader2,
  Wand2,
  RefreshCw,
  Archive,
  Save,
  Sparkles,
  Lightbulb,
  ChevronDown,
  Plus,
  X,
  CloudUpload,
} from "lucide-react";
import type { BriefContent } from "@/lib/ai/schemas";

interface BriefData {
  id: string;
  title: string;
  stage: string;
  categoryName: string | null;
  lifecycleName: string | null;
  gapPriority: "LOW" | "MEDIUM" | "HIGH" | null;
  content: BriefContent;
  prompts: { id: string; version: number; promptText: string; createdAt: string }[];
  draftId: string | null;
  asset: { id: string; originalUrl: string; thumbnailUrl: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const STEPS = ["Brief", "Image Prompt", "Awaiting Image", "Review & Publish"];

const STAGE_BADGES: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "amber" },
  AWAITING_IMAGE: { label: "Awaiting Image", color: "sky" },
  IMAGE_ATTACHED: { label: "Image Attached", color: "emerald" },
  ARCHIVED: { label: "Archived", color: "zinc" },
};

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-1.5 text-sm font-semibold">
        <span className="text-violet-600 dark:text-violet-400">{n}.</span> {title}
        {hint && <span className="text-xs font-normal text-zinc-400">({hint})</span>}
      </h3>
      {children}
    </section>
  );
}

export function BriefWorkbench({ brief }: { brief: BriefData }) {
  const router = useRouter();
  const [content, setContent] = useState<BriefContent>(brief.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date(brief.updatedAt));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [asset, setAsset] = useState<UploadedAsset | null>(brief.asset);
  const [promptSource, setPromptSource] = useState<string | null>(null);

  const latestPrompt = brief.prompts[0];
  const [promptDraft, setPromptDraft] = useState(latestPrompt?.promptText ?? "");
  const promptEdited = latestPrompt ? promptDraft !== latestPrompt.promptText : false;

  const contentRef = useRef(content);
  contentRef.current = content;

  // Sync the editable prompt when a new version arrives from the server.
  const latestPromptId = latestPrompt?.id;
  const latestPromptText = latestPrompt?.promptText;
  useEffect(() => {
    setPromptDraft(latestPromptText ?? "");
  }, [latestPromptId, latestPromptText]);

  const update = <K extends keyof BriefContent>(key: K, value: BriefContent[K]) => {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };

  const persist = async () => {
    const body = { title: contentRef.current.title, content: contentRef.current };
    const res = await fetch(`/api/briefs/${brief.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    setDirty(false);
    setLastSavedAt(new Date());
  };

  // Autosave: debounce edits, persist quietly in the background.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await persist();
      } catch {
        // Keep dirty; the manual Save button surfaces errors.
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dirty]);

  const save = async () => {
    setBusy("save");
    setSaving(true);
    setError(null);
    try {
      await persist();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
      setBusy(null);
    }
  };

  const generatePrompt = async (manualText?: string) => {
    setBusy("prompt");
    setError(null);
    try {
      if (dirty) await persist();
      const res = await fetch(`/api/briefs/${brief.id}/image-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualText ? { promptText: manualText } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPromptSource(data.generated ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prompt generation failed");
    } finally {
      setBusy(null);
    }
  };

  const attachImage = async (uploaded: UploadedAsset) => {
    setAsset(uploaded);
    setBusy("attach");
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${brief.id}/attach-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: uploaded.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/studio/drafts/${data.draft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attach image");
      setBusy(null);
    }
  };

  const archive = async () => {
    setBusy("archive");
    await fetch(`/api/briefs/${brief.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "ARCHIVED" }),
    });
    router.push("/studio?tab=briefs");
  };

  const copyPrompt = async () => {
    if (!promptDraft) return;
    await navigator.clipboard.writeText(promptDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const stageBadge = STAGE_BADGES[brief.stage] ?? STAGE_BADGES.DRAFT;
  const activeStep =
    brief.stage === "IMAGE_ATTACHED"
      ? 3
      : brief.stage === "AWAITING_IMAGE"
        ? 2
        : latestPrompt
          ? 1
          : 0;
  const nextStep =
    brief.stage === "IMAGE_ATTACHED"
      ? "Review & publish the module draft"
      : latestPrompt
        ? "Create the infographic with your image tool, then upload it"
        : "Generate the image prompt";

  const listEditor = (
    label: string,
    key: "examples" | "misconceptions" | "suggestedConcepts",
  ) => (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <textarea
        value={content[key].join("\n")}
        onChange={(e) => update(key, e.target.value.split("\n"))}
        onBlur={(e) =>
          update(
            key,
            e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
          )
        }
        className={textareaClass}
        rows={Math.max(3, content[key].length + 1)}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Breadcrumbs
            items={[
              { label: "Infographic Studio", href: "/studio" },
              { label: "Draft Briefs", href: "/studio?tab=briefs" },
              { label: brief.title },
            ]}
          />
          <Badge color={stageBadge.color}>{stageBadge.label}</Badge>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {content.title || brief.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{content.learningObjective}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : dirty ? (
                "Unsaved changes"
              ) : lastSavedAt ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Autosaved{" "}
                  {relativeTime(lastSavedAt)}
                </>
              ) : null}
            </span>
            <button
              onClick={save}
              disabled={!dirty || busy !== null}
              className={buttonClass("secondary", "md")}
            >
              <Save className="h-4 w-4" /> Save Brief
            </button>
            <button
              onClick={() => generatePrompt()}
              disabled={busy !== null}
              className={buttonClass("primary", "md")}
            >
              {busy === "prompt" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : latestPrompt ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {latestPrompt ? "Regenerate Image Prompt" : "Generate Image Prompt"}
            </button>
          </div>
        </div>
      </header>

      <Card className="px-4 py-3">
        <ProgressStepper steps={STEPS} activeIndex={activeStep} />
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Left: brief editor */}
        <div className="space-y-4">
          <Card className="space-y-5 px-5 py-5">
            <Section n={1} title="Core Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Concept / Title
                  </label>
                  <input
                    value={content.title}
                    onChange={(e) => update("title", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                  <select
                    value={content.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={inputClass}
                  >
                    {!CATEGORY_NAMES.includes(
                      content.category as (typeof CATEGORY_NAMES)[number],
                    ) && <option value={content.category}>{content.category || "—"}</option>}
                    {CATEGORY_NAMES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Lifecycle Stage
                  </label>
                  <select
                    value={content.lifecycleStage}
                    onChange={(e) => update("lifecycleStage", e.target.value)}
                    className={inputClass}
                  >
                    {!LIFECYCLE_NAMES.includes(
                      content.lifecycleStage as (typeof LIFECYCLE_NAMES)[number],
                    ) && (
                      <option value={content.lifecycleStage}>
                        {content.lifecycleStage || "—"}
                      </option>
                    )}
                    {LIFECYCLE_NAMES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Audience Level
                  </label>
                  <input
                    value={content.audienceLevel}
                    onChange={(e) => update("audienceLevel", e.target.value)}
                    placeholder="e.g. Intermediate → Advanced"
                    className={inputClass}
                  />
                </div>
                {brief.gapPriority && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Priority <span className="text-zinc-400">(from source gap)</span>
                    </label>
                    <Badge
                      color={
                        brief.gapPriority === "HIGH"
                          ? "red"
                          : brief.gapPriority === "MEDIUM"
                            ? "amber"
                            : "zinc"
                      }
                      className="mt-1.5"
                    >
                      {brief.gapPriority.charAt(0) + brief.gapPriority.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                )}
              </div>
            </Section>

            <Section n={2} title="Learning Objective">
              <textarea
                value={content.learningObjective}
                onChange={(e) => update("learningObjective", e.target.value)}
                className={textareaClass}
                rows={2}
              />
            </Section>

            <Section n={3} title="Key Sections" hint="what the infographic should include">
              <div className="space-y-2">
                {content.mainSections.map((s, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-lg border border-black/5 p-2.5 dark:border-white/10"
                  >
                    <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        value={s.heading}
                        onChange={(e) => {
                          const next = [...content.mainSections];
                          next[i] = { ...next[i], heading: e.target.value };
                          update("mainSections", next);
                        }}
                        className={inputClass}
                        placeholder="Section heading"
                      />
                      <textarea
                        value={s.contents}
                        onChange={(e) => {
                          const next = [...content.mainSections];
                          next[i] = { ...next[i], contents: e.target.value };
                          update("mainSections", next);
                        }}
                        className={textareaClass}
                        rows={2}
                        placeholder="What this section covers"
                      />
                    </div>
                    <button
                      onClick={() =>
                        update(
                          "mainSections",
                          content.mainSections.filter((_, j) => j !== i),
                        )
                      }
                      className="mt-2 h-6 w-6 shrink-0 rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                      aria-label={`Remove section ${i + 1}`}
                    >
                      <X className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update("mainSections", [
                      ...content.mainSections,
                      { heading: "", contents: "" },
                    ])
                  }
                  className={clsx(buttonClass("secondary", "sm"), "w-full border-dashed")}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Section
                </button>
              </div>
            </Section>

            <Section n={4} title="Key Terms">
              <ChipEditor
                values={content.keyTerms.map((t) => t.term)}
                onChange={(terms) =>
                  update(
                    "keyTerms",
                    terms.map(
                      (term) =>
                        content.keyTerms.find((t) => t.term === term) ?? {
                          term,
                          definition: "",
                        },
                    ),
                  )
                }
                placeholder="Add term"
              />
              {content.keyTerms.some((t) => t.definition) && (
                <details className="group mt-1">
                  <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    View definitions
                  </summary>
                  <dl className="mt-2 space-y-1 text-xs">
                    {content.keyTerms
                      .filter((t) => t.definition)
                      .map((t) => (
                        <div key={t.term} className="flex gap-2">
                          <dt className="shrink-0 font-semibold">{t.term}:</dt>
                          <dd className="text-zinc-600 dark:text-zinc-400">{t.definition}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
              )}
            </Section>

            <Section n={5} title="Common Interview Questions">
              <div className="space-y-1.5">
                {content.interviewQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    <input
                      value={q}
                      onChange={(e) => {
                        const next = [...content.interviewQuestions];
                        next[i] = e.target.value;
                        update("interviewQuestions", next);
                      }}
                      className={inputClass}
                    />
                    <button
                      onClick={() =>
                        update(
                          "interviewQuestions",
                          content.interviewQuestions.filter((_, j) => j !== i),
                        )
                      }
                      className="h-6 w-6 shrink-0 rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                      aria-label="Remove question"
                    >
                      <X className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update("interviewQuestions", [...content.interviewQuestions, ""])
                  }
                  className={buttonClass("ghost", "sm")}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </button>
              </div>
            </Section>

            <Section n={6} title="Visual & Layout Guidance">
              <textarea
                value={content.visualLayout}
                onChange={(e) => update("visualLayout", e.target.value)}
                className={textareaClass}
                rows={3}
              />
            </Section>

            <Section n={7} title="Notes / Additional Context" hint="optional">
              <textarea
                value={content.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                className={textareaClass}
                rows={2}
                placeholder="Anything else the infographic or study content should account for."
              />
            </Section>

            <details className="group border-t border-black/5 pt-3 dark:border-white/10">
              <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                More brief fields
              </summary>
              <div className="mt-3 space-y-4">
                {listEditor("Examples", "examples")}
                {listEditor("Misconceptions to address", "misconceptions")}
                {listEditor("Suggested flashcard concepts", "suggestedConcepts")}
              </div>
            </details>
          </Card>

          {/* Footer metadata */}
          <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Created</p>
              <p className="text-sm font-medium">{formatDate(brief.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Last edited</p>
              <p className="text-sm font-medium">
                {lastSavedAt ? relativeTime(lastSavedAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Status</p>
              <Badge color={stageBadge.color}>{stageBadge.label}</Badge>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">Next step</p>
              <p className="text-sm font-medium">{nextStep}</p>
            </div>
            <button
              onClick={archive}
              disabled={busy !== null}
              className={clsx(buttonClass("danger", "sm"), "ml-auto")}
            >
              <Archive className="h-3.5 w-3.5" /> Archive Brief
            </button>
          </Card>
        </div>

        {/* Right: AI image prompt panel */}
        <div className="space-y-4">
          <Card className="space-y-3 px-5 py-5 xl:sticky xl:top-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-semibold">
                AI Image Prompt{" "}
                {latestPrompt && (
                  <span className="font-normal text-zinc-400">(v{latestPrompt.version})</span>
                )}
              </h3>
            </div>

            <details className="group rounded-lg border border-black/5 dark:border-white/10">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Prompt Tips & Best Practices
                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-1 px-3 pb-3 text-xs text-zinc-600 dark:text-zinc-400">
                <li>· Keep section labels short — image models garble long sentences.</li>
                <li>· Name an explicit layout (stacked sections, grid) and orientation.</li>
                <li>· Ask for high-contrast, large type; small text tends to render illegibly.</li>
                <li>· Regenerate after meaningful brief edits so the prompt stays in sync.</li>
              </ul>
            </details>

            {latestPrompt ? (
              <>
                {promptSource === "template" && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    Built from the brief with the local template (AI is not configured).
                  </p>
                )}
                <textarea
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  className={clsx(textareaClass, "min-h-72 font-mono text-xs leading-relaxed")}
                  spellCheck={false}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs tabular-nums text-zinc-400">
                    ~ {wordCount(promptDraft)} words
                  </span>
                  <div className="flex gap-2">
                    {promptEdited && (
                      <button
                        onClick={() => generatePrompt(promptDraft)}
                        disabled={busy !== null}
                        className={buttonClass("secondary", "sm")}
                      >
                        <Save className="h-3.5 w-3.5" /> Save Edited Prompt
                      </button>
                    )}
                    <button
                      onClick={() => generatePrompt()}
                      disabled={busy !== null}
                      className={buttonClass("secondary", "sm")}
                    >
                      {busy === "prompt" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>
                <button
                  onClick={copyPrompt}
                  className={clsx(buttonClass("primary", "md"), "w-full")}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Prompt to Clipboard"}
                </button>
              </>
            ) : (
              <p className="rounded-lg bg-black/3 px-3 py-4 text-sm text-zinc-500 dark:bg-white/5">
                Generate the image prompt once the brief looks right. You&apos;ll copy it into
                your image tool, create the infographic, then upload the result below.
              </p>
            )}

            <div className="space-y-2 border-t border-black/5 pt-3 dark:border-white/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <CloudUpload className="h-3.5 w-3.5" />
                After generating your infographic
              </p>
              <p className="text-xs text-zinc-500">
                Use your preferred image tool to create the infographic with this prompt, then
                upload it here to generate the study module.
              </p>
              {busy === "attach" ? (
                <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating study module draft from source material…
                </div>
              ) : (
                <ImageUpload
                  onUploaded={attachImage}
                  current={asset}
                  label="Upload final infographic"
                />
              )}
              {brief.draftId && (
                <Link
                  href={`/studio/drafts/${brief.draftId}`}
                  className={buttonClass("secondary", "sm")}
                >
                  Open module draft →
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
