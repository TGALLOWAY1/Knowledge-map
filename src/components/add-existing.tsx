"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { ImageUpload, type UploadedAsset } from "@/components/upload";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

// Fast migration path: bring an already-created infographic into the app.
// concept + details/prompt (source of truth) + final image → module draft.
export function AddExistingWizard() {
  const router = useRouter();
  const [concept, setConcept] = useState("");
  const [details, setDetails] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [asset, setAsset] = useState<UploadedAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!concept.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/add-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          details: details || undefined,
          imagePrompt: imagePrompt || undefined,
          notes: notes || undefined,
          assetId: asset?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/studio/drafts/${data.draft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate module");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-2">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Studio
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add Existing Infographic</h1>
        <p className="text-sm text-zinc-500">
          The concept, details, and original image prompt are the source of truth — study
          content is generated from them, not OCR&apos;d from the image.
        </p>
      </header>

      <Card className="space-y-4 px-4 py-5">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Concept / title *
          </label>
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="e.g. Training vs. Inference"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Infographic details
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Paste the infographic's content: sections, definitions, key points…"
            className={textareaClass}
            rows={7}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Original image-generation prompt
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Paste the GPT Image 2 prompt you used (optional but improves generation)"
            className={textareaClass}
            rows={4}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Notes
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Final infographic image
          </label>
          <ImageUpload onUploaded={setAsset} current={asset} />
        </div>

        <button
          onClick={submit}
          disabled={busy || !concept.trim() || (!details.trim() && !imagePrompt.trim())}
          className={buttonClass("primary", "lg") + " w-full"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Generating study module…" : "Generate study module draft"}
        </button>
        {!details.trim() && !imagePrompt.trim() && concept.trim() && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Provide details or the original prompt so generation has real source material.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </Card>
    </div>
  );
}
