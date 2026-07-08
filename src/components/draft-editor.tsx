"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Card, Badge, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { Breadcrumbs } from "@/components/page-header";
import { ProgressStepper } from "@/components/stepper";
import { SmartImage } from "@/components/smart-image";
import { ChipEditor } from "@/components/chip-editor";
import { ImageUpload, type UploadedAsset } from "@/components/upload";
import { CATEGORY_NAMES, LIFECYCLE_NAMES } from "@/lib/constants";
import { draftChecklist, checklistReady } from "@/lib/checklist";
import { relativeTime, formatDate, estReviewMinutes } from "@/lib/format";
import {
  Loader2,
  Rocket,
  RefreshCw,
  Archive,
  Save,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileText,
  Zap,
  MessageSquare,
  Clock,
  Info,
  Plus,
  X,
  PencilLine,
} from "lucide-react";
import type { GeneratedModule } from "@/lib/ai/schemas";

interface DraftData {
  id: string;
  status: string;
  generationVersion: number;
  content: GeneratedModule;
  moduleSlug: string | null;
  briefId: string | null;
  sourceConcept: string;
  hasImagePrompt: boolean;
  sourceCreatedAt: string;
  updatedAt: string;
  asset: { id: string; originalUrl: string; thumbnailUrl: string | null } | null;
}

const STEPS = ["Brief", "Image Prompt", "Awaiting Image", "Review & Publish"];

