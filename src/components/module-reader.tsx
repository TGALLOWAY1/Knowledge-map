"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ZoomIn,
  ZoomOut,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  MessageCircleQuestion,
  StickyNote,
  ListChecks,
  Bookmark,
  Loader2,
} from "lucide-react";
import { Card, Badge, buttonClass, textareaClass } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";

export interface ReaderModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  tags: string[];
  categoryName: string;
  categoryColor: string;
  lifecycleName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  concepts: { id: string; name: string; summary: string; keyPoints: string[] }[];
  quickHits: { id: string; question: string; answer: string }[];
  notes: { id: string; body: string }[];
  bookmarks: { id: string; title: string; body: string | null }[];
  related: { slug: string; title: string; categoryName: string; categoryColor: string }[];
}

export type ReaderTab = "concepts" | "quiz" | "notes" | "ask";
type Tab = ReaderTab;

export function ModuleReader({
  module,
  initialTab = "concepts",
}: {
  module: ReaderModule;
  initialTab?: ReaderTab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [zoom, setZoom] = useState(1);
  const [quizConceptId, setQuizConceptId] = useState<string | null>(null);
  const [askPrefill, setAskPrefill] = useState("");

  const quizConcept = useCallback(
    (conceptId: string | null) => {
      setQuizConceptId(conceptId);
      setTab("quiz");
    },
    [],
  );
  const explainConcept = useCallback((name: string) => {
    setAskPrefill(`Explain "${name}" in depth — how it works and how it comes up in interviews.`);
    setTab("ask");
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof ListChecks }[] = [
    { key: "concepts", label: "Concepts", icon: ListChecks },
    { key: "quiz", label: "Quiz", icon: Sparkles },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "ask", label: "Ask", icon: MessageCircleQuestion },
  ];

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Library
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={module.categoryColor}>{module.categoryName}</Badge>
          {module.lifecycleName && <Badge>{module.lifecycleName}</Badge>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{module.title}</h1>
        {module.subtitle && <p className="text-sm text-zinc-500">{module.subtitle}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/review/session?scope=module&moduleId=${module.id}`}
          className={buttonClass("primary", "sm")}
        >
          Drill this module
        </Link>
        <button onClick={() => quizConcept(null)} className={buttonClass("secondary", "sm")}>
          <Sparkles className="h-3.5 w-3.5" /> Quiz this
        </button>
        <button
          onClick={() => {
            setAskPrefill(`Give me a deep-dive walkthrough of ${module.title}.`);
            setTab("ask");
          }}
          className={buttonClass("secondary", "sm")}
        >
          <MessageCircleQuestion className="h-3.5 w-3.5" /> Explain this
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Image viewer */}
        <div>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 px-3 py-2 dark:border-white/10">
              <span className="text-xs font-medium text-zinc-500">Infographic</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                  className={buttonClass("ghost", "sm")}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-xs tabular-nums text-zinc-500">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                  className={buttonClass("ghost", "sm")}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {module.imageUrl && (
                  <a
                    href={module.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass("ghost", "sm")}
                    aria-label="Open original"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div
              className="max-h-[75vh] overflow-auto overscroll-contain bg-zinc-50 dark:bg-zinc-950"
              style={{ touchAction: "pan-x pan-y pinch-zoom" }}
            >
              {module.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={module.imageUrl}
                  alt={module.imageAlt}
                  className="mx-auto origin-top transition-transform"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
                  No infographic image yet
                </div>
              )}
            </div>
          </Card>
          {module.summary && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {module.summary}
            </p>
          )}
        </div>

        {/* Study panel */}
        <div className="space-y-3">
          <div className="sticky top-0 z-10 -mx-1 flex gap-1 rounded-xl bg-background/95 p-1 backdrop-blur">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                  tab === key
                    ? "bg-violet-600 text-white"
                    : "bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === "concepts" && (
            <ConceptsTab module={module} onQuiz={quizConcept} onExplain={explainConcept} />
          )}
          {tab === "quiz" && <TestMe module={module} conceptId={quizConceptId} />}
          {tab === "notes" && <NotesTab module={module} />}
          {tab === "ask" && <DeepDive module={module} prefill={askPrefill} />}

          {module.related.length > 0 && (
            <Card className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Related modules
              </p>
              <div className="space-y-1.5">
                {module.related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/library/${r.slug}`}
                    className="flex items-center justify-between gap-2 text-sm hover:text-violet-600 dark:hover:text-violet-300"
                  >
                    <span className="truncate">{r.title}</span>
                    <Badge color={r.categoryColor}>{r.categoryName}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ConceptsTab({
  module,
  onQuiz,
  onExplain,
}: {
  module: ReaderModule;
  onQuiz: (conceptId: string | null) => void;
  onExplain: (name: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {module.concepts.map((c) => (
        <Card key={c.id} className="px-4 py-3">
          <button
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setOpen(open === c.id ? null : c.id)}
          >
            <span className="text-sm font-semibold">{c.name}</span>
            <span className="text-xs text-zinc-400">{open === c.id ? "−" : "+"}</span>
          </button>
          {open === c.id && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.summary}</p>
              {c.keyPoints.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                  {c.keyPoints.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => onQuiz(c.id)} className={buttonClass("secondary", "sm")}>
                  Quiz me
                </button>
                <button onClick={() => onExplain(c.name)} className={buttonClass("secondary", "sm")}>
                  Go deeper
                </button>
              </div>
            </div>
          )}
        </Card>
      ))}

      {module.quickHits.length > 0 && (
        <Card className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Quick hits
          </p>
          <QuickHitList quickHits={module.quickHits} />
        </Card>
      )}
    </div>
  );
}

function QuickHitList({
  quickHits,
}: {
  quickHits: { id: string; question: string; answer: string }[];
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  return (
    <div className="space-y-2">
      {quickHits.map((q) => (
        <div key={q.id} className="rounded-lg bg-black/3 px-3 py-2 dark:bg-white/5">
          <button
            className="w-full text-left text-sm font-medium"
            onClick={() =>
              setRevealed((prev) => {
                const next = new Set(prev);
                if (next.has(q.id)) next.delete(q.id);
                else next.add(q.id);
                return next;
              })
            }
          >
            {q.question}
          </button>
          {revealed.has(q.id) && (
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{q.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface GradedAttempt {
  verdict: string;
  score: number;
  feedback: string;
  missedPoints: string[];
  suggestedAnswer: string | null;
}

function TestMe({ module, conceptId }: { module: ReaderModule; conceptId: string | null }) {
  const [question, setQuestion] = useState<{ id: string; prompt: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradedAttempt | null>(null);
  const [loading, setLoading] = useState<"question" | "grade" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async (forceNew = false) => {
    setLoading("question");
    setError(null);
    setResult(null);
    setAnswer("");
    try {
      const res = await fetch("/api/test-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, conceptId, forceNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestion(data.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get question");
    } finally {
      setLoading(null);
    }
  };

  const grade = async () => {
    if (!question || !answer.trim()) return;
    setLoading("grade");
    setError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answerText: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.attempt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grading failed");
    } finally {
      setLoading(null);
    }
  };

  const verdictColor = (v: string) =>
    v === "STRONG" ? "green" : v === "PARTIAL" ? "amber" : "red";

  return (
    <Card className="space-y-3 px-4 py-4">
      {!question ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-zinc-500">
            AI generates an interview-style question{conceptId ? " for this concept" : ""}, then
            grades your answer against a rubric.
          </p>
          <button
            onClick={() => fetchQuestion()}
            disabled={loading === "question"}
            className={buttonClass("primary", "md")}
          >
            {loading === "question" && <Loader2 className="h-4 w-4 animate-spin" />}
            Test me
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium leading-relaxed">{question.prompt}</p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer as you would in an interview…"
            className={textareaClass}
            rows={6}
            disabled={!!result}
          />
          {!result ? (
            <div className="flex gap-2">
              <button
                onClick={grade}
                disabled={loading === "grade" || !answer.trim()}
                className={buttonClass("primary", "md")}
              >
                {loading === "grade" && <Loader2 className="h-4 w-4 animate-spin" />}
                Grade my answer
              </button>
              <button
                onClick={() => fetchQuestion(true)}
                disabled={loading !== null}
                className={buttonClass("ghost", "md")}
              >
                New question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge color={verdictColor(result.verdict)}>
                  {result.verdict.replace("_", " ").toLowerCase()}
                </Badge>
                <span className="text-lg font-semibold tabular-nums">{result.score}/100</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.feedback}</p>
              {result.missedPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Missed points
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                    {result.missedPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.suggestedAnswer && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-violet-600 dark:text-violet-300">
                    Suggested improved answer
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                    {result.suggestedAnswer}
                  </p>
                </details>
              )}
              <button onClick={() => fetchQuestion()} className={buttonClass("secondary", "md")}>
                Another question
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}

function NotesTab({ module }: { module: ReaderModule }) {
  const [notes, setNotes] = useState(module.notes);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, body: draft }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes([{ id: data.note.id, body: data.note.body }, ...notes]);
        setDraft("");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-2 px-4 py-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this module…"
          className={textareaClass}
          rows={3}
        />
        <button
          onClick={save}
          disabled={saving || !draft.trim()}
          className={buttonClass("primary", "sm")}
        >
          Save note
        </button>
      </Card>
      {notes.map((n) => (
        <Card key={n.id} className="px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{n.body}</p>
        </Card>
      ))}
      {module.bookmarks.length > 0 && (
        <Card className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Saved explanations
          </p>
          <div className="space-y-2">
            {module.bookmarks.map((b) => (
              <details key={b.id} className="text-sm">
                <summary className="cursor-pointer font-medium">{b.title}</summary>
                {b.body && (
                  <div
                    className="prose-lite mt-1 text-zinc-600 dark:text-zinc-400"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(b.body) }}
                  />
                )}
              </details>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function DeepDive({ module, prefill }: { module: ReaderModule; prefill: string }) {
  const [question, setQuestion] = useState(prefill);
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQuestion = useRef("");

  // Keep textarea in sync when "Explain this"/"Go deeper" set a new prefill.
  const [prevPrefill, setPrevPrefill] = useState(prefill);
  if (prefill !== prevPrefill) {
    setPrevPrefill(prefill);
    setQuestion(prefill);
  }

  const ask = async () => {
    if (!question.trim() || streaming) return;
    setStreaming(true);
    setOutput("");
    setSaved(false);
    setError(null);
    lastQuestion.current = question;
    try {
      const res = await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, question }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stream failed");
    } finally {
      setStreaming(false);
    }
  };

  const bookmark = async () => {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: module.id,
        kind: "deep_dive",
        title: lastQuestion.current.slice(0, 120),
        body: output,
      }),
    });
    if (res.ok) setSaved(true);
  };

  return (
    <Card className="space-y-3 px-4 py-4">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={`Ask anything about ${module.title}…`}
        className={textareaClass}
        rows={3}
      />
      <button
        onClick={ask}
        disabled={streaming || !question.trim()}
        className={buttonClass("primary", "md")}
      >
        {streaming && <Loader2 className="h-4 w-4 animate-spin" />}
        {streaming ? "Thinking…" : "Ask"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {output && (
        <>
          <div
            className="prose-lite max-h-96 overflow-y-auto text-sm text-zinc-700 dark:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(output) }}
          />
          {!streaming && (
            <button
              onClick={bookmark}
              disabled={saved}
              className={buttonClass("secondary", "sm")}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {saved ? "Saved" : "Save explanation"}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
