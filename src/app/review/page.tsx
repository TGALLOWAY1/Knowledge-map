import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { loadCardStates, summarize } from "@/lib/analytics";
import { CATEGORIES, LIFECYCLE_STAGES } from "@/lib/constants";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { Play, Zap, AlertTriangle, Sparkles, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  const states = await loadCardStates(user.id);
  const stats = summarize(states);

  const modes = [
    {
      href: "/review/session?scope=due",
      icon: Clock,
      title: "Due reviews",
      desc: `${stats.dueCount} cards due${stats.overdueCount ? ` (${stats.overdueCount} overdue)` : ""}`,
      accent: stats.dueCount > 0,
    },
    {
      href: "/review/session?scope=all",
      icon: Play,
      title: "Mixed review",
      desc: "Across all modules — due first, then new, then weakest",
      accent: false,
    },
    {
      href: "/review/session?scope=weak",
      icon: AlertTriangle,
      title: "Weak concepts",
      desc: `${stats.weakCount} cards below mastery threshold`,
      accent: false,
    },
    {
      href: "/review/session?scope=missed",
      icon: Zap,
      title: "Recently missed",
      desc: "Cards you rated Again in the last 7 days",
      accent: false,
    },
    {
      href: "/review/session?scope=new",
      icon: Sparkles,
      title: "New cards",
      desc: `${stats.newCount} unseen cards`,
      accent: false,
    },
  ];

  const catCount = (name: string) =>
    stats.byCategory.find((c) => c.name === name);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map(({ href, icon: Icon, title, desc, accent }) => (
          <Link key={href} href={href}>
            <Card
              className={`flex h-full items-start gap-3 px-4 py-4 transition-shadow hover:shadow-md ${
                accent ? "border-violet-500/40" : ""
              }`}
            >
              <div className="rounded-lg bg-violet-600/10 p-2 text-violet-600 dark:text-violet-300">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <section>
        <SectionHeader title="Review by category" />
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const s = catCount(c.name);
            return (
              <Link key={c.slug} href={`/review/session?scope=category&slug=${c.slug}`}>
                <Card className="flex items-center justify-between px-4 py-3 transition-shadow hover:shadow-md">
                  <span className="text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-2">
                    {s && s.due > 0 && <Badge color="red">{s.due} due</Badge>}
                    <Badge color={c.color}>{s?.cards ?? 0} cards</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="Review by lifecycle stage" />
        <div className="grid gap-2 sm:grid-cols-2">
          {LIFECYCLE_STAGES.map((st) => {
            const s = stats.byLifecycle.find((l) => l.name === st.name);
            return (
              <Link key={st.slug} href={`/review/session?scope=lifecycle&slug=${st.slug}`}>
                <Card className="flex items-center justify-between px-4 py-3 transition-shadow hover:shadow-md">
                  <span className="text-sm font-medium">{st.name}</span>
                  <div className="flex items-center gap-2">
                    {s && s.due > 0 && <Badge color="red">{s.due} due</Badge>}
                    <Badge>{s?.cards ?? 0} cards</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
