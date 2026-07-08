// Small pure formatting helpers shared across pages and client components.

export function relativeTime(date: Date | string, now: Date = new Date()): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function dueLabel(dueAt: Date | string, now: Date = new Date()): string {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return "Due now";
  const hours = Math.ceil(diffMs / 3600000);
  if (hours < 24) return `Due in ${hours}h`;
  const days = Math.ceil(hours / 24);
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

// Deterministic estimate: ~30 seconds per card, minimum one minute.
export function estReviewMinutes(cardCount: number): number {
  return Math.max(1, Math.round(cardCount * 0.5));
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// Human label for an SM-2 interval expressed in days.
export function intervalLabel(intervalDays: number): string {
  if (intervalDays < 1) {
    const minutes = Math.max(1, Math.round(intervalDays * 24 * 60));
    if (minutes < 60) return `~${minutes}m`;
    return `~${Math.round(minutes / 60)}h`;
  }
  const days = Math.round(intervalDays);
  if (days < 30) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}
