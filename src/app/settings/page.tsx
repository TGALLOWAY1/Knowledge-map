import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [assetCount, driveAssets, jobs] = await Promise.all([
    prisma.infographicAsset.count(),
    prisma.infographicAsset.count({ where: { source: "DRIVE", storageKey: null } }),
    prisma.ingestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const aiConfigured = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section>
        <SectionHeader title="Appearance" />
        <Card className="space-y-2 px-4 py-4">
          <p className="text-sm font-medium">Theme</p>
          <ThemeToggle />
        </Card>
      </section>

      <section>
        <SectionHeader title="Account" />
        <Card className="space-y-1 px-4 py-4">
          <p className="text-sm font-medium">{user.name ?? "Owner"}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
          <p className="pt-2 text-xs text-zinc-500">
            Single-user mode. All progress, notes, and attempts are stored in Postgres and
            sync across devices. The auth layer is ready for a real provider (see
            <code className="mx-1">src/lib/auth.ts</code>).
          </p>
        </Card>
      </section>

      <section>
        <SectionHeader title="AI" />
        <Card className="space-y-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Anthropic API</p>
            <Badge color={aiConfigured ? "green" : "red"}>
              {aiConfigured ? "configured" : "not configured"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">
            All AI calls run through server routes — the key is never exposed to the
            browser. Generated questions and rubrics are cached and reused; a lighter
            model handles simple generation to control cost.
          </p>
        </Card>
      </section>

      <section>
        <SectionHeader title="Image storage" />
        <Card className="space-y-2 px-4 py-4">
          <p className="text-sm">
            {assetCount} assets in app-controlled storage
            {driveAssets > 0 && (
              <span className="text-zinc-500"> · {driveAssets} still referenced from Google Drive</span>
            )}
          </p>
          <p className="text-xs text-zinc-500">
            Google Drive is treated as an inbox/dropbox, not the permanent host. Prototype-era
            Drive images keep working, and the storage layer is ready for a Drive-inbox
            importer that copies new files from{" "}
            <span className="font-medium">AI Interview Infographics / Inbox</span> into app
            storage (see <code>src/lib/storage</code>).
          </p>
        </Card>
      </section>

      <section>
        <SectionHeader title="Recent ingestion jobs" />
        <Card className="divide-y divide-black/5 dark:divide-white/10">
          {jobs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">No uploads yet.</p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">{j.kind}</p>
                  <p className="text-xs text-zinc-500">
                    {j.createdAt.toLocaleString()}
                    {j.error ? ` — ${j.error}` : ""}
                  </p>
                </div>
                <Badge
                  color={
                    j.status === "SUCCEEDED" ? "green" : j.status === "FAILED" ? "red" : "amber"
                  }
                >
                  {j.status.toLowerCase()}
                </Badge>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}
