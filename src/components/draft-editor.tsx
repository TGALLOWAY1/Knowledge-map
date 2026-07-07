"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Badge, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { ImageUpload, type UploadedAsset } from "@/components/upload";
import { CATEGORY_NAMES, LIFECYCLE_NAMES } from "@/lib/constants";
import { ArrowLeft, Loader2, Rocket, RefreshCw, Archive, Save } from "lucide-react";
import type { GeneratedModule } from "@/lib/ai/schemas";

interface DraftData {
  id: string;
  status: string;
  generationVersion: number;
  content: GeneratedModule;
  moduleSlug: string | null;
  briefId: string | null;
  sourceConcept: string;
  asset: { id: string; originalUrl: string; thumbnailUrl: string | null } | null;
}

// Needs Review screen: everything is editable before publish.
export function DraftEditor({ draft }: { draft: DraftData }) {
  const router = useRouter();
  const [content, setContent] = useState<GeneratedModule>(draft.content);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<UploadedAsset | null>(draft.asset);

  const update = <K extends keyof GeneratedModule>(key: K, value: GeneratedModule[K]) => {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDirty(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link
          href="/studio?tab=review"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{content.title}</h1>
          <Badge color={isPublished ? "green" : "amber"}>
            {isPublished ? "published" : "needs review"}
          </Badge>
          <Badge>generation v{draft.generationVersion}</Badge>
        </div>
        <p className="text-xs text-zinc-500">Source: {draft.sourceConcept}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {!isPublished && (
          <>
            <button onClick={publish} disabled={busy !== null} className={buttonClass("primary", "sm")}>
              {busy === "publish" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5" />
              )}
              Publish
            </button>
            <button
              onClick={save}
              disabled={!dirty || busy !== null}
              className={buttonClass("secondary", "sm")}
            >
              {busy === "save" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {dirty ? "Save draft" : "Saved"}
            </button>
            <button onClick={regenerate} disabled={busy !== null} className={buttonClass("secondary", "sm")}>
              {busy === "regen" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Regenerate content
            </button>
            {draft.briefId && (
              <Link href={`/studio/briefs/${draft.briefId}`} className={buttonClass("ghost", "sm")}>
                Edit source brief
              </Link>
            )}
            <button onClick={archive} disabled={busy !== null} className={buttonClass("danger", "sm")}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </>
        )}
        {isPublished && draft.moduleSlug && (
          <Link href={`/library/${draft.moduleSlug}`} className={buttonClass("primary", "sm")}>
            View published module →
          </Link>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Module metadata
            </p>
            <input
              value={content.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputClass}
              placeholder="Title"
            />
            <input
              value={content.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              className={inputClass}
              placeholder="Subtitle"
            />
            <textarea
              value={content.summary}
              onChange={(e) => update("summary", e.target.value)}
              className={textareaClass}
              rows={3}
              placeholder="Summary"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={content.category}
                onChange={(e) => update("category", e.target.value)}
                className={inputClass}
              >
                {CATEGORY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
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
            <input
              value={content.tags.join(", ")}
              onChange={(e) =>
                update(
                  "tags",
                  e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                )
              }
              className={inputClass}
              placeholder="tags, comma, separated"
            />
            <textarea
              value={content.altText}
              onChange={(e) => update("altText", e.target.value)}
              className={textareaClass}
              rows={2}
              placeholder="Image alt text"
            />
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Infographic image
            </p>
            {asset && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.thumbnailUrl ?? asset.originalUrl}
                alt={content.altText}
                className="max-h-64 rounded-lg object-contain"
              />
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
                label={asset ? "Replace image" : "Upload infographic image"}
              />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Concepts ({content.concepts.length})
            </p>
            {content.concepts.map((c, i) => (
              <div key={i} className="space-y-1.5 rounded-lg bg-black/3 p-2.5 dark:bg-white/5">
                <input
                  value={c.name}
                  onChange={(e) => {
                    const next = [...content.concepts];
                    next[i] = { ...next[i], name: e.target.value };
                    update("concepts", next);
                  }}
                  className={inputClass}
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
                  onClick={() =>
                    update("concepts", content.concepts.filter((_, j) => j !== i))
                  }
                  className="text-xs text-red-500"
                >
                  Remove concept
                </button>
              </div>
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
              Add concept
            </button>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Quick hits ({content.quickHits.length})
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
                />
                <button
                  onClick={() =>
                    update("quickHits", content.quickHits.filter((_, j) => j !== i))
                  }
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                update("quickHits", [...content.quickHits, { question: "", answer: "" }])
              }
              className={buttonClass("secondary", "sm")}
            >
              Add quick hit
            </button>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Interview questions & rubrics ({content.questions.length})
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
                </details>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
