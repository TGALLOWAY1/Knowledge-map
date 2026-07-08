"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Card, buttonClass } from "@/components/ui";
import { Play, ChevronRight, BookOpen, Zap } from "lucide-react";

// "Today's Focus" card: segmented Due / Weak / Recent Misses filter over
// server-built study item lists. Each row deep-links into a module-scoped
// review session.

export interface FocusItem {
  id: string;
  label: string;
  moduleTitle: string;
  moduleId: string;
  categoryName: string;
  dueText: string;
  isConcept: boolean;
}

const SEGMENTS = [
  { key: "due", label: "Due" },
  { key: "weak", label: "Weak" },
  { key: "missed", label: "Recent Misses" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

export function TodayFocus({
  due,
  weak,
  missed,
  startScope,
}: {
  due: FocusItem[];
  weak: FocusItem[];
  missed: FocusItem[];
  startScope: "due" | "all";
}) {
  const [segment, setSegment] = useState<SegmentKey>("due");
  const lists: Record<SegmentKey, FocusItem[]> = { due, weak, missed };
  const items = lists[segment];

  return (
    <Card className="flex flex-col px-5 py-4">
      <h2 className="text-base font-semibold">Today&apos;s Focus</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              segment === s.key
                ? "bg-violet-600 text-white"
                : "bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15",
            )}
          >
            {s.label} ({lists[s.key].length})
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 space-y-1.5">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-zinc-500">
            {segment === "due"
              ? "Nothing due right now — nice work."
              : segment === "weak"
                ? "No weak concepts detected."
                : "No misses in the last week."}
          </p>
        ) : (
          items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={`/review/session?scope=module&moduleId=${item.moduleId}`}
              className="flex items-center gap-3 rounded-lg border border-black/5 px-3 py-2.5 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 dark:border-white/10"
            >
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  item.isConcept
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                    : "bg-sky-500/10 text-sky-600 dark:text-sky-300",
                )}
              >
                {item.isConcept ? <BookOpen className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {item.categoryName} · {item.moduleTitle}
                </span>
              </span>
              <span
                className={clsx(
                  "shrink-0 text-xs font-medium",
                  item.dueText === "Due now"
                    ? "text-red-500"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {item.dueText}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </Link>
          ))
        )}
      </div>

      <Link
        href={`/review/session?scope=${startScope}`}
        className={clsx(buttonClass("primary", "lg"), "mt-4 w-full")}
      >
        <Play className="h-4 w-4" /> Start Review Queue
      </Link>
    </Card>
  );
}
