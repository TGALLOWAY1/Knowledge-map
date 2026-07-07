"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Badge, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { ImageUpload, type UploadedAsset } from "@/components/upload";
import { ArrowLeft, Copy, Check, Loader2, Wand2, RefreshCw, Archive } from "lucide-react";
import type { BriefContent } from "@/lib/ai/schemas";

interface BriefData {
  id: string;
  title: string;
  stage: string;
  categoryName: string | null;
  lifecycleName: string | null;
  content: BriefContent;
  prompts: { id: string; version: number; promptText: string; createdAt: string }[];
  draftId: string | null;
  asset: { id: string; originalUrl: string; thumbnailUrl: string | null } | null;
}

export function BriefWorkbench({ brief }: { brief: BriefData }) {
  const router = useRouter();
  const [content, setContent] = useState<BriefContent>(brief.content);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [asset, setAsset] = useState<UploadedAsset | null>(brief.asset);

  const latestPrompt = brief.prompts[0];

  const update = <K extends keyof BriefContent>(key: K, value: BriefContent[K]) => {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content.title, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const generatePrompt = async () => {
    setBusy("prompt");
    setError(null);
    try {
      if (dirty) await save();
      const res = await fetch(`/api/briefs/${brief.id}/image-prompt`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
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
    if (!latestPrompt) return;
    await navigator.clipboard.writeText(latestPrompt.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const listEditor = (
    label: string,
    key: "examples" | "interviewQuestions" | "misconceptions" | "suggestedConcepts",
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
    <div className="space-y-4">
      <header className="space-y-2">
        <Link
          href="/studio?tab=briefs"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{content.title}</h1>
          <Badge color={brief.stage === "AWAITING_IMAGE" ? "sky" : "amber"}>
            {brief.stage.replaceAll("_", " ").toLowerCase()}
          </Badge>
          {brief.categoryName && <Badge>{brief.categoryName}</Badge>}
          {brief.lifecycleName && <Badge>{brief.lifecycleName}</Badge>}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={!dirty || busy !== null} className={buttonClass("secondary", "sm")}>
          {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {dirty ? "Save brief" : "Saved"}
        </button>
        <button onClick={generatePrompt} disabled={busy !== null} className={buttonClass("primary", "sm")}>
          {busy === "prompt" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : latestPrompt ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {latestPrompt ? "Regenerate image prompt" : "Generate image prompt"}
        </button>
        <button onClick={archive} disabled={busy !== null} className={buttonClass("danger", "sm")}>
          <Archive className="h-3.5 w-3.5" /> Archive
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Brief editor */}
        <Card className="space-y-4 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Brief (editable)
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Title
            </label>
            <input
              value={content.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Learning objective
            </label>
            <textarea
              value={content.learningObjective}
              onChange={(e) => update("learningObjective", e.target.value)}
              className={textareaClass}
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Main sections
            </label>
            <div className="space-y-2">
              {content.mainSections.map((s, i) => (
                <div key={i} className="space-y-1 rounded-lg bg-black/3 p-2 dark:bg-white/5">
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
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Visual layout recommendation
            </label>
            <textarea
              value={content.visualLayout}
              onChange={(e) => update("visualLayout", e.target.value)}
              className={textareaClass}
              rows={3}
            />
          </div>
          {listEditor("Examples", "examples")}
          {listEditor("Interview questions", "interviewQuestions")}
          {listEditor("Misconceptions to address", "misconceptions")}
          {listEditor("Suggested flashcard concepts", "suggestedConcepts")}
        </Card>

        {/* Prompt + image */}
        <div className="space-y-4">
          <Card className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                GPT Image 2 prompt {latestPrompt ? `(v${latestPrompt.version})` : ""}
              </p>
              {latestPrompt && (
                <button onClick={copyPrompt} className={buttonClass("secondary", "sm")}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              )}
            </div>
            {latestPrompt ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/3 p-3 text-xs leading-relaxed dark:bg-white/5">
                {latestPrompt.promptText}
              </pre>
            ) : (
              <p className="text-sm text-zinc-500">
                Generate the image prompt once the brief looks right. You&apos;ll copy it into
                GPT Image 2, create the infographic, then upload the result below.
              </p>
            )}
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Final infographic
            </p>
            {busy === "attach" ? (
              <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating study module draft from source material…
              </div>
            ) : (
              <ImageUpload onUploaded={attachImage} current={asset} label="Upload final image" />
            )}
            {brief.draftId && (
              <Link href={`/studio/drafts/${brief.draftId}`} className={buttonClass("secondary", "sm")}>
                Open module draft →
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
