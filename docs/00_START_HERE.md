# FinTrack — AI-Powered Personal Finance Tracker
## Master brief for the coding agent (read this file first, completely)

---

## 0. For the human (Siva): how to use these files

1. Create an empty project folder, for example `fintrack/`.
2. Create `fintrack/docs/` and copy these five files into it:
   - `00_START_HERE.md` (this file)
   - `01_SETUP_AND_ARCHITECTURE.md`
   - `02_BACKEND_AND_AI_SPEC.md`
   - `03_FRONTEND_SPEC.md`
   - `04_TESTING_EVAL_DEPLOY_RESUME.md`
3. Also copy your tutorial file to `fintrack/docs/reference/tutorial.md`. It is a **style and boilerplate reference only**. Where it conflicts with these files, **these files win** (section 2 lists the known defects in the tutorial).
4. Get a free Gemini API key from Google AI Studio (https://aistudio.google.com/app/apikey). Optionally also get a free Groq key (https://console.groq.com) as a second provider. Put them in `server/.env` yourself. The agent must never ask for, print, or commit keys.
5. Open `fintrack/` in Antigravity and use this first prompt:

   > Read `docs/00_START_HERE.md` fully, then follow the phases in order. Complete one phase at a time. After each phase: run the tests, commit, append a short summary to `docs/PROGRESS.md`, and stop for my review before starting the next phase.

6. Review each phase before approving the next. You must be able to explain every module in an interview, so do not let the agent skip the explainer (Phase 7).

**Privacy note:** Google states that free-tier Gemini API content may be used to improve its products. Never send real bank statements or personal data to the LLM while developing. Use only the synthetic seed data and the synthetic eval set described in these files.

---

## 1. Mission

Build a full-stack **MERN** application where a user records or imports income and expenses and gets:

1. **Automatic transaction categorization** using an LLM with schema-constrained JSON output, a per-user learning memory, and a rule-based fallback.
2. **CSV statement import** with parsing, PII masking, de-duplication, batched categorization, and a review step before saving.
3. **Budgets** (monthly + per category) and an **AI budget optimizer** that proposes limits from the user's own history.
4. **Dashboards** (Recharts): spending trend, category distribution, income vs expense, budget progress.
5. **Insights and a spending forecast**: LLM-written insights from aggregates (with deterministic fallback) and a deterministic run-rate forecast with a budget-risk flag.
6. **Monthly reports** with PDF export.
7. **AI observability**: every LLM call is logged (provider, latency, success, fallback) and surfaced in a small stats panel.
8. A reproducible **evaluation script** that measures categorization accuracy on a labeled synthetic set. Resume numbers must come from this script.

**Tech stack:** React 18 + Vite, Redux Toolkit, Tailwind CSS 3, Recharts, Node.js 20+ (ES modules), Express, MongoDB + Mongoose, JWT + bcryptjs, Zod, PDFKit, multer + csv-parse, Jest + Supertest. LLM providers: **Google Gemini API (primary)** and **Groq (secondary, OpenAI-compatible)**, behind one provider-agnostic service. **No OpenAI dependency.**

---

## 2. Why this differs from the reference tutorial

### 2.1 Gaps (features the resume claims but the tutorial does not build)

| Gap in tutorial | What we build instead |
|---|---|
| The user picks the category manually. The LLM never categorizes transactions. | LLM categorization pipeline (`POST /api/ai/categorize`, auto-category on create, batch on import). |
| LLM prompt is "return only a JSON array of strings" and the reply is `JSON.parse`d blindly. No schema, no validation. | JSON Schema passed to the provider **and** Zod validation, one repair retry, then provider fallback, then rules. |
| No ingestion beyond a manual form. | CSV import: preview → edit → commit, with de-duplication. |
| Budget "remaining" is computed from **all-time** expenses against a **monthly** budget (logic bug). | All budget math is per calendar month. |
| "Predictive" = average of month buckets only. | Deterministic run-rate forecast for the current month + historical average. Called a forecast, not "AI". |
| No LLM observability, no cost control. | `AiCallLog`, client-side rate gate, memory cache, `GET /api/ai/stats`. |
| OpenAI (paid). | Gemini free tier primary, Groq secondary, rules last. Provider chosen by env var. |

### 2.2 Known defects in the reference tutorial (do NOT copy these)

1. **Missing spaces in template literals** (probably an artifact of the document conversion). Examples: `` `Bearer${token}` `` must be `` `Bearer ${token}` `` (otherwise every authenticated request returns 401), `` `Server running on port${PORT}` ``, `` `Period:${report.period}` `` in the PDF code, `` `...at${currency(x)}` `` in insights, and Tailwind class strings such as `` `...transition-colors${cond ? 'a' : 'b'}` `` and `` `...shadow-sm${tones[tone]}` `` where the class names get glued together. Also JSX like `isAuthenticated ?<Outlet /> :<Navigate />`. Write all of these correctly.
2. `Transactions.jsx` has no code in the tutorial, only bullet points. Build it from `03_FRONTEND_SPEC.md`.
3. **Budget bug**: all-time totals vs monthly budget (see 2.1).
4. **Tailwind version**: `npm install tailwindcss` now installs a newer major version whose setup differs from the tutorial's `tailwind.config.js` + `postcss.config.cjs` + `@tailwind` directives. Pin `tailwindcss@3.4` (see `01`).
5. `api.js` uses an absolute `http://localhost:5000/api` base URL, which makes the Vite proxy pointless and forces CORS. Use `import.meta.env.VITE_API_URL || '/api'`.
6. `refreshUser.rejected` clears the session on **any** error, including a network failure. Clear only on HTTP 401.
7. `aiService` swallows errors silently in `catch`. Always log (without secrets) and record to `AiCallLog`.
8. `bcrypt` needs native compilation and often fails on Windows. Use `bcryptjs` (same API).
9. Password minimum of 6 characters. Use 8.
10. `express-rate-limit` v7+ uses `limit`; `max` is a deprecated alias. Use `limit`.
11. CORS allow-list must accept the deployed frontend origin: make `FRONTEND_URL` a comma-separated list.
12. `axios` and `multer` are installed server-side in the tutorial but unused. We need `multer` (CSV upload); do not install `axios` on the server.

---

## 3. Resume traceability matrix

Every claim below is on the student's resume. Each must be **true, demonstrable, and testable** when the project is done. If a claim cannot be proven, the README and resume must not make it.

| # | Resume claim (paraphrased) | Delivered by | Proof |
|---|---|---|---|
| C1 | LLM automatically categorizes transactions | `services/categorization/pipeline.js`, `POST /api/ai/categorize`, category chip in the transaction form | `npm run eval:categorize` accuracy; UI demo |
| C2 | Prompt templates with structured (JSON) outputs for consistent results | `services/llm/prompts.js`, `schemas.js` (JSON Schema + Zod) | Unit tests: invalid enum / malformed JSON rejected; eval run has 0 schema violations reaching the DB |
| C3 | Personalized budget optimization / recommendations | `services/ai/budgetOptimizer.js`, `POST /api/ai/budget-optimize`, "AI suggest" button on Budget page | Test + screenshot; fallback works with no API key |
| C4 | Secure REST APIs with Node, Express, MongoDB | JWT, bcrypt, helmet, CORS allow-list, rate limits, Zod validation, per-user query scoping | Supertest isolation tests |
| C5 | Interactive React dashboards with Recharts (income, expenses, spending trends) | Dashboard + Reports pages | Screenshots, GIF |
| C6 | Transaction ingestion, automated categorization, persistent NoSQL storage | CSV import (preview/commit), on-write categorization, MongoDB | Import test with a sample CSV; dedupe test |
| C7 | Analyze raw financial data → insights and predictive budget recommendations | `services/ai/insights.js`, `services/analytics/forecast.js` | Tests + screenshots |
| C8 | Tech stack: React.js, Node.js, Express.js, MongoDB, Tailwind CSS, LLM API integrations | `package.json` files | n/a |

**Wording guard (README and resume):** do not claim "real-time" (the app categorizes **on write** and **on import**, it does not stream), do not claim "eliminates hallucinations" (we constrain and validate output), do not claim "machine-learning model" for the forecast (it is a deterministic statistical projection). Do not list OpenAI as a provider or dependency anywhere (the only mention allowed is that Groq exposes an OpenAI-compatible endpoint); the providers are Gemini (primary) and Groq (fallback).

---

## 4. Agent operating rules

1. **Work in phases** (section 5). Stop after each phase for review. Do not start a phase early.
2. **Specs win over the tutorial.** When something is unspecified, follow the tutorial's conventions, and record the decision in `docs/PROGRESS.md`.
3. **Never hardcode or print secrets.** Read config only through `server/src/config/env.js`. Provide `.env.example` files. `.env` must be git-ignored.
4. **The LLM is optional at runtime.** With no API key, or when providers fail, every feature must still work using fallbacks. Tests must run with the LLM **mocked**; no test may call a real provider.
5. **All LLM output is untrusted.** Validate with Zod, check enums, clamp numbers, and never execute or render raw model output as HTML.
6. **All transaction text is untrusted input to the LLM** (prompt-injection risk). Follow the prompt rules in `02`.
7. **Every database query that touches user data is scoped by `userId`.** Add a test proving user B cannot read or modify user A's data.
8. **Consistent API shape:** success `{ success: true, data, ... }`, failure `{ success: false, message, code? }`. Use a central error handler and `validate(schema)` middleware. Do not return Mongoose internals or stack traces in production.
9. **Readable over clever.** The student must be able to explain this code in an interview. Prefer small functions, clear names, and short comments for non-obvious decisions.
10. **Do not invent numbers.** Accuracy, latency, and similar figures come only from the eval script output (`server/eval/results.md`).
11. **Use synthetic data only** (seed script and eval set). No real personal or financial data anywhere in the repo.
12. **Commit after every phase** with a clear message. Never force-push or rewrite history.
13. If an external SDK's API differs from the snippets in these files, check the official docs (Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output) and adapt. Keep the behavior in the spec.

---

## 5. Phases and exit criteria

| Phase | Scope | Spec | Exit criteria |
|---|---|---|---|
| **P0** | Repo scaffold, tooling, env validation, health check | `01` | `npm run dev` works for server and client; `/health` returns OK; lint/test scripts exist |
| **P1** | Models, auth, transaction CRUD, budget CRUD, meta endpoint, validation, error handling | `02` §2–§5 | Auth + CRUD pass tests; user-isolation test passes |
| **P2** | Analytics: month-scoped dashboard summary, trend, forecast, monthly report + PDF | `02` §6 | Unit tests for month ranges, budget remaining, forecast; PDF downloads |
| **P3** | LLM layer, prompts, schemas, categorization pipeline, memory, rules, `AiCallLog`, AI stats | `02` §7–§9 | Categorize works with mocked provider; fallback chain tests pass; works with no key |
| **P4** | CSV import (preview + commit), dedupe | `02` §10 | Sample CSV imports; re-import yields 100% duplicates; bad rows reported |
| **P5** | Budget optimizer, insights, security hardening pass | `02` §11–§13 | Endpoints tested; deterministic fallbacks verified; security checklist ticked |
| **P6** | Frontend (all pages and flows) | `03` | Every user flow in `03` §9 works end to end against the real server |
| **P7** | Eval script, seed script, tests, README, EXPLAINER, screenshots | `04` §1–§5 | `npm run eval:categorize` produces `eval/results.md`; `npm test` green; README complete |
| **P8** | Deployment & Cloud Production Readiness | `04` §6 | Live URLs work with the seeded demo account |

---

## 6. Definition of done (whole project)

- All eight claims C1–C8 are demonstrable (section 3).
- `npm test` passes in `server/` (LLM mocked) and the client builds with no errors or warnings that matter.
- The app works end to end with **no** LLM key (fallbacks) and with a Gemini key.
- `server/eval/results.md` exists and the README quotes only numbers from it.
- README has: overview, architecture diagram (Mermaid), setup steps, env var table, API table, screenshots or GIF, eval results, limitations, and the live demo link.
- `docs/EXPLAINER.md` explains each module in plain language, with 15 likely interview questions and answers.
- No secrets in git history. `.env.example` exists for server and client.
