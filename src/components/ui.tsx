import clsx from "clsx";
import Link from "next/link";

// Small hand-rolled UI kit — consistent, dark-mode aware, mobile-first.

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-500 disabled:bg-violet-600/50",
  secondary:
    "border border-black/10 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10",
  danger:
    "border border-red-300/50 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
} as const;

export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = "primary",
  size: "sm" | "md" | "lg" = "md",
) {
  return clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" && "px-2.5 py-1.5 text-xs",
    size === "md" && "px-3.5 py-2 text-sm",
    size === "lg" && "px-4 py-2.5 text-sm",
    BUTTON_VARIANTS[variant],
  );
}

export function Badge({
  color = "zinc",
  children,
  className,
}: {
  color?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
    green: "bg-green-500/10 text-green-700 dark:text-green-300",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        colors[color] ?? colors.zinc,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
}: {
  value: number; // 0..1
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-violet-500 transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {hint && <p className="max-w-sm text-xs text-zinc-500">{hint}</p>}
      {action}
    </Card>
  );
}

const TILE_TONES = {
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  red: "bg-red-500/10 text-red-600 dark:text-red-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
} as const;

export function StatTile({
  label,
  value,
  href,
  accent,
  icon: Icon,
  sub,
  progress,
  tone = "violet",
}: {
  label: string;
  value: string | number;
  href?: string;
  accent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  sub?: string;
  progress?: number; // 0..1 renders a mini progress bar under the value
  tone?: keyof typeof TILE_TONES;
}) {
  const inner = (
    <Card
      className={clsx(
        "flex h-full flex-col gap-1 px-4 py-3",
        href && "transition-shadow hover:shadow-md",
        accent && "border-violet-500/30",
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              TILE_TONES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </div>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      {progress !== undefined && <ProgressBar value={progress} className="mt-1" />}
      {sub && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</span>}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/15 dark:bg-zinc-900 dark:placeholder:text-zinc-500";

export const textareaClass = clsx(inputClass, "min-h-24 resize-y");
