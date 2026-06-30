# API Doc Workspace

**AI-assisted workspace for API documentation — a practical AX tool for Technical Writers.**

API Doc Workspace helps a Technical Writer turn raw API information from engineers into structured documentation, a list of missing details, precise questions for engineers, and a polished Markdown draft — all in one screen.

---

## Why this tool exists

Technical Writers rarely get clean, complete API specs. They get Slack messages, half-finished notes, and a JSON sample. The hard part is not "writing English" — it's:

- separating raw information into the right sections,
- spotting what's missing or ambiguous,
- asking engineers the *right* questions,
- and producing a consistent, accurate developer-facing draft.

This tool is built around that exact workflow. **It does not replace Technical Writers.** It helps them work faster by structuring information, finding gaps, generating better engineer questions, drafting docs, and reviewing for clarity and consistency.

---

## Technical Writer workflow

1. **Input** — Paste raw API notes or fill the sectioned fields (basic info, endpoint, auth, request, response, errors, operational notes).
2. **Analyze API** — GPT converts the raw content into a structured `ApiDocProject` object.
3. **Find Missing Info** — GPT detects missing or unclear technical details.
4. **Generate Engineer Questions** — GPT writes clear, polite, prioritized questions to ask engineers.
5. **Generate Documentation** — GPT produces a Markdown API documentation draft.
6. **Review Documentation** — GPT reviews the draft for clarity, consistency, terminology, missing examples, security warnings, and client/server confusion.
7. **Copy or export** the Markdown.

The middle column lets you track each engineer question (Open → Answered → Applied) and record answers inline.

---

## Features

- Three-column SaaS dashboard (Input · Structured Summary · Documentation Output), responsive to a single column on mobile.
- One-click **Load Sample API** to explore the full flow instantly.
- Structured summary cards: method/endpoint, target reader, auth, required/optional fields, success response, error codes, operational notes.
- **Missing Information** list with priority and suggested questions.
- **Engineer Questions** panel with reason, priority, status, suggested owner, inline answer, and "Mark Answered / Applied".
- Markdown **preview + raw editor**, copy to clipboard, copy engineer questions, and **export `.md`**.
- **AI Review** issues grouped by category and severity.
- **Technical English Coach** — convert Korean engineering notes into precise developer-facing English (see below).
- **Global Docs Mode** — a bilingual (Korean ↔ English) documentation workspace with terminology mapping, style guide enforcement, and language quality review (see below).
- **Documentation Improvement Loop** — Loop Engineering workflow that repeatedly reviews, scores, and improves documentation until a target quality score or safe stop condition (see below).
- Local persistence via `localStorage` (no database required).
- Robust JSON parsing with safe fallbacks so malformed model output never crashes the UI.

---

## Technical English Coach

Technical Writers often receive raw API explanations in Korean from engineers but may not know how to express those ideas naturally in developer-facing English documentation.

**Technical English Coach** converts Korean API notes into clear technical English and explains *why* each English expression is appropriate. It is **not a simple translator** — it is a writing coach for Technical Writers who need to turn Korean technical notes into precise English documentation, and it helps maintain consistency with a documentation style guide.

Flow: **Korean engineer notes → Developer-facing English → Expression explanation → Alternative phrasings → Apply to documentation draft.**

What you get for each conversion:

- **Recommended English** — a clear English version of the whole input.
- **Expression Breakdown** — phrase-by-phrase: Korean expression, recommended English, why it works, alternative phrasings (with nuance and when to use), and cautions.
- **Terms to be careful with** — terminology guidance (e.g. prefer `API token` over `API key`).
- **Style guide checks** — pass / needs-revision status against your provided style guide.
- **Final polished version** — ready to paste, with **Apply to Documentation Draft**, **Copy English**, and **Copy Breakdown**.

You can tune the output with a **target style** (API reference, tutorial, release note, engineer question, error explanation, UI copy, FAQ), a **target reader**, and an optional **style guide**.

**Example**

Input (Korean):

> 이 API는 메시지를 보낼 때 사용합니다. channel_url이 필요하고, message는 필수입니다.

Recommended English:

> Use this endpoint to send a message. The `channel_url` parameter is required, and the `message` field is required in the request body.

The coach favors precise API verbs (`create`, `retrieve`, `update`, `delete`, `send`, `return`, `require`, …), uses backticks for field names and paths, and maps common Korean phrasings to standard documentation wording (e.g. `생성` → "create", `필수` → "required", `토큰이 필요하다` → "This endpoint requires an API token.").

---

## Global Docs Mode

**Global Docs Mode** supports Technical Writers working in bilingual engineering environments. It converts Korean API notes into clear English developer documentation, explains Korean-to-English expression choices, checks terminology consistency, and applies documentation style guide rules.

This feature is designed for **global SaaS/API companies** (like Sendbird) where engineering discussions may happen in Korean but public developer documentation must be written in precise English. It is **not Google Translate** — it is a professional documentation workflow tool.

Open it from the **Global Docs Mode** tab at the top of the app. It includes:

- **Language Workflow Selector** — switch between *Korean Source → English Docs*, *English Source → English Docs*, *Korean Review → English Polish*, and *Bilingual Compare*. The default is *Korean Source → English Docs*.
- **Language badges** — at a glance: Source (Korean), Output (English), Style (Developer Docs).
- **Bilingual Documentation Workspace** — Korean source on the left, developer-facing English on the right, with a `Korean → English` arrow indicator. Move between languages without losing structure.
- **Expression Mapping** — see how Korean technical expressions become natural API documentation English (e.g. `생성하다` → "create", `에러가 발생합니다` → "The API returns an error").
- **Terminology Notes** — Korean term → recommended English, with terms to avoid and example usage, to keep terminology consistent across docs.
- **Global Style Guide** — an editable rule set (e.g. *Use "API token", not "API key"*) that the AI applies during conversion and review, reported back as pass / needs-revision checks.
- **Language Quality Review** (`language_quality_review` action) — finds literal-translation issues, unnatural Korean-style English, vague verbs, missing backticks, and tone mismatches in the generated English.
- **Apply to Documentation Draft** / **Copy English** — push the polished English straight into the shared Markdown draft used by the rest of the app.

