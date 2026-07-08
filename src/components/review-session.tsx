"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { Card, Badge, buttonClass, textareaClass, ProgressBar } from "@/components/ui";
import { Breadcrumbs } from "@/components/page-header";
import { SmartImage } from "@/components/smart-image";
import { schedule, type Rating } from "@/lib/srs";
import { intervalLabel, estReviewMinutes } from "@/lib/format";
import { CATEGORIES, LIFECYCLE_STAGES } from "@/lib/constants";
import type { QueueCard, QueueModuleInfo } from "@/lib/queue";
import {
  Loader2,
  ArrowLeft,
  Check,
  Eye,
  Bookmark,
  BookmarkCheck,
  SkipForward,
  LogOut,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  BookOpen,
  Zap,
  StickyNote,
  ChevronRight,
  CalendarDays,
  TrendingDown,
  Target,
  Sparkles,
  RotateCcw,
  MessageCircleQuestion,
  FlaskConical,
  Flame,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
} from "lucide-react";

interface QueueMeta {
  dueCount: number;
  weakCount: number;
  missedCount: number;
  reviewedToday: number;
  streak: number;
}

const RATINGS: {
  key: Rating;
  label: string;
  icon: typeof RotateCcw;
  className: string;
}[] = [
  {
    key: "again",
    label: "Again",
    icon: RotateCcw,
    className:
      "border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400",
  },
  {
    key: "hard",
    label: "Hard",
    icon: Clock,
    className:
      "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
  },
  {
    key: "good",
    label: "Good",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "easy",
    label: "Easy",
    icon: Sparkles,
    className:
      "border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400",
  },
];

const SCOPE_LABELS: Record<string, string> = {
  all: "Mixed Review Queue",
  due: "Due Today",
  weak: "Weak Concepts",
  missed: "Recent Misses",
  new: "New Cards",
  module: "Module Review",
  category: "Category Review",
  lifecycle: "Lifecycle Review",
};

