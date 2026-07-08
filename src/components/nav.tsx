"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Sunrise,
  Library,
  RefreshCw,
  PenTool,
  BarChart3,
  Settings,
  StickyNote,
  Bookmark,
  CircleHelp,
  ChevronsUpDown,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/", label: "Today", icon: Sunrise },
  { href: "/library", label: "Library", icon: Library },
  { href: "/review", label: "Review", icon: RefreshCw },
  { href: "/studio", label: "Studio", icon: PenTool },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
];

const FOOTER_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Feedback", icon: CircleHelp },
];

// Primary subset that fits a mobile bottom bar.
const MOBILE_ITEMS = MAIN_ITEMS.slice(0, 5);

export interface NavUser {
  name: string | null;
  email: string;
}

function initials(user: NavUser | null): string {
  const source = user?.name?.trim() || user?.email || "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Nav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    clsx(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive(href)
        ? "bg-violet-600/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
        : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5",
    );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-black/5 p-4 md:flex dark:border-white/10">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            IS
          </div>
          <span className="text-sm font-semibold leading-tight tracking-tight">
            Infographic
            <br />
            Studio
          </span>
        </Link>
        <div className="flex flex-col gap-1">
          {MAIN_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
        <div className="my-3 border-t border-black/5 dark:border-white/10" />
        <div className="flex flex-col gap-1">
          {FOOTER_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-auto border-t border-black/5 pt-3 dark:border-white/10">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-700 dark:text-violet-300">
              {initials(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user?.name || "Owner"}
              </span>
              <span className="block truncate text-[11px] text-zinc-500">
                {user?.email ?? "Personal"}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur md:hidden dark:border-white/10 dark:bg-zinc-950/90">
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                isActive(href)
                  ? "text-violet-600 dark:text-violet-300"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
