import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-zinc-400" />}
          {item.href ? (
            <Link
              href={item.href}
              className="rounded transition-colors hover:text-violet-600 dark:hover:text-violet-300"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  badges,
  actions,
}: {
  breadcrumb?: { label: string; href?: string }[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 space-y-2">
      {breadcrumb && (
        <div className="flex items-center gap-2">
          <Breadcrumbs items={breadcrumb} />
          {badges}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {title}
            {!breadcrumb && badges}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
