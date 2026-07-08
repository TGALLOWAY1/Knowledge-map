import clsx from "clsx";
import { Lightbulb, TrendingUp, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { GapActions } from "@/components/studio-gaps";

// Suggestion / backlog card for a ConceptGap. The impact label is derived
// from the gap's priority; the rationale is the gap's real reason/signal.

export interface SuggestionGap {
  id: string;
  title: string;
  reason: string;
  recommendation?: string | null;
  sourceSignal?: string | null;
  notes?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  categoryName?: string | null;
  categoryColor?: string | null;
  lifecycleName?: string | null;
}

const PRIORITY_META = {
  HIGH: { badge: "red", label: "High Priority", impact: "High impact", icon: ArrowUp },
  MEDIUM: { badge: "amber", label: "Medium Priority", impact: "Medium impact", icon: Minus },
  LOW: { badge: "zinc", label: "Low Priority", impact: "Low impact", icon: ArrowDown },
} as const;

export function SuggestionCard({
  gap,
  inBacklog,
  compact,
}: {
  gap: SuggestionGap;
  inBacklog?: boolean;
  compact?: boolean;
}) {
  const meta = PRIORITY_META[gap.priority] ?? PRIORITY_META.LOW;
  const PriorityIcon = meta.icon;

  return (
    <Card className={clsx("flex gap-4 px-4 py-4", compact && "px-4 py-3")}>
      {!compact && (
        <div className="hidden h-20 w-24 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 sm:flex dark:bg-violet-400/10">
          <Lightbulb className="h-7 w-7 text-violet-500" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={meta.badge} className="gap-0.5">
            <PriorityIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            {meta.impact}
          </span>
        </div>
        <h3 className="text-sm font-semibold">{gap.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{gap.reason}</p>
        {!compact && gap.recommendation && (
          <p className="text-xs text-zinc-500">
            <span className="font-medium">Recommended: </span>
            {gap.recommendation}
          </p>
        )}
        {!compact && gap.sourceSignal && (
          <p className="text-xs text-zinc-500">
            <span className="font-medium">Signal: </span>
            {gap.sourceSignal}
          </p>
        )}
        {!compact && gap.notes && <p className="text-xs text-zinc-500">{gap.notes}</p>}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {gap.categoryName && (
            <Badge color={gap.categoryColor ?? "zinc"}>{gap.categoryName}</Badge>
          )}
          {gap.lifecycleName && <Badge>{gap.lifecycleName}</Badge>}
        </div>
        <GapActions gapId={gap.id} inBacklog={inBacklog} />
      </div>
    </Card>
  );
}
