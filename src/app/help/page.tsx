import Link from "next/link";
import { Card, buttonClass } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import {
  Lightbulb,
  FileText,
  Image as ImageIcon,
  ClipboardCheck,
  Rocket,
  RefreshCw,
  Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PIPELINE_STEPS = [
  {
    icon: Lightbulb,
    title: "1. Find a gap",
    body: "Suggestions surface topics worth turning into infographics. Accept one into your backlog or generate a brief straight away.",
  },
  {
    icon: FileText,
    title: "2. Draft the brief",
    body: "The brief is the source of truth: learning objective, key sections, key terms, interview questions, and visual guidance.",
  },
  {
    icon: ImageIcon,
    title: "3. Generate the image",
    body: "Turn the brief into an image prompt, create the infographic with your preferred image tool, then upload the result.",
  },
  {
    icon: ClipboardCheck,
    title: "4. Review the module",
    body: "Study content (concepts, quick hits, interview questions) is generated from the brief's source material. Review and edit everything before it goes live.",
  },
  {
    icon: Rocket,
    title: "5. Publish",
    body: "Publishing adds the module to your Library and initializes spaced-repetition cards in your Review queue.",
  },
  {
    icon: RefreshCw,
    title: "6. Study on repeat",
    body: "Review cards on an SM-2 schedule, quiz yourself with Test Me, and watch mastery build over time.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Feedback"
        subtitle="How the studio pipeline, suggestions, and review scheduling work."
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          The Studio pipeline
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STEPS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="space-y-2 px-4 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="suggestions">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          How suggestions work
        </h2>
        <Card className="space-y-3 px-5 py-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Suggestions are generated from real signals in your study history — nothing is
            invented from thin air. The generator looks at:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="font-medium">Weak quiz performance</span> — concepts where Test Me
              scores and card mastery are low.
            </li>
            <li>
              <span className="font-medium">Recently missed cards</span> — anything you rated
              &ldquo;Again&rdquo; in the last week.
            </li>
            <li>
              <span className="font-medium">Curriculum balance</span> — categories and lifecycle
              stages that are underrepresented in your library.
            </li>
            <li>
              <span className="font-medium">Your stated goals</span> — the optional goals text you
              provide when generating suggestions.
            </li>
          </ul>
          <p className="text-xs text-zinc-500">
            Each suggestion shows its priority and the signal it came from, so you can judge
            whether it deserves a spot in your backlog.
          </p>
        </Card>
      </section>

      <section id="review">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          How review scheduling works
        </h2>
        <Card className="space-y-3 px-5 py-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Cards are scheduled with an SM-2-style spaced-repetition algorithm. After each card
            you rate yourself:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="font-medium">Again</span> — you forgot; the card resets to a short
              learning step (about 10 minutes).
            </li>
            <li>
              <span className="font-medium">Hard</span> — you struggled; the interval grows slowly
              and the card gets easier to trigger.
            </li>
            <li>
              <span className="font-medium">Good</span> — you knew it; the interval multiplies by
              the card&apos;s ease factor.
            </li>
            <li>
              <span className="font-medium">Easy</span> — effortless; the interval gets an extra
              bonus and the ease factor increases.
            </li>
          </ul>
          <p className="text-xs text-zinc-500">
            Mastery per card is a heuristic based on interval length, successful reps, and lapses.
            &ldquo;Weak&rdquo; cards are lapsed cards or cards with mastery below 35%.
          </p>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Feedback
        </h2>
        <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Found a bug or have an idea?</p>
            <p className="text-xs text-zinc-500">
              Send a note — screenshots and steps to reproduce help a lot.
            </p>
          </div>
          <a
            href="mailto:tj.galloway1@gmail.com?subject=Infographic%20Studio%20feedback"
            className={buttonClass("secondary", "sm")}
          >
            <Mail className="h-3.5 w-3.5" /> Send feedback
          </a>
        </Card>
      </section>

      <p className="text-xs text-zinc-400">
        Looking for the studio itself?{" "}
        <Link href="/studio" className="text-violet-600 hover:underline dark:text-violet-300">
          Go to Infographic Studio
        </Link>
        .
      </p>
    </div>
  );
}
