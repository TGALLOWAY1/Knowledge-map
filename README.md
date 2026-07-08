# Knowledge Map

A mobile-first **visual curriculum builder and study system** for AI, ML, and software-engineering interview prep — the production rebuild of the Interview Prep Console artifact prototype.

Instead of hardcoded content in a single React file, everything renders from a Postgres database, images live in app-controlled storage, AI runs through server routes, and the infographic collection grows through a governed creation pipeline:

```
knowledge gap → suggestion → brief → GPT Image 2 prompt → (you create the image)
             → upload final infographic → review generated module → publish
             → flashcards / quick hits / Test Me / deep dives → spaced repetition
```

## Sections

| Section | What it does |
|---|---|
| **Today** | Next best action: due/weak/new cards, drafts awaiting image or review, suggested gaps, streak |
| **Library** | Published modules; browse by topic category, lifecycle stage, search, tags, mastery, due status |
| **Review** | Due queue, mixed review, category/lifecycle/weak/missed/new scopes; Again·Hard·Good·Easy ratings (SM-2-style scheduler in `src/lib/srs.ts`) |
| **Infographic Studio** | Suggestions → Backlog → Draft Briefs → Awaiting Image → Needs Review → Published |
| **Analytics** | Mastery by category/lifecycle, accuracy over time, weakest concepts, coverage gaps, streak |
| **Settings** | Theme (dark mode), AI status, storage status, ingestion jobs |

## Stack

- **Next.js 15 (App Router) + TypeScript + Tailwind 4** — responsive, dark-mode, mobile bottom nav / desktop sidebar
- **SQLite + Prisma** — a single local file (`prisma/knowledge-map.db`), no database server to run. Full data model: source material, briefs, image prompts, assets, drafts, modules, concepts, quick hits, questions, rubrics, review state, attempts, notes, bookmarks
- **Anthropic API (server routes only)** — gap suggestions, brief generation, image-prompt generation, module generation, question generation, rubric-based grading (saved to attempt history), streaming deep dives. Structured outputs with schema enforcement + retry; cached questions and reused rubrics; a lighter model for simple generation
- **App-controlled image storage** — local-disk driver behind a storage interface (`src/lib/storage`), thumbnails via sharp, served from `/api/assets/…`; S3/R2 or a Google Drive inbox importer can implement the same interface

## Open it like an app (macOS)

No terminal needed. In Finder, **double-click `Knowledge Map.command`**. The first
launch installs dependencies, creates and seeds the local database, builds the
app, then opens it in your browser; later launches just start it and open the
browser. Keep the Terminal window open while you study — closing it stops the
app. Your data lives in one local file (`prisma/knowledge-map.db`) and stays put
between launches.

Want a real Dock icon? Double-click **`Create Mac App.command`** once to generate
`Knowledge Map.app`, then drag it to your Dock or Applications folder and open it
like any other app.

> The first time you open `Knowledge Map.command`, macOS may warn about an app
> from an unidentified developer — right-click it → **Open** to allow it. You'll
> need [Node.js](https://nodejs.org) installed (the launcher points you there if
> it's missing).

To enable AI features (grading, deep dives, generation), add your key to `.env`:
`ANTHROPIC_API_KEY="…"`. Without it, studying and review work fully; AI features
return a clear 503.

## Setup (manual / development)

```bash
npm install
cp .env.example .env   # DATABASE_URL defaults to local SQLite; set ANTHROPIC_API_KEY for AI

npx prisma db push     # create the local SQLite schema
npm run db:seed        # taxonomy + migrate the 50-infographic prototype collection
npm run dev            # or: npm run build && npm start
```

The database is a local SQLite file — nothing to install or keep running.

## Content-first ingestion (no OCR required)

The **source material** — concept, infographic details, image-generation prompt — is the source of truth. Study content is generated from it, never reverse-engineered from the image. The final infographic image is the visual study asset.

- **Add Existing Infographic** (`/studio/add`): paste concept + details/prompt, upload the image, review the generated module, publish.
- **New topics**: accept a gap suggestion → edit the generated brief → generate a GPT Image 2 prompt → copy it, create the image externally → upload → review → publish.

## Migration from the prototype

`data/infographic-catalog.json` holds the structured catalog of the original Google Drive infographic collection (title, category, lifecycle stage, concepts, quick hits, condensed source text, Drive file ID). `npm run db:seed` turns it into modules with source material and review state. Seeded assets reference Drive temporarily (`InfographicAsset.source = DRIVE`, `driveFileId` kept); re-uploading through the app moves them to app storage — the preferred end state.

## Auth

Single-user today, auth-ready: every query goes through `getCurrentUser()` (`src/lib/auth.ts`) and all data is scoped by `userId`, so swapping in NextAuth/Clerk/Supabase later is a one-file change.