export function ReviewSession() {
  const params = useSearchParams();
  const router = useRouter();
  const scopeKind = params.get("scope") ?? "all";

  const [cards, setCards] = useState<QueueCard[] | null>(null);
  const [modules, setModules] = useState<Record<string, QueueModuleInfo>>({});
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<{ total: number; again: number }>({ total: 0, again: 0 });
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(false);
  const [bookmarks, setBookmarks] = useState<Record<string, string>>({}); // reviewStateId -> bookmarkId
  const [zoom, setZoom] = useState(1);
  const [readerTab, setReaderTab] = useState<"concepts" | "quickhits" | "notes">("concepts");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [localNotes, setLocalNotes] = useState<Record<string, { id: string; body: string }[]>>(
    {},
  );

  useEffect(() => {
    setCards(null);
    setIndex(0);
    setRevealed(false);
    setDone({ total: 0, again: 0 });
    const qs = new URLSearchParams();
    qs.set("scope", scopeKind);
    for (const key of ["slug", "moduleId", "limit"]) {
      const v = params.get(key);
      if (v) qs.set(key, v);
    }
    fetch(`/api/review/queue?${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCards(data.cards);
        setModules(data.modules ?? {});
        setMeta(data.meta ?? null);
      })
      .catch((e) => setError(e.message));
  }, [params, scopeKind]);

  const advance = useCallback(() => {
    setRevealed(false);
    setIndex((i) => i + 1);
  }, []);

  const rate = useCallback(
    async (value: Rating) => {
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
        advance();
      } finally {
        setRating(false);
      }
    },
    [cards, index, rating, advance],
  );

  const toggleBookmark = useCallback(async () => {
    if (!cards) return;
    const card = cards[index];
    const existing = bookmarks[card.reviewStateId];
    if (existing) {
      await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existing }),
      });
      setBookmarks((b) => {
        const next = { ...b };
        delete next[card.reviewStateId];
        return next;
      });
    } else {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: card.moduleId,
          conceptId: card.conceptId,
          kind: card.cardType,
          title: card.front,
          body: card.back,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookmarks((b) => ({ ...b, [card.reviewStateId]: data.bookmark.id }));
      }
    }
  }, [cards, index, bookmarks]);

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
  const mod = modules[card.moduleId];
  const notes = [...(localNotes[card.moduleId] ?? []), ...(mod?.notes ?? [])];
  const bookmarked = !!bookmarks[card.reviewStateId];
  const sessionAccuracy =
    done.total > 0 ? Math.round(((done.total - done.again) / done.total) * 100) : null;

  const breadcrumb =
    scopeKind === "module" && mod
      ? [
          { label: "Library", href: "/library" },
          { label: mod.categoryName },
          { label: mod.title },
        ]
      : [
          { label: "Review", href: "/review" },
          { label: SCOPE_LABELS[scopeKind] ?? "Session" },
        ];

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    setNoteBusy(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: card.moduleId, body: noteDraft.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalNotes((n) => ({
          ...n,
          [card.moduleId]: [
            { id: data.note.id, body: data.note.body },
            ...(n[card.moduleId] ?? []),
          ],
        }));
        setNoteDraft("");
      }
    } finally {
      setNoteBusy(false);
    }
  };

  const readerTabs = [
    { key: "concepts" as const, label: "Concepts", count: mod?.concepts.length ?? 0 },
    { key: "quickhits" as const, label: "Quick Hits", count: mod?.quickHits.length ?? 0 },
    { key: "notes" as const, label: "Notes", count: notes.length },
  ];

  const setScope = (qs: string) => router.push(`/review/session?${qs}`);

  const filterLink = (label: string, icon: typeof CalendarDays, scope: string) => {
    const Icon = icon;
    const active = scopeKind === scope;
    return (
      <button
        key={scope}
        onClick={() => setScope(`scope=${scope}`)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
            : "border-black/5 text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5",
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
        {active && <Check className="ml-auto h-4 w-4" />}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Breadcrumbs items={breadcrumb} />
          <Badge color="violet">{SCOPE_LABELS[scopeKind] ?? "Review Queue"}</Badge>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {scopeKind === "module" && mod ? mod.title : (SCOPE_LABELS[scopeKind] ?? "Review")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review the infographic, quiz concepts, and strengthen weak areas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/review" className={buttonClass("secondary", "md")}>
              <LogOut className="h-4 w-4" /> Exit Queue
            </Link>
            <button onClick={toggleBookmark} className={buttonClass("secondary", "md")}>
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-violet-600" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
            <button
              onClick={advance}
              className={buttonClass("primary", "md")}
              title="Skips without rating — the card keeps its current schedule"
            >
              <SkipForward className="h-4 w-4" /> Skip Card
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_260px]">
        {/* Left: infographic reader */}
        <Card className="order-2 self-start overflow-hidden xl:order-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
            <span className="text-sm font-semibold">Infographic Reader</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                className={buttonClass("ghost", "sm")}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                className={buttonClass("ghost", "sm")}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className={buttonClass("ghost", "sm")}
                aria-label="Fit to width"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="text-xs">Fit</span>
              </button>
              <span className="w-10 text-center text-xs tabular-nums text-zinc-500">
                {Math.round(zoom * 100)}%
              </span>
              {mod?.imageUrl && (
                <a
                  href={mod.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass("ghost", "sm")}
                  aria-label="Open full size"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div
            className="max-h-[46vh] overflow-auto overscroll-contain bg-zinc-50 dark:bg-zinc-950"
            style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          >
            <SmartImage
              src={mod?.imageUrl}
              alt={mod?.imageAlt ?? card.moduleTitle}
              className="mx-auto origin-top transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              fallbackClassName="h-48 w-full"
              fallbackLabel={
                mod?.imageUrl
                  ? "Infographic image couldn't be loaded"
                  : "No infographic image for this module"
              }
            />
          </div>

          <div className="border-t border-black/5 dark:border-white/10">
            <div className="flex gap-1 px-3 pt-2">
              {readerTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setReaderTab(t.key)}
                  className={clsx(
                    "flex items-center gap-1 border-b-2 px-2 py-1.5 text-xs font-medium transition-colors",
                    readerTab === t.key
                      ? "border-violet-600 text-violet-700 dark:text-violet-300"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
                  )}
                >
                  {t.label}
                  <span className="rounded-full bg-black/5 px-1.5 text-[10px] tabular-nums dark:bg-white/10">
                    {t.count}
                  </span>
                </button>
              ))}
              {mod && (
                <Link
                  href={`/library/${mod.slug}`}
                  className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-violet-600 hover:underline dark:text-violet-300"
                >
                  Open module <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto p-3">
              {readerTab === "concepts" &&
                (mod?.concepts ?? []).map((c) => {
                  const isCurrent = c.id === card.conceptId;
                  return (
                    <div
                      key={c.id}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2",
                        isCurrent
                          ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/30"
                          : "border-black/5 dark:border-white/10",
                      )}
                    >
                      <span
                        className={clsx(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          isCurrent
                            ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                            : "bg-black/5 text-zinc-500 dark:bg-white/10",
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{c.summary}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                    </div>
                  );
                })}
              {readerTab === "quickhits" &&
                (mod?.quickHits ?? []).map((q) => {
                  const isCurrent = q.id === card.quickHitId;
                  return (
                    <details
                      key={q.id}
                      className={clsx(
                        "rounded-lg border px-3 py-2",
                        isCurrent
                          ? "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/30"
                          : "border-black/5 dark:border-white/10",
                      )}
                    >
                      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                        {q.question}
                      </summary>
                      <p className="mt-1.5 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                        {q.answer}
                      </p>
                    </details>
                  );
                })}
              {readerTab === "notes" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Add a note about this module…"
                      className={clsx(textareaClass, "min-h-16")}
                      rows={2}
                    />
                    <button
                      onClick={addNote}
                      disabled={noteBusy || !noteDraft.trim()}
                      className={clsx(buttonClass("secondary", "sm"), "self-start")}
                    >
                      {noteBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="py-2 text-center text-xs text-zinc-400">No notes yet.</p>
                  ) : (
                    notes.map((n) => (
                      <div
                        key={n.id}
                        className="flex gap-2 rounded-lg border border-black/5 px-3 py-2 dark:border-white/10"
                      >
                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                          {n.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {readerTab === "concepts" && card.conceptId && (
              <p className="flex items-center gap-1.5 border-t border-black/5 px-3 py-2 text-[11px] text-zinc-500 dark:border-white/10">
                <Sparkles className="h-3 w-3 text-violet-500" />
                Highlighted concept matches the current review card.
              </p>
            )}
          </div>
        </Card>

        {/* Middle: review card */}
        <div className="order-1 space-y-3 xl:order-2">
          {meta && (
            <div className="grid grid-cols-3 gap-2">
              <Card className="flex items-center gap-2 px-3 py-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-violet-500" />
                <span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {meta.dueCount}
                  </span>
                  <span className="text-[10px] text-zinc-500">Due today</span>
                </span>
              </Card>
              <Card className="flex items-center gap-2 px-3 py-2">
                <TrendingDown className="h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {meta.weakCount}
                  </span>
                  <span className="text-[10px] text-zinc-500">Weak concepts</span>
                </span>
              </Card>
              <Card className="flex items-center gap-2 px-3 py-2">
                <Target className="h-4 w-4 shrink-0 text-red-500" />
                <span>
                  <span className="block text-sm font-semibold tabular-nums">
                    {meta.missedCount}
                  </span>
                  <span className="text-[10px] text-zinc-500">Recent misses</span>
                </span>
              </Card>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
              Card {index + 1} of {cards.length}
            </span>
            <ProgressBar value={index / cards.length} className="flex-1" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge color="violet">{card.moduleTitle}</Badge>
            <Badge>{card.categoryName}</Badge>
            {card.lifecycleName && <Badge>{card.lifecycleName}</Badge>}
          </div>

          <Card className="flex min-h-72 flex-col px-5 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge color={card.cardType === "quickhit" ? "sky" : "violet"} className="gap-1">
                {card.cardType === "quickhit" ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <BookOpen className="h-3 w-3" />
                )}
                {card.cardType === "quickhit" ? "Quick Hit" : "Concept"}
              </Badge>
              {card.status === "NEW" && <Badge color="emerald">New</Badge>}
            </div>
            <p className="text-lg font-semibold leading-snug">{card.front}</p>
            {!revealed && (
              <p className="mt-1 text-xs text-zinc-500">Answer before revealing.</p>
            )}

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className={clsx(buttonClass("primary", "lg"), "mt-6 w-full")}
              >
                <Eye className="h-4 w-4" /> Reveal Answer
              </button>
            ) : (
              <div className="mt-4 space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
                <div className="rounded-lg bg-black/3 p-3 dark:bg-white/5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Answer
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {card.back}
                  </p>
                  {card.keyPoints.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                      {card.keyPoints.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.tags.slice(0, 6).map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {RATINGS.map(({ key, label, icon: Icon, className }) => (
                    <button
                      key={key}
                      onClick={() => rate(key)}
                      disabled={rating}
                      className={clsx(
                        "flex flex-col items-center gap-0.5 rounded-lg border py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
                        className,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      <span className="text-[10px] font-normal text-zinc-400">
                        {intervalLabel(schedule(card.srs, key).intervalDays)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/library/${card.moduleSlug}?tab=ask`}
              className={buttonClass("secondary", "md")}
            >
              <MessageCircleQuestion className="h-4 w-4" /> Explain More
            </Link>
            <Link
              href={`/library/${card.moduleSlug}?tab=quiz`}
              className={buttonClass("secondary", "md")}
            >
              <FlaskConical className="h-4 w-4" /> Test Me
            </Link>
          </div>
        </div>

        {/* Right: filters + snapshot */}
        <div className="order-3 space-y-4 self-start">
          <Card className="space-y-2 px-4 py-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Filter className="h-3.5 w-3.5" /> Queue Filters
            </p>
            {filterLink("Due Today", CalendarDays, "due")}
            {filterLink("Weak", TrendingDown, "weak")}
            {filterLink("Recent Misses", Target, "missed")}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">By Category</label>
              <select
                value={scopeKind === "category" ? (params.get("slug") ?? "") : ""}
                onChange={(e) =>
                  e.target.value && setScope(`scope=category&slug=${e.target.value}`)
                }
                className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-white/15 dark:bg-zinc-900"
              >
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">By Lifecycle</label>
              <select
                value={scopeKind === "lifecycle" ? (params.get("slug") ?? "") : ""}
                onChange={(e) =>
                  e.target.value && setScope(`scope=lifecycle&slug=${e.target.value}`)
                }
                className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-white/15 dark:bg-zinc-900"
              >
                <option value="">Choose…</option>
                {LIFECYCLE_STAGES.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setScope("scope=all")}
              className={clsx(buttonClass("ghost", "sm"), "w-full")}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
            </button>
          </Card>

          <Card className="space-y-3 px-4 py-4">
            <p className="text-sm font-semibold">Session Snapshot</p>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Target className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold tabular-nums">
                    {sessionAccuracy === null ? "—" : `${sessionAccuracy}%`}
                  </span>
                  <span className="text-[11px] text-zinc-500">Accuracy this session</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold tabular-nums">
                    {(meta?.reviewedToday ?? 0) + done.total}
                  </span>
                  <span className="text-[11px] text-zinc-500">Reviewed today</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Clock className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold tabular-nums">
                    {estReviewMinutes(cards.length - index)} min
                  </span>
                  <span className="text-[11px] text-zinc-500">Est. time left</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Flame className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold tabular-nums">
                    {meta?.streak ?? 0} days
                  </span>
                  <span className="text-[11px] text-zinc-500">Streak</span>
                </span>
              </div>
            </div>
            {(meta?.streak ?? 0) > 0 && (
              <p className="text-center text-xs text-zinc-500">Keep it going! 💪</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
