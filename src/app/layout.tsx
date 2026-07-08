import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav, type NavUser } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Infographic Studio",
  description: "Visual curriculum builder and study system for AI/ML/SWE interview prep",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
};

const themeInit = `
try {
  const stored = localStorage.getItem("theme");
  const dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch {}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tolerate a missing database at build time (static prerender of /_not-found
  // etc.); the sidebar falls back to a generic user card.
  let user: NavUser | null = null;
  try {
    const u = await getCurrentUser();
    user = { name: u.name, email: u.email };
  } catch {
    user = null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
          <Nav user={user} />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
