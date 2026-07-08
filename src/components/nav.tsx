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
} from "lucide-react";

const ITEMS = [
  { href: "/", label: "Today", icon: Sunrise },
  { href: "/library", label: "Library", icon: Library },
  { href: "/review", label: "Review", icon: RefreshCw },
  { href: "/studio", label: "Studio", icon: PenTool },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col gap-1 border-r border-black/5 p-4 md:flex dark:border-white/10">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            K
          </div>
          <span className="text-sm font-semibold tracking-tight">Knowledge Map</span>
        </Link>
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-violet-600/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur md:hidden dark:border-white/10 dark:bg-zinc-950/90">
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {ITEMS.map(({ href, label, icon: Icon }) => (
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
