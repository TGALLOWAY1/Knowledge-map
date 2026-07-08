import clsx from "clsx";
import { Check } from "lucide-react";

// Horizontal workflow stepper: numbered circles joined by connector lines.
// Steps before activeIndex render as completed (check), the active step is
// filled violet, later steps are muted.

export function ProgressStepper({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  return (
    <ol className="flex w-full items-start">
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              <div
                className={clsx(
                  "h-0.5 flex-1",
                  i === 0
                    ? "bg-transparent"
                    : done || active
                      ? "bg-violet-500"
                      : "bg-black/10 dark:bg-white/10",
                )}
              />
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-violet-600 text-white",
                  active &&
                    "bg-violet-600 text-white ring-4 ring-violet-500/20",
                  !done &&
                    !active &&
                    "border border-black/10 bg-white text-zinc-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-400",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div
                className={clsx(
                  "h-0.5 flex-1",
                  i === steps.length - 1
                    ? "bg-transparent"
                    : done
                      ? "bg-violet-500"
                      : "bg-black/10 dark:bg-white/10",
                )}
              />
            </div>
            <span
              className={clsx(
                "px-1 text-center text-[11px] font-medium leading-tight",
                active
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