// Review & Publish screen: everything is editable before publish; the
// checklist gates the Publish action (mirrored server-side in publishDraft).
export function DraftEditor({ draft }: { draft: DraftData }) {
  const router = useRouter();
  const [content, setContent] = useState<GeneratedModule>(draft.content);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date(draft.updatedAt));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<UploadedAsset | null>(draft.asset);

  const contentRef = useRef(content);
  contentRef.current = content;

  const update = <K extends keyof GeneratedModule>(key: K, value: GeneratedModule[K]) => {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };

  const persist = async () => {
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentRef.current }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    setDirty(false);
    setLastSavedAt(new Date());
  };

  useEffect(() => {
    if (!dirty || draft.status === "PUBLISHED") return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await persist();
      } catch {
        // Keep dirty; manual Save surfaces the error.
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dirty, draft.status]);

  const save = async (): Promise<boolean> => {
    setBusy("save");
    setSaving(true);
    setError(null);
    try {
      await persist();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
      setBusy(null);
    }
  };

  const publish = async () => {
    if (dirty && !(await save())) return;
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/library/${data.module.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setBusy("regen");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.draft.content);
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setBusy(null);
    }
  };

  const archive = async () => {
    setBusy("archive");
    await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    router.push("/studio?tab=review");
  };

  const isPublished = draft.status === "PUBLISHED";
  const checklist = draftChecklist(content, !!asset);
  const ready = checklistReady(checklist);
  const cardCount = content.concepts.length + content.quickHits.length;

  const summaryTiles = [
    { icon: FileText, label: "Concepts", value: content.concepts.length },
    { icon: Zap, label: "Quick Hits", value: content.quickHits.length },
    { icon: MessageSquare, label: "Questions", value: content.questions.length },
    { icon: Clock, label: "Est. Review Time", value: `${estReviewMinutes(cardCount)} min` },
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Breadcrumbs
            items={[
              { label: "Infographic Studio", href: "/studio" },
              { label: "Needs Review", href: "/studio?tab=review" },
              { label: content.title || draft.sourceConcept },
            ]}
          />
          <Badge color={isPublished ? "green" : "amber"}>
            {isPublished ? "Published" : "Needs Review"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Review &amp; Publish Module</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review the generated study content before publishing it to your library.
            </p>
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
            {!isPublished && (
              <button
                onClick={save}
                disabled={!dirty || busy !== null}
                className={buttonClass("secondary", "md")}
              >
                <Save className="h-4 w-4" /> Save Draft
              </button>
            )}
            {isPublished && draft.moduleSlug && (
              <Link href={`/library/${draft.moduleSlug}`} className={buttonClass("primary", "md")}>
                View published module →
              </Link>
            )}
          </div>
        </div>
      </header>

      <Card className="px-4 py-3">
        <ProgressStepper steps={STEPS} activeIndex={3} />
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* Left column: infographic + source material */}
        <div className="order-2 space-y-4 xl:order-1">
          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">Final Infographic</p>
            {asset ? (
              <SmartImage
                src={asset.thumbnailUrl ?? asset.originalUrl}
                alt={content.altText}
                className="w-full rounded-lg border border-black/5 object-contain dark:border-white/10"
                fallbackClassName="h-40 w-full rounded-lg"
                fallbackLabel="Image attached but couldn't be loaded — check sharing or replace it"
              />
            ) : (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                No image attached yet — upload the final infographic below.
              </p>
            )}
            {asset && (
              <a
                href={asset.originalUrl}
                target="_blank"
                rel="noreferrer"
                className={clsx(buttonClass("secondary", "sm"), "w-full")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Size
              </a>
            )}
            {!isPublished && (
              <ImageUpload
                onUploaded={async (uploaded) => {
                  setAsset(uploaded);
                  // Replace the image on the source material before publish.
                  await fetch(`/api/drafts/${draft.id}/replace-image`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assetId: uploaded.id }),
                  });
                }}
                current={asset}
                label={asset ? "Replace Image" : "Upload infographic image"}
              />
            )}
          </Card>

          <Card className="space-y-2.5 px-4 py-4">
            <p className="text-sm font-semibold">Source Material</p>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-zinc-400">Concept</dt>
                <dd className="font-medium">{draft.sourceConcept}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Category</dt>
                <dd>
                  <Badge color="violet">{content.category}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Lifecycle</dt>
                <dd>
                  <Badge>{content.lifecycleStage}</Badge>
                </dd>
              </div>
              {draft.briefId && (
                <div>
                  <dt className="text-zinc-400">Source brief</dt>
                  <dd>
                    <Link
                      href={`/studio/briefs/${draft.briefId}`}
                      className="inline-flex items-center gap-1 font-medium text-violet-600 hover:underline dark:text-violet-300"
                    >
                      Open brief <ExternalLink className="h-3 w-3" />
                    </Link>
                  </dd>
                </div>
              )}
              {draft.hasImagePrompt && draft.briefId && (
                <div>
                  <dt className="text-zinc-400">Image prompt</dt>
                  <dd>
                    <Link
                      href={`/studio/briefs/${draft.briefId}`}
                      className="inline-flex items-center gap-1 font-medium text-violet-600 hover:underline dark:text-violet-300"
                    >
                      View prompt <ExternalLink className="h-3 w-3" />
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-zinc-400">Created</dt>
                <dd className="font-medium">{formatDate(draft.sourceCreatedAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Generation</dt>
                <dd className="font-medium">v{draft.generationVersion}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Main column: editable content */}
        <div className="order-1 space-y-4 xl:order-2">
          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">Module Metadata</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
                <input
                  value={content.title}
                  onChange={(e) => update("title", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Subtitle</label>
                <input
                  value={content.subtitle}
                  onChange={(e) => update("subtitle", e.target.value)}
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
                  {CATEGORY_NAMES.map((c) => (
                    <option key={c}>{c}</option>
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
                  {LIFECYCLE_NAMES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Summary</label>
              <textarea
                value={content.summary}
                onChange={(e) => update("summary", e.target.value)}
                className={textareaClass}
                rows={2}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Tags</label>
              <ChipEditor
                values={content.tags}
                onChange={(tags) => update("tags", tags)}
                placeholder="Add tag"
              />
            </div>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">
              Concepts <span className="font-normal text-zinc-400">({content.concepts.length})</span>
            </p>
            {content.concepts.map((c, i) => (
              <details
                key={i}
                className="group rounded-lg border border-black/5 dark:border-white/10"
              >
                <summary className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-300">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {c.name || "Untitled concept"}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">{c.summary}</span>
                  </span>
                  <PencilLine className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                </summary>
                <div className="space-y-1.5 border-t border-black/5 px-3 py-2.5 dark:border-white/10">
                  <input
                    value={c.name}
                    onChange={(e) => {
                      const next = [...content.concepts];
                      next[i] = { ...next[i], name: e.target.value };
                      update("concepts", next);
                    }}
                    className={inputClass}
                    placeholder="Concept name"
                  />
                  <textarea
                    value={c.summary}
                    onChange={(e) => {
                      const next = [...content.concepts];
                      next[i] = { ...next[i], summary: e.target.value };
                      update("concepts", next);
                    }}
                    className={textareaClass}
                    rows={2}
                    placeholder="Short description"
                  />
                  <textarea
                    value={c.keyPoints.join("\n")}
                    onChange={(e) => {
                      const next = [...content.concepts];
                      next[i] = { ...next[i], keyPoints: e.target.value.split("\n") };
                      update("concepts", next);
                    }}
                    onBlur={(e) => {
                      const next = [...content.concepts];
                      next[i] = {
                        ...next[i],
                        keyPoints: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      };
                      update("concepts", next);
                    }}
                    className={textareaClass}
                    rows={3}
                    placeholder="Key points, one per line"
                  />
                  <button
                    onClick={() => update("concepts", content.concepts.filter((_, j) => j !== i))}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
                  >
                    <X className="h-3 w-3" /> Remove concept
                  </button>
                </div>
              </details>
            ))}
            <button
              onClick={() =>
                update("concepts", [
                  ...content.concepts,
                  { name: "New concept", summary: "", keyPoints: [] },
                ])
              }
              className={buttonClass("secondary", "sm")}
            >
              <Plus className="h-3.5 w-3.5" /> Add concept
            </button>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">
              Quick Hits <span className="font-normal text-zinc-400">({content.quickHits.length})</span>
            </p>
            {content.quickHits.map((q, i) => (
              <div key={i} className="space-y-1.5 rounded-lg bg-black/3 p-2.5 dark:bg-white/5">
                <input
                  value={q.question}
                  onChange={(e) => {
                    const next = [...content.quickHits];
                    next[i] = { ...next[i], question: e.target.value };
                    update("quickHits", next);
                  }}
                  className={inputClass}
                  placeholder="Question"
                />
                <textarea
                  value={q.answer}
                  onChange={(e) => {
                    const next = [...content.quickHits];
                    next[i] = { ...next[i], answer: e.target.value };
                    update("quickHits", next);
                  }}
                  className={textareaClass}
                  rows={2}
                  placeholder="Answer"
                />
                <button
                  onClick={() => update("quickHits", content.quickHits.filter((_, j) => j !== i))}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                update("quickHits", [...content.quickHits, { question: "", answer: "" }])
              }
              className={buttonClass("secondary", "sm")}
            >
              <Plus className="h-3.5 w-3.5" /> Add quick hit
            </button>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">
              Interview Questions &amp; Rubrics{" "}
              <span className="font-normal text-zinc-400">({content.questions.length})</span>
            </p>
            {content.questions.map((q, i) => (
              <div key={i} className="space-y-1.5 rounded-lg bg-black/3 p-2.5 dark:bg-white/5">
                <textarea
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...content.questions];
                    next[i] = { ...next[i], prompt: e.target.value };
                    update("questions", next);
                  }}
                  className={textareaClass}
                  rows={2}
                />
                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer font-medium">
                    Rubric ({q.rubric.criteria.length} criteria)
                  </summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {q.rubric.criteria.map((c, j) => (
                      <li key={j}>
                        <span className="font-medium">{c.name}:</span> {c.description}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    <span className="font-medium">Strong answer: </span>
                    {q.rubric.strongAnswerOutline}
                  </p>
                </details>
              </div>
            ))}
          </Card>

          <Card className="space-y-2 px-4 py-4">
            <p className="text-sm font-semibold">Alt Text</p>
            <p className="text-xs text-zinc-500">
              Describes the infographic for screen readers and search.
            </p>
            <textarea
              value={content.altText}
              onChange={(e) => update("altText", e.target.value)}
              className={textareaClass}
              rows={3}
              placeholder="A technical infographic titled…"
            />
          </Card>
        </div>

        {/* Right column: checklist, summary, actions */}
        <div className="order-3 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="space-y-2.5 px-4 py-4">
            <p className="text-sm font-semibold">Publishing Checklist</p>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  {item.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle
                      className={clsx(
                        "h-4 w-4 shrink-0",
                        item.required ? "text-amber-500" : "text-zinc-400",
                      )}
                    />
                  )}
                  <span
                    className={clsx(
                      item.ok ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500",
                    )}
                  >
                    {item.label}
                  </span>
                  {!item.ok && !item.required && (
                    <span className="ml-auto text-[10px] uppercase text-zinc-400">optional</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">Module Summary</p>
            <div className="grid grid-cols-2 gap-2">
              {summaryTiles.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-black/5 px-3 py-2 dark:border-white/10"
                >
                  <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {value}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-black/5 px-3 py-2 dark:border-white/10">
              <span
                className={clsx(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  ready
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                {ready ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {isPublished ? "Published" : ready ? "Ready" : "In review"}
                </span>
                <span className="text-[11px] text-zinc-500">Status</span>
              </span>
            </div>
          </Card>

          {!isPublished && (
            <Card className="space-y-2 px-4 py-4">
              <p className="text-sm font-semibold">Actions</p>
              <button
                onClick={publish}
                disabled={busy !== null || !ready}
                className={clsx(buttonClass("primary", "md"), "w-full")}
                title={ready ? undefined : "Complete the required checklist items first"}
              >
                {busy === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                Publish Module
              </button>
              <button
                onClick={save}
                disabled={!dirty || busy !== null}
                className={clsx(buttonClass("secondary", "md"), "w-full")}
              >
                <Save className="h-4 w-4" /> Save Draft
              </button>
              {draft.briefId && (
                <Link
                  href={`/studio/briefs/${draft.briefId}`}
                  className={clsx(buttonClass("secondary", "md"), "w-full")}
                >
                  <PencilLine className="h-4 w-4" /> Edit Source Brief
                </Link>
              )}
              <button
                onClick={regenerate}
                disabled={busy !== null}
                className={clsx(buttonClass("secondary", "md"), "w-full")}
              >
                {busy === "regen" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate Study Content
              </button>
              <button
                onClick={archive}
                disabled={busy !== null}
                className={clsx(buttonClass("danger", "md"), "w-full")}
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
            </Card>
          )}

          <Card className="flex items-start gap-2 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Publishing adds this module to your Library and initializes review cards in your
              Review Queue.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
