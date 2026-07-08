"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import clsx from "clsx";

// Tag-style chip list with inline add input and per-chip remove.

export function ChipEditor({
  values,
  onChange,
  placeholder = "Add…",
  color = "violet",
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  color?: "violet" | "zinc";
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className={clsx(
            "inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium",
            color === "violet"
              ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
          )}
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label={`Remove ${v}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-black/15 py-0.5 pl-1.5 pr-1 dark:border-white/20">
        <Plus className="h-3 w-3 text-zinc-400" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          className="w-24 bg-transparent text-xs outline-none placeholder:text-zinc-400"
        />
      </span>
    </div>
  );
}
