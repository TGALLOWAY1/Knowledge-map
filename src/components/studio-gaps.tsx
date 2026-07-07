"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass, Card } from "@/components/ui";
import { Loader2, Lightbulb } from "lucide-react";

export function GenerateSuggestions() {
  const router = useRouter();
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: goals || undefined, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-2 px-4 py-4">
      <p className="text-sm font-medium">Find knowledge gaps</p>
      <p className="text-xs text-zinc-500">
        AI proposes new infographic topics from weak quiz performance, missed concepts,
        underrepresented categories/lifecycle stages, and adjacent topics.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="Optional: study goals, e.g. “ML system design interviews at FAANG”"
          className={inputClass}
        />
        <button onClick={generate} disabled={loading} className={buttonClass("primary", "md")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          Suggest topics
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </Card>
  );
}

export function GapActions({ gapId, inBacklog }: { gapId: string; inBacklog?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = async (status: string) => {
    setBusy(status);
    try {
      await fetch(`/api/gaps/${gapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const generateBrief = async () => {
    setBusy("brief");
    setError(null);
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/studio/briefs/${data.brief.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        onClick={generateBrief}
        disabled={busy !== null}
        className={buttonClass("primary", "sm")}
      >
        {busy === "brief" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Generate Brief
      </button>
      {!inBacklog && (
        <button
          onClick={() => patch("BACKLOG")}
          disabled={busy !== null}
          className={buttonClass("secondary", "sm")}
        >
          Add to Backlog
        </button>
      )}
      <button
        onClick={() => patch("COVERED")}
        disabled={busy !== null}
        className={buttonClass("ghost", "sm")}
      >
        Already Covered
      </button>
      <button
        onClick={() => patch("DISMISSED")}
        disabled={busy !== null}
        className={buttonClass("ghost", "sm")}
      >
        Dismiss
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function AddBacklogForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes: notes || undefined }),
      });
      setTitle("");
      setNotes("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-2 px-4 py-4">
      <p className="text-sm font-medium">Add an idea</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Concept title, e.g. “KV-Cache & Inference Optimization”"
          className={inputClass}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className={inputClass}
        />
        <button
          onClick={add}
          disabled={loading || !title.trim()}
          className={buttonClass("primary", "md")}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Add
        </button>
      </div>
    </Card>
  );
}
