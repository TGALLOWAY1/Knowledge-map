"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Badge, buttonClass, ProgressBar } from "@/components/ui";
import { Loader2, ArrowLeft, Check } from "lucide-react";

interface QueueCard {
  reviewStateId: string;
  cardType: "concept" | "quickhit";
  moduleId: string;
  moduleTitle: string;
  categoryName: string;
  front: string;
  back: string;
  keyPoints: string[];
  status: string;
  dueAt: string;
}

const RATINGS = [
  { key: "again", label: "Again", className: "bg-red-600 hover:bg-red-500" },
  { key: "hard", label: "Hard", className: "bg-amber-600 hover:bg-amber-500" },
  { key: "good", label: "Good", className: "bg-emerald-600 hover:bg-emerald-500" },
  { key: "easy", label: "Easy", className: "bg-sky-600 hover:bg-sky-500" },
] as const;

export function ReviewSession() {
  const params = useSearchParams();
  const [cards, setCards] = useState<QueueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<{ total: number; again: number }>({ total: 0, again: 0 });
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set("scope", params.get("scope") ?? "all");
    for (const key of ["slug", "moduleId", "limit"]) {
      const v = params.get(key);
      if (v) qs.set(key, v);
    }
    fetch(`/api/review/queue?${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCards(data.cards);
      })
      .catch((e) => setError(e.message));
  }, [params]);

  const rate = useCallback(
    async (value: (typeof RATINGS)[number]["key"]) => {
      if (!cards || rating) return;
      const card = cards[index];
      setRating(true);
      try {
        await fetch("/api/review/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewStateId: card.reviewStateId, rating: value }),
        });
        setDone((d) => ({
          total: d.total + 1,
          again: d.again + (value === "again" ? 1 : 0),
        }));
        setRevealed(false);
        setIndex((i) => i + 1);
      } finally {
        setRating(false);
      }
    },
    [cards, index, rating],
  );

  if (error) {
    return <p className="py-20 text-center text-sm text-red-500">{error}</p>;
  }
  if (!cards) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (cards.length === 0 || index >= cards.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <div className="rounded-full bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold">
          {cards.length === 0 ? "Nothing to review here" : "Session complete"}
        </h1>
        {done.total > 0 && (
          <p className="text-sm text-zinc-500">
            {done.total} cards reviewed · {done.total - done.again} recalled ·{" "}
            {done.again} to relearn
          </p>
        )}
        <div className="flex gap-2">
          <Link href="/review" className={buttonClass("secondary", "md")}>
            <ArrowLeft className="h-4 w-4" /> Review hub
          </Link>
          <Link href="/" className={buttonClass("primary", "md")}>
            Today
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/review"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Exit
        </Link>
        <span className="text-xs tabular-nums text-zinc-500">
          {index + 1} / {cards.length}
        </span>
      </div>
      <ProgressBar value={index / cards.length} />

      <Card className="flex min-h-72 flex-col px-5 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge>{card.categoryName}</Badge>
          <Badge color="violet">{card.cardType === "quickhit" ? "quick hit" : "concept"}</Badge>
          {card.status === "NEW" && <Badge color="sky">new</Badge>}
        </div>
        <p className="text-lg font-semibold leading-snug">{card.front}</p>
        <p className="mt-1 text-xs text-zinc-500">{card.moduleTitle}</p>

        {revealed && (
          <div className="mt-4 space-y-2 border-t border-black/5 pt-4 dark:border-white/10">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {card.back}
            </p>
            {card.keyPoints.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                {card.keyPoints.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/review/session?scope=module&moduleId=${card.moduleId}`}
              className="inline-block text-xs font-medium text-violet-600 dark:text-violet-300"
            >
              Drill this module →
            </Link>
          </div>
        )}
      </Card>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className={buttonClass("primary", "lg") + " w-full py-3"}
        >
          Reveal
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.key}
              onClick={() => rate(r.key)}
              disabled={rating}
              className={`rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${r.className}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