**Example**

Korean source (use **Load Korean API Sample**):

> 이 API는 유저를 생성할 때 사용합니다. API 토큰이 필요하고, user_id는 필수입니다. nickname은 선택값입니다. 같은 user_id가 이미 있으면 에러가 발생합니다. 이 API는 클라이언트에서 직접 호출하면 안 되고 서버에서 호출해야 합니다.

English documentation:

> Use this endpoint to create a user. This endpoint requires an API token. The `user_id` field is required, and the `nickname` field is optional. If a user with the same `user_id` already exists, the API returns an error. Call this endpoint from your server and do not expose your API token in client-side code.

> The conversion (`global_docs_convert`) and review (`language_quality_review`) both run through the same server-side `/api/ai` route, so the OpenAI key is never exposed to the client.

---

## Documentation Improvement Loop

The **Improvement Loop** applies a Loop Engineering workflow to API documentation. Instead of generating a draft once, the system repeatedly **reviews → scores → improves → re-reviews** until the document reaches a target quality score or stops because missing technical facts require engineer input.

Open it from the **Improvement Loop** tab (or click **Run Improvement Loop** in the Documentation Draft panel).

**Workflow:** Generate → Review → Score → Improve → Re-review → Stop when ready.

**Quality dimensions (0–100 each):**
Accuracy · Completeness · Clarity · Style guide · Developer readability · Security · Technical English · Structure · Overall

**Loop settings:**
- Target quality score (default 88)
- Max iterations (1–5, default 2) with hard cap (default 3)
- Loop mode: Conservative / Balanced / Aggressive
- **Token-saving mode** (default on): review + targeted section patches instead of full rewrites; compact prompts and minimal context
- Allow full document rewrite (default off; uses more tokens)
- Stop when missing technical facts are found
- Apply style guide · Include Technical English review · Include security review

**Token-efficient flow (default):**
1. **Review pass** — scores, top 5 issues, patch plan (no full draft in response)
2. **Patch pass** — up to 3 section-level Markdown patches
3. **Client applies patches** — `applyMarkdownPatches()` replaces only affected headings

**Early stop conditions:**
- Target score reached
- Score improvement &lt; 3 points between iterations
- Same issue appears in consecutive iterations
- High-impact issues require engineer input
- Max iterations reached

**Safety:** The loop does **not** invent rate limits, field constraints, error codes, webhook behavior, or authentication rules. Missing facts surface as **Blocking Questions** for engineers.

**Future improvements:**
- Human approval between iterations
- Diff view between iterations
- GitHub PR comment integration
- Docs CI quality gate
- Team-specific quality thresholds
- Automatic changelog loop
- SDK documentation loop

---

## Tech stack

- **Next.js (App Router)** + **React** + **TypeScript**
- **Tailwind CSS** for the UI
- **OpenAI API**, called **server-side only**
- **No database** — local state + `localStorage` for MVP persistence
- `marked` for Markdown preview rendering

---

## How to run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local and set OPENAI_API_KEY

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000.

Useful scripts:

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # run the production build
npm run typecheck  # TypeScript type checking
```

---

## Environment variables

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY` | Yes      | Your OpenAI API key. Used **only** on the server. Never exposed.   |
| `OPENAI_MODEL`   | No       | Model override. Falls back to `gpt-4o-mini` (set in `lib/openai.ts`). |

> **Security:** The API key is read exclusively inside the server route (`app/api/ai/route.ts`) via `lib/openai.ts`. It is never sent to the browser, never logged, and the client only ever talks to `/api/ai`.

---

## Demo scenario

1. Click **Load Sample API** — this fills a realistic "Create a user" endpoint (`POST /v3/users`) for a chat platform.
2. Click **Analyze API** — the middle column fills with a structured summary.
3. Click **Find Missing Info** — gaps like unknown rate limit, missing field constraints, and unspecified `user_id` length appear.
4. Click **Generate Engineer Questions** — polite, prioritized questions are produced. Record answers and mark them Answered/Applied.
5. Click **Generate Documentation** — a Markdown draft appears in the right column.
6. Click **Review Documentation** — the AI editor flags clarity, terminology, and security issues (e.g. keeping the API token server-side).
7. **Copy** or **Export `.md`** the final draft.

---

## Future improvements

- OpenAPI / Swagger import
- GitHub PR comment generation
- Confluence / GitBook export
- Team glossary and style guide enforcement
- Version diff checker
- SDK documentation mode
- Changelog generator
- Docs quality scoring

---

## Project structure

```
app/
  page.tsx            # 3-column dashboard (client)
  layout.tsx          # root layout
  globals.css         # Tailwind + markdown preview styles
  api/ai/route.ts     # server-side OpenAI route (action-based)
lib/
  types.ts            # shared TypeScript types
  prompts.ts          # AI identity + per-task prompts
  sample.ts           # sample + empty form data
  openai.ts           # server-only OpenAI client + safe JSON parser
  normalize.ts        # safe normalization of AI JSON into typed objects
  client.ts           # client-side fetch helper for /api/ai
components/            # reusable UI components
```

---

API Doc Workspace is a portfolio MVP. It is intentionally focused on the API documentation workflow rather than being a generic AI writing tool.
