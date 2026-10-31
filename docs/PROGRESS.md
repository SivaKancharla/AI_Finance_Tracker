# FinTrack Development Progress

## Phase P0: Setup, Tooling & Architecture Scaffold
**Status:** Completed

### Deliverables & Accomplishments
1. **Repository Layout & Git Configuration**:
   - Initialized Git repository.
   - Configured `.gitignore` covering `node_modules`, `.env`, `.env.*` (preserving `.env.example`), build artifacts, coverage, and logs.
   - Created workspace root `package.json` with unified execution scripts.

2. **Server Scaffold (`server/`)**:
   - Initialized ES-module based backend with Node.js 20+.
   - Installed all required runtime dependencies: `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `zod`, `pdfkit`, `multer`, `csv-parse`, `@google/genai`.
   - Setup `server/src/config/env.js` with Zod schema validation, numeric coercion, strict required checks on `MONGODB_URI` and `JWT_SECRET`, optional clean handling of LLM API keys (stripping placeholders), and frozen exports.
   - Setup `server/src/config/db.js` for robust Mongoose database connection.
   - Setup `server/src/app.js` with Helmet, CORS (allowing comma-separated origins), JSON parsers, central rate limiter with test-environment bypass, `/health` endpoint, and centralized error handling middleware.
   - Setup `server/src/server.js` with graceful shutdown signal handlers.
   - Configured `server/.env.example` and created `server/.env` with user-supplied GROQ API Key and development configurations.

3. **Client Scaffold (`client/`)**:
   - Initialized React 18 + Vite frontend with React Router v6, Redux Toolkit, React-Redux, Axios, Recharts.
   - Pinned `tailwindcss@3.4.14` with PostCSS and Autoprefixer to adhere to the tutorial design spec without v4 migration incompatibilities.
   - Created `vite.config.js` with dev proxy `/api` routing to `http://localhost:5000`.
   - Configured `client/.env.example` and `client/.env`.
   - Verified that client builds cleanly with zero errors (`npm run build`).

4. **Testing & Validation**:
   - Test runner decision: **Jest with ES Modules (`node --experimental-vm-modules`)**. It passed all 5 initial tests in ~1 second without requiring secondary runners.
   - Integration tests in `server/tests/health.test.js` verify:
     - `GET /health` returns HTTP 200 with `{ status: "ok" }`.
     - `env.js` validation fails fast with a clear error message when `JWT_SECRET` is missing.
     - `env.js` validation fails when `MONGODB_URI` is missing.
     - Minimal configuration succeeds with correct defaults.
     - Placeholder API keys are sanitized to `null`.

### Technical Decisions Recorded
- **Jest vs Vitest**: Selected Jest with `--experimental-vm-modules` as specified in the primary spec. Integration with Supertest and MongoDB Memory Server runs smoothly and fast.
- **Tailwind Version**: Pinned to Tailwind CSS `3.4.14` to ensure exact compatibility with `@tailwind` directives and custom configuration patterns.

---

## Phase P1: Core Data Models, Auth, CRUD & User Isolation
**Status:** Completed

### Deliverables & Accomplishments
1. **Canonical Constants (`server/src/constants/categories.js`)**:
   - Defined `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `ALL_CATEGORIES`, `PAYMENT_METHODS`, and `CATEGORY_SOURCES`.
   - Single source of truth serving both backend validation and client consumption.

2. **Data Models (`server/src/models/`)**:
   - `User`: Email uniqueness, regex format validation, bcryptjs password hashing (cost 10) on save, password excluded by default (`select: false`), safe object serialization.
   - `Transaction`: Multi-key compound indexes (`{ userId: 1, transactionDate: -1 }`, `{ userId: 1, type: 1, transactionDate: -1 }`, `{ userId: 1, category: 1 }`), partial unique index for deduplication (`{ userId: 1, dedupeHash: 1 }`), category-to-type validation rules.
   - `Budget`: Monthly budget and category budget limits with strict rejection of duplicate category entries.
   - `CategoryMemory`: Per-user merchant memory (`userId + key` unique compound index), tracking confidence, hits, and source (`'user' | 'llm'`).
   - `AiCallLog`: Structured observability schema logging task, provider, model, latency, tokens/chars, error types, fallback flags, and a 30-day Mongo TTL expiration index. Stored metadata strictly excludes raw user texts.

3. **Authentication & Security (`server/src/controllers/auth.controller.js`, `server/src/middleware/`)**:
   - Endpoints: `POST /signup`, `POST /login`, `GET /me`, `PUT /profile`, `PUT /password`, `GET /stats`.
   - Security: Generic, timing-consistent error message (`Invalid email or password`) for unknown email and bad password alike.
   - `protect` middleware parsing `Bearer <token>` with generic 401 response on any failure path.
   - Rate limiting: Stricter `authLimiter` (20 req / 15 min / IP).

4. **Transaction & Budget CRUD (`server/src/controllers/`)**:
   - `POST /api/transactions`: Auto-categorization pipeline integration with rule-based fallback and memory lookup. Rejects invalid category/type pairings.
   - `GET /api/transactions`: Fully scoped by `userId`, paginated (`page`, `limit`), regex-escaped text search, category/type/date filtering, and whitelisted sort order.
   - `PUT /api/transactions/:id`: User-scoped update. Automatically detects category corrections and commits learning into `CategoryMemory` with `source: 'user'` and confidence `1.0`.
   - `DELETE /api/transactions/:id`: User-scoped deletion.
   - `GET /api/meta`: Public canonical constant delivery.
   - `GET /api/budget`, `POST /api/budget`, `PUT /api/budget`: User-scoped budget management.

5. **Testing & Verification**:
   - Integrated `mongodb-memory-server` with Jest for completely isolated, zero-mock database integration testing.
   - Total tests passing: **48 tests across 7 test suites**.
   - Verified tests:
     - `auth.test.js`: Full lifecycle, duplicate detection, bad passwords, generic error responses, password updates.
     - `transactions.test.js`: Manual categorization, auto-categorization fallback, type validation, search filtering with regex characters, sorting, and `CategoryMemory` learning on update.
     - `budget.test.js`: Default zero values, upsert, duplicate category rejection, updates.
     - `isolation.test.js`: **Strict verification that User B cannot list, retrieve, update, or delete User A's transactions, nor read or overwrite User A's budget.**
     - `normalize.test.js`: 12 test cases verifying merchant normalization, prefix stripping, punctuation removal, and token truncation.
     - `meta.test.js` & `health.test.js`: Constant delivery and environment safety.

6. **Interview Preparation & Study System (`docs/study/`)**:
   - Initialized full interview coach system: `README.md`, `00_PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `INTERVIEW_QA_BANK.md`, `CONCEPTS_CHEATSHEET.md`, `STORY_BANK.md`, `DEMO_SCRIPT.md`, `WEAK_SPOTS.md`, `REVISION_SHEET.md`.
   - Completed detailed phase study documents:
     - `docs/study/phases/P0_scaffold_tooling.md`
     - `docs/study/phases/P1_models_auth_crud.md`
   - Configured persistent Antigravity rules in `GEMINI.md`, `AGENTS.md`, and `docs/MASTER_PROMPT.md`.

---

## Phase P2: Analytics, Spending Trend, Forecast & PDF Export
**Status:** Completed

### Deliverables & Accomplishments
1. **Timezone-Aware Date Range Engine (`server/src/services/analytics/dateRange.js`)**:
   - `getMonthRange(year, month, tzOffsetMinutes)` calculates UTC start and end dates (`end` exclusive) for any calendar month in IST (UTC+05:30).
   - Accurately captures end-of-month IST boundary conditions (e.g. 23:30 IST on the last day of the month belongs to that month; 00:30 IST on the 1st belongs to the next).
   - Handles leap year Februaries (29 days in 2024 vs 28 in 2025).
   - Generates rolling $N$-month chronological keys (`lastNMonthKeys(6, fromMonthKey)`) cleanly rolling over year boundaries.

2. **Deterministic Financial Summary & Trend (`server/src/services/analytics/summary.js`)**:
   - Pure, zero-side-effect functions: `summarizeMonth` and `buildTrend`.
   - `summarizeMonth`: Calculates `totalIncome`, `totalExpense`, `savings`, `monthlyBudget`, `budgetRemaining` (`null` if no budget, preventing silent substitution with savings), `budgetUsedPercent`, `categoryBreakdown` (sorted descending with percentages), and `categoryBudgetStatus` with per-category limit, spent, percent, and `over` flags.
   - `buildTrend`: Builds a 6-month historical trend array guaranteed to contain all 6 months (filling 0 for inactive months).
   - All monetary values formatted to 2 decimals using consistent rounding (`round2`).

3. **Statistical Run-Rate Spending Forecast (`server/src/services/analytics/forecast.js`)**:
   - Deterministic projection algorithm: `projectedMonthEnd = (spentToDate / daysElapsed) * daysInMonth`.
   - Historical blending: Calculates 3-month complete historical mean and blends with run-rate, weighting the run-rate progressively higher as the month advances (`w = daysElapsed / daysInMonth`).
   - Dynamic confidence meter (30% to 90%): Combines baseline months of data, day progression bonus (+10), and penalizes high month-to-month volatility using coefficient of variation ($CV$).
   - Flags `budgetRisk` when `predictedExpense > monthlyBudget`.

4. **Dashboard, Forecast & PDF Report APIs**:
   - `GET /api/dashboard/summary?month=YYYY-MM`: Returns month summary, 6-month trend, top 5 recent transactions, and spending forecast in a single scoped database query.
   - `POST /api/ai/predict`: Protected forecast endpoint.
   - `GET /api/reports/monthly`: Supports `format=json` and `format=pdf`. Uses `pdfkit` to generate streaming PDF downloads with financial summaries, category splits, and transaction listings (truncated cleanly with count note at 40 rows).

5. **Testing & Verification**:
   - Total test count expanded to **71 passing tests across 11 test suites** (100% green in ~29s).
   - Tests verify:
     - `dateRange.test.js`: IST timezone boundary offsets, leap years, string parsing, rolling month sequences.
     - `summary.test.js`: Financial totals, budget math, null budgetRemaining checks, category breakdown, trend filling.
     - `forecast.test.js`: Zero-history run rates, 3-month blending, day-weighting, confidence calibration, volatility penalties, and budget risk flags.
     - `analyticsEndpoints.test.js`: Full dashboard summary responses, forecast payloads, and valid PDF streaming headers/buffers (`%PDF-`).

---

## Real Problems Encountered & Fixed (Build Log)

### Problem 1: Google GenAI Package Version Incompatibility (P0)
- **Symptom**: `npm install` failed with `npm error notarget No matching version found for @google/genai@^0.1.2`.
- **Cause**: Google's new official `@google/genai` Node SDK releases began at `0.2.0`.
- **Fix**: Updated `server/package.json` to `"@google/genai": "^0.2.0"` and verified with npm dist-tags.
- **Lesson**: Check npm registry dist-tags (`npm view <pkg> versions`) when integrating newly-released SDKs.

### Problem 2: Jest Test Hook Timeout During Mongo Download (P1)
- **Symptom**: `tests/transactions.test.js` failed with `Exceeded timeout of 5000 ms for a hook in beforeAll`.
- **Cause**: On initial test run, `mongodb-memory-server` had to download the official 600MB MongoDB binary to cache locally. The download took ~45s, exceeding Jest's default 5000ms hook timeout.
- **Fix**: Added `jest.setTimeout(30000)` in `server/tests/setup.js`.
- **Lesson**: Large setup tasks like test container binary downloads must be accounted for in test runner timeout settings.

### Problem 3: Supertest Boolean Short-Circuit in Test Assertion (P2)
- **Symptom**: `tests/analyticsEndpoints.test.js` failed with `Expected: 25000, Received: 2500`.
- **Cause**: An assertion written as `expect(data.summary.totalExpense).toBe(25000 || 2500)` short-circuited to `25000` because non-zero numbers are truthy in JS, whereas the test fixture only spent 2500.
- **Fix**: Replaced with exact assertion `expect(data.summary.totalExpense).toBe(2500)`.
- **Lesson**: Avoid boolean operators (`||`) inside test equality assertions.

### Problem 4: Windows MongoMemoryServer Re-spawn Delay (P2)
- **Symptom**: When running 11 test suites in band, `tests/budget.test.js` failed with `GenericMMSError: Instance failed to start within 10000ms`.
- **Cause**: Consecutive process spawning and socket cleanups on Windows can occasionally exceed 10,000ms when multiple in-memory mongod instances are created in sequence.
- **Fix**: Configured `launchTimeout: 60000` in `MongoMemoryServer.create()` and set `mongoServer = null` on stop in `server/tests/setup.js`.
- **Lesson**: Windows process port releasing has higher latency than Linux; configure generous process launch timeouts for local test databases.

---

## Phase P3: LLM Service Layer, Resilience & Categorization Pipeline
**Status:** Completed

### Deliverables & Accomplishments
1. **PII Masking & Sanitization (`server/src/services/categorization/piiMask.js`)**:
   - Built a local regex sanitization engine stripping emails, Indian 10-digit phones (with optional +91 or 0 prefix), PAN card numbers (5-letter 4-digit 1-letter format), 12-digit Aadhaar patterns, and bank account / card runs of 9+ digits before any string reaches third-party LLMs or log files.
   - Preserves benign merchant titles and numbers under 9 digits.

2. **Structured LLM Schemas & Prompts (`server/src/services/llm/`)**:
   - `schemas.js`: Zod schemas (`CategorizeResultSchema`) automatically converted to JSON Schema (`CategorizeJsonSchema`) via `zod-to-json-schema`.
   - `prompts.js`: `PROMPT_VERSION = 'v1'`, anti-injection system prompt, and prompt builder isolating untrusted user input inside `<transactions>` XML tags.

3. **Multi-Provider Fallback & Resilience Chain (`server/src/services/llm/index.js`)**:
   - Implemented `generateStructured` supporting primary (Groq / Gemini) and secondary fallbacks.
   - Client-side `RateGate` (10 RPM queue) in `rateGate.js` preventing outbound quota exhaustion.
   - Exponential backoff with randomized jitter on HTTP 429 and 5xx errors (`Math.pow(2, attempt) * 500 + jitter`).
   - Automated single-attempt self-repair feedback loop (`attemptRepair`) when LLM outputs invalid JSON or schema violations.
   - Defensive stripping of markdown backtick code blocks.
   - Structured logging to `AiCallLog` recording task, provider, model, latency, char counts, and error types without ever persisting raw user prompts.

4. **Categorization Pipeline (`server/src/services/categorization/pipeline.js`)**:
   - 4-Tier fallback pipeline:
     1. `CategoryMemory`: Local MongoDB lookup (2ms) for recurring merchants with active hit counting.
     2. `generateStructured`: Batched LLM inference (up to 10 items per chunk) with Groq (Llama 3.3 70B) or Gemini 2.5 Flash.
     3. Active Learning: High-confidence LLM results ($\ge 0.70$) saved to `CategoryMemory` while strictly preserving `source: 'user'` records from automated override.
     4. Deterministic Rules: Keyword dictionary fallback (`ruleCategorizer.js`) when LLM is unavailable.
     5. Default fallback: Assigns `'Other'` with `needsReview: true`.

5. **AI API Endpoints & Observability (`server/src/controllers/ai.controller.js`, `server/src/routes/ai.routes.js`)**:
   - `POST /api/ai/categorize`: Live single-transaction categorization for add/edit form suggestions, protected by JWT auth and `aiLimiter`.
   - `GET /api/ai/stats`: 30-day AI observability metrics computing total calls, success rate, fallback rate, per-provider call volume, average latency, p95 latency (`calculatePercentile`), categorization source breakdown, and total memory entries.
   - `POST /api/ai/predict`: Spending forecast endpoint.

6. **Testing & Verification**:
   - Test count expanded from 71 to **104 passing tests across 17 test suites** (100% green in ~74s).
   - Test suites verify:
     - `piiMask.test.js`: All Indian PII masks, phone formats, benign text preservation.
     - `promptsAndSchemas.test.js`: Schema validation, prompt structure, XML tag isolation.
     - `percentile.test.js`: Exact p95 calculations, empty arrays, edge clamping.
     - `llmLayer.test.js`: Mocked provider calls, schema repairs, provider fallback, rate gate queue, logging to `AiCallLog`.
     - `categorizationPipeline.test.js`: Full 4-tier chain, memory resolution, LLM learning, user source preservation, rule fallback, default fallback.
     - `aiEndpoints.test.js`: Auth protection, 400 validation, live categorization, AI stats aggregation.

---

## Real Problems Encountered & Fixed (Build Log - Continued)

### Problem 5: Module Evaluation Mocking Trap in ES Modules (P3)
- **Symptom**: Running `tests/llmLayer.test.js` unexpectedly made a live network call to Groq's servers and threw `Groq HTTP 404: model not found`, ignoring `jest.spyOn(groqProvider, 'call')`.
- **Cause**: In `server/src/services/llm/index.js`, `PROVIDERS.groq.call` bound `groqProvider.call` at top-level module evaluation time. When Jest spied on `groqProvider.call`, the bound reference in `PROVIDERS` was unchanged.
- **Fix**: Wrapped provider call dispatchers in arrow functions: `call: (...args) => groqProvider.call(...args)`.
- **Lesson**: In ES modules, defer object property function resolution to call-time using closures/arrow functions so test spies can intercept them.

### Problem 6: PII Regex Swallowing Preceding Whitespace (P3)
- **Symptom**: Phone number masking in `piiMask.js` converted `"Call me at 9876543210"` into `"Call me at[PHONE]"` (missing space).
- **Cause**: The optional country-code separator `[ -]?` matched the space preceding the 10-digit number.
- **Fix**: Changed the regex to `(?:\+91[\s-]?|\b0[\s-]?|\b91[\s-]?)?[6-9]\d{9}\b`, requiring whitespace to be preceded by a recognized dialing prefix.
- **Lesson**: Optional prefixes with trailing whitespace matchers must be grouped together to prevent matching benign boundary whitespace.

### Problem 7: Asynchronous CategoryMemory Learning in Test Race (P3)
- **Symptom**: Assertions checking `CategoryMemory` immediately following `categorizeTransactions` received `null`.
- **Cause**: The memory update was executed fire-and-forget without `await`.
- **Fix**: Made memory persistence properly `await`ed and added an explicit check for `source !== 'user'` to avoid duplicate key errors on `{ userId: 1, key: 1 }`.
- **Lesson**: Even background learning logic should be awaitable or sequentially coordinated in test environments.

---

## Phase P4: CSV Statement Import, Deduplication & Active Learning
**Status:** Completed

### Deliverables & Accomplishments
1. **Multer Memory Upload & Security (`server/src/middleware/upload.js`)**:
   - In-memory buffer upload with `IMPORT_MAX_BYTES` cap (1MB).
   - Strict mimetype and `.csv` extension filtering.
   - Clean, standardized HTTP 400 error responses for oversized files or non-CSV payloads.

2. **Indian Date Parser Engine (`server/src/services/import/dateParse.js`)**:
   - Parses `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, `YYYY/MM/DD`, `DD MMM YYYY`, and `DD-MMM-YY`.
   - Never calls `new Date(str)` directly; enforces mathematical calendar validity (rejects 31 Feb, non-leap Feb 29).
   - Anchors dates to IST midnight (UTC+05:30) and returns canonical `YYYY-MM-DD`.

3. **CSV Statement Parser (`server/src/services/import/csvParser.js`)**:
   - Uses `csv-parse` with `columns: true`, `trim: true`, `skip_empty_lines: true`, and BOM tolerance.
   - Flexible header resolver mapping HDFC, ICICI, SBI synonyms (e.g. `Txn Date`, `Withdrawal/Deposit`, `Narration`).
   - Clean amount extractor stripping currency symbols (`₹`, `Rs.`, `INR`), commas, and signed values into positive floats.
   - Row-level validation separating valid records from invalid ones with descriptive error arrays.

4. **Occurrence-Indexed Deduplication Engine (`server/src/services/import/dedupe.js`)**:
   - Formula: `sha1(userId | YYYY-MM-DD | amount.toFixed(2) | type | normalizedTitle | occurrenceIndex)`.
   - Appends running counter to identical same-day purchases so genuine repeats are preserved while re-importing identical files yields 100% duplicate rejection.

5. **Two-Stage Import Endpoints (`server/src/controllers/import.controller.js`)**:
   - `POST /api/transactions/import/preview`:
     - Parses CSV and runs deduplication check in MongoDB.
     - Runs Phase P3 categorization pipeline on uncategorized non-duplicate rows.
     - Returns preview table with counts (`total`, `valid`, `invalid`, `duplicates`, `needsReview`, `bySource`).
     - **Writes zero documents to MongoDB.**
   - `POST /api/transactions/import/commit`:
     - Server-side hash recomputation and duplicate skipping.
     - Unordered bulk insert using `Transaction.insertMany(docs, { ordered: false })` catching E11000 duplicate keys.
     - Active learning: rows with user category adjustments (`edited: true`) write `CategoryMemory` with `source: 'user'` and confidence `1.0`.

6. **Synthetic Demo Statement (`server/eval/sample_statement.csv`)**:
   - 41 realistic Indian transactions (HDFC style) with legitimate same-day repeats, bad rows, and pre-categorized entries for testing and live interview demos.

7. **Automated Testing**:
   - Test count expanded from 104 to **129 passing tests across 21 test suites** (100% green in ~74s).
   - Added test suites:
     - `dateParse.test.js` (6 tests): leap years, Indian formats, invalid dates.
     - `dedupe.test.js` (4 tests): stable hashes, user isolation, occurrence indexes, repeat imports.
     - `csvParser.test.js` (6 tests): debit/credit columns, currency stripping, row errors.
     - `importEndpoints.test.js` (9 tests): preview multipart, oversize/non-csv rejection, dedupe detection, commit insertion, re-commit 100% duplicates, active learning.

---

## Real Problems Encountered & Fixed (Build Log - Continued)

### Problem 8: Currency Abbreviation Word Boundary Matching in CleanAmount (P4)
- **Symptom**: `cleanAmount('Rs. 450')` returned `null` instead of `450`.
- **Cause**: The regex `\b(rs\.?|inr)\b` failed because in regular expressions, a non-word character like `.` in `Rs.` is not followed by a word boundary before a space.
- **Fix**: Replaced regex with `/(?:^|[^\w])(?:rs\.?|inr)\s*/gi`.
- **Lesson**: Do not rely on `\b` word boundaries adjacent to punctuation characters like dots or slashes.

### Problem 9: Multer File Size Error Propagation (P4)
- **Symptom**: When an uploaded file exceeded `IMPORT_MAX_BYTES`, Multer threw a raw `LIMIT_FILE_SIZE` error that reached the central error handler as HTTP 500.
- **Cause**: Multer error was unhandled in route middleware.
- **Fix**: Wrapped `upload.single('file')` in `server/src/middleware/upload.js` (`uploadCsv`), catching `LIMIT_FILE_SIZE` and returning a clean HTTP 400 response.
- **Lesson**: Wrap third-party stream/multipart middlewares in Express error interceptors to guarantee clean 4xx client errors.





---

## Phase P5: Budget Optimizer, Financial Insights & Security Hardening
**Status:** Completed

### Deliverables & Accomplishments
1. **Zod & JSON Schemas Finalization (`server/src/services/llm/schemas.js`)**:
   - `BudgetOptimizeSchema`: `suggestedMonthlyBudget`, `categoryLimits` (with `category`, `suggestedLimit`, `reason`), and `tips` (max 4).
   - `InsightsSchema`: `insights` array (1 to 6 items) with `title` (<= 80 chars), `detail` (<= 280 chars), `severity` (`info`, `warning`, `critical`), and optional `category`.
   - Single-source-of-truth export generating clean JSON schemas via `zodToJsonSchema`.

2. **Deterministic Budget Repair & Heuristics (`server/src/services/ai/budgetOptimizer.js`)**:
   - `repairBudgetSuggestions(data, { averageIncome })`:
     - Clamps negative values to ₹0 and rounds all figures to whole rupees.
     - Drops duplicate or invalid categories not matching `EXPENSE_CATEGORIES`.
     - Hard constraint capping: `suggestedMonthlyBudget` cannot exceed verified `averageIncome`.
     - Proportional scaling: if the sum of category limits exceeds `suggestedMonthlyBudget`, scales category limits down proportionally (`lim * (budget / sumLimits)`).
     - Enforces array boundaries on actionable tips (max 4).
   - `buildHeuristicBudget({ averageIncome, averageExpense, categoryAverages })`:
     - Deterministic 100% / 90% / 95% allocation rules:
       - Fixed essentials (`Rent`, `Bills`, `Education`, `Healthcare`) = 100% of historical average.
       - Discretionary flexible spend (`Food`, `Shopping`, `Entertainment`, `Transport`) = 90% of historical average (10% savings trim).
       - Other categories = 95% of historical average.
     - Ensures FinTrack can always provide high-quality budget plans even when LLM quotas are exhausted or models are unreachable.

3. **Financial Insights Engine & Cache (`server/src/services/ai/insights.js`)**:
   - `buildHeuristicInsights(facts)`:
     - Deterministic rule engine deriving actionable insights from mathematical aggregates:
       - Budget usage alerts (critical >= 100%, warning >= 80%, info on track).
       - Per-category overspend alerts for categories exceeding their individual budget.
       - Category concentration risk if a single category exceeds 25% (info) or 40% (warning) of monthly spend.
       - Run-rate projection risk using Phase P2 linear forecast.
       - Savings rate milestone or warning.
   - Free-tier protection cache (`insightsCache`):
     - In-memory 10-minute TTL keyed by `userId:monthKey`.
     - Eliminates duplicate LLM calls on dashboard re-renders and page navigation.
     - Supports cache invalidation via `force=1` or `{ force: true }`.

4. **AI Controller & Endpoints (`server/src/controllers/ai.controller.js`, `server/src/routes/ai.routes.js`)**:
   - `POST /api/ai/budget-optimize`:
     - Scopes transactions to the last 3 complete calendar months in IST.
     - Computes monthly average income, expense, and category averages.
     - Returns `reason: 'not_enough_data'` when zero expense history exists.
     - Returns structured recommendations with provider attribution (`groq`, `gemini`, or `heuristic`).
   - `POST /api/ai/insights`:
     - Evaluates target month (defaults to current month in IST).
     - Assembles multi-month historical facts, forecast run-rate, and budget status.
     - Delivers grounded, prioritized insights.
   - Security: Protected by JWT auth, rate limiting (`aiLimiter`), and strict `userId` scoping.

5. **Automated Testing & Full Suite Verification**:
   - Test count expanded from 129 to **147 passing tests across 24 test suites** (100% green in ~58s).
   - Added test suites:
     - `budgetOptimizer.test.js` (6 tests): repair rules, income capping, proportional scaling, heuristic allocation, LLM fallback.
     - `insights.test.js` (6 tests): heuristic alerts, budget overrun, run-rate risk, 10-minute cache hit/force bypass, LLM fallback.
     - `aiEndpointsP5.test.js` (5 tests): auth protection, empty history handling, budget optimization, insights generation, heuristic fallback on double LLM outage.
   - Updated `promptsAndSchemas.test.js` to validate finalized P5 schemas.

---

## Real Problems Encountered & Fixed (Build Log - Continued)

### Problem 10: Canonical Category Mismatch in Heuristic Budgeting (P5)
- **Symptom**: `buildHeuristicBudget` dropped housing expenses and `tests/budgetOptimizer.test.js` failed with `TypeError: Cannot read properties of undefined (reading 'suggestedLimit')`.
- **Cause**: Category was hardcoded as `'Housing'` in fixed categories set and test fixtures, whereas the canonical category constant defined in `categories.js` is `'Rent'`.
- **Fix**: Aligned fixed category sets and test seeds to use canonical category names (`Rent`, `Bills`).
- **Lesson**: Always cross-reference category enum constants across models, parsers, and AI prompt schemas rather than using informal category labels.

### Problem 11: Schema Drift in promptsAndSchemas.test.js (P5)
- **Symptom**: `promptsAndSchemas.test.js` failed validating `BudgetOptimizeSchema` and `InsightsSchema` during full suite run.
- **Cause**: The test was checking draft schemas from Phase P3 (`limit` instead of `suggestedLimit`, `savingsTips` instead of `tips`, `message` instead of `detail`).
- **Fix**: Updated `promptsAndSchemas.test.js` to validate the finalized Phase P5 schema definitions.
- **Lesson**: Whenever schemas evolve from placeholder draft to production spec, update unit test schema fixtures in tandem.

---

## Phase P6: React Frontend (Vite + Tailwind CSS + Redux Toolkit + Recharts)
**Status:** Completed

### Deliverables & Accomplishments
1. **Tooling & Asset Configuration (`client/`)**:
   - Pinned `tailwindcss@3.4.14` with `@tailwind` directives in `index.css`.
   - Integrated `lucide-react` for clean, professional SVG icons.
   - Copied synthetic `sample_statement.csv` (41 rows) to `client/public/` for one-click demo downloads.
   - Tested production bundling with Vite: `npm run build` compiles 2,992 modules in ~17s with zero errors.

2. **API & Service Layer (`client/src/services/`)**:
   - `api.js`: Centralized Axios instance with `baseURL = import.meta.env.VITE_API_URL || '/api'`.
   - Request interceptor: Strictly attaches `Authorization: Bearer ${token}` with required space.
   - Response interceptor: Clears token and broadcasts `auth:unauthorized` event **strictly on HTTP 401** (temporary network errors never clear session).
   - Fully typed client service modules: `authService`, `transactionService`, `importService`, `budgetService`, `dashboardService`, `reportService`, `aiService`, `metaService`.

3. **Global State Management (`client/src/redux/`)**:
   - Slices:
     - `authSlice`: Synchronous session hydration from `localStorage` to avoid login-page flashes; `refreshUser` keeps session on network errors; `loginUser`, `signupUser`, `logout`, `updateProfileThunk`.
     - `metaSlice`: Caches expense/income categories and payment methods with offline fallback arrays.
     - `transactionSlice`: Manages paginated ledger items, filter states (`search`, `type`, `category`, `sort`, `page`), and CRUD thunks.
     - `budgetSlice`: Tracks `monthlyBudget` and `categoryBudgets`.
     - `insightsSlice`: Houses AI insights, provider badge, forecast metrics, and 30-day reliability statistics.
     - `uiSlice`: Toast notification queue supporting auto-dismissing feedback messages.

4. **Reusable UI System & Custom Hooks (`client/src/components/common/`, `client/src/hooks/`)**:
   - `useDebounce`: Custom hook for 400ms filter search and 600ms live AI categorization.
   - `useMonthParam`: Manages `?month=YYYY-MM` URL search param with IST default and prev/next month traversal.
   - Reusable components: `Button` (5 variants with loading spinners), `Input`, `Select`, `Modal` (accessible with Esc key trap), `ConfirmDialog`, `Badge` (with source chips: AI, Learned, Rule, Review), `ToastContainer`, `Pagination`, `EmptyState`, `ErrorBanner`, and `SkeletonCard`/`SkeletonChart`.

5. **Application Pages & User Flows (`client/src/pages/`)**:
   - `Login` & `Signup`: Clean auth forms with inline validation, password min 8, and one-click demo credentials button.
   - `Dashboard`: 4 summary metric cards, monthly budget progress bar, 6-month historical spending trend area chart, category donut chart, income vs expense bar chart, run-rate forecast risk banner, and recent transactions list.
   - `Transactions`: Complete ledger with URL-synced debounced filters, source badges, pagination, delete confirm dialog, and an interactive Add/Edit modal featuring **live AI categorization suggestions** (`POST /api/ai/categorize`) with `AbortController` cancellation.
   - `Import`: 3-step statement wizard (Upload dropzone $\to$ Review table with category editing, dedupe flags, and confidence ratings $\to$ Commit summary with active learning).
   - `Budget`: Monthly budget input, per-category limit rows with current month progress, and **AI Suggest Budget** modal with 100/90/95 heuristic fallback.
   - `Insights`: Dynamic financial health cards (info/warning/critical), run-rate forecast panel, and 30-day AI reliability telemetry.
   - `Reports`: Monthly summary, category bar chart, transaction table, and streaming **Export PDF** download (`finance-report-YYYY-MM.pdf`).
   - `Profile`: Update name/email, change password, and view account stats.

6. **Verification & Build Status**:
   - `npm run build` in `client/` succeeded in ~17.06s.
   - `npm test` in `server/` passed 100% across all 24 test suites (147 tests green).


---

## Phase P7: Offline Evaluation Set, Benchmark Results, Seed Script & Production Documentation
**Status:** Completed

### Deliverables & Accomplishments
1. **Hand-Labeled Synthetic Benchmark Dataset (`server/eval/labeled_transactions.json`)**:
   - 85 hand-labeled Indian transactions covering all 10 expense categories, income streams, and 15+ hard cases (UPI handles, abbreviations, mixed case).
   - 4 deliberate adversarial prompt-injection test vectors (`t082` - `t085`) to verify instruction defense.

2. **Evaluation Harness (`server/eval/run_categorization_eval.js`)**:
   - Implemented multi-mode evaluation runner supporting `--mode hybrid` (default), `--mode llm`, and `--mode rules`.
   - Employs 10-item batching mirroring production CSV import.
   - Added a 3,000ms delay between batches to respect free-tier Token-Per-Minute (TPM) limits on Groq.
   - Computes overall accuracy, non-flagged accuracy, per-category Precision/Recall/F1, top confusion pairs, confidence calibration buckets, and injection immunity.

3. **Measured Benchmark Results (`server/eval/results.md`)**:
   - **Overall Accuracy**: **87.06%** (74/85) — passed target $\ge 85\%$.
   - **Non-Flagged Transaction Accuracy**: **93.06%** (67/72) — passed target $\ge 90\%$.
   - **High-Confidence ($>0.8$) Accuracy**: **95.65%** (66/69).
   - **Prompt Injection Resilience**: **0 / 4 Obeyed (100% Defense Rate)**.
   - **Mean Call Latency**: 2,071.63 ms; p95 latency: 2,809 ms.
   - **Zero Schema Violations** reached database.

4. **Idempotent Demo Data Seed Script (`server/src/scripts/seed.js`)**:
   - Idempotently creates demo user `demo@fintrack.dev` (`Demo@1234`).
   - Seeds 6 months of historical transactions (~130 items: salary, rent, groceries, dining, transport, subscriptions, SIP investments).
   - Sets monthly budget (₹60,000) and 7 category limits.
   - Populates 4 `CategoryMemory` active learning entries and 4 `AiCallLog` records.
   - Enforces safety guard: refuses to run in `NODE_ENV=production` without explicit `--force` flag.

5. **Automated Seed Test Suite (`server/tests/seed.test.js`)**:
   - 4 automated tests verifying clean seeding, idempotency, production block, and `--force` bypass.

6. **Production-Grade Root Documentation (`README.md`)**:
   - Full overview, 30s pitch, Mermaid architecture diagram, 5-box whiteboard diagram, tech stack table, step-by-step local setup, environment table, API endpoint reference, real benchmark results, honest limitations, and demo credentials.

7. **Study & Interview Preparation (`docs/study/`)**:
   - Created `docs/study/phases/P7_eval_seed.md` (13-section template).
   - Updated `00_PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `INTERVIEW_QA_BANK.md` (Q36-Q40), `CONCEPTS_CHEATSHEET.md`, `STORY_BANK.md` (Story 9), and `REVISION_SHEET.md`.

8. **Testing & Build Verification**:
   - Backend: **151 passing tests across 25 test suites** in Jest ESM mode (100% green in ~65s).
   - Frontend: `npm run build` compiled 2,992 modules in ~10.74s with 0 errors.

---

## Real Problems Encountered & Fixed (Build Log - Continued)

### Problem 12: Groq Model Availability & 8000 TPM Throttling (P7)
- **Symptom**: `llama-3.3-70b-versatile` returned HTTP 404 (`model_not_found`). After switching to `openai/gpt-oss-120b`, rapid consecutive batches failed with HTTP 429 (`tokens per minute (TPM) limit 8000 reached`).
- **Cause**: The user's Groq key is provisioned for `openai/gpt-oss-120b` and `qwen/qwen3.8-27b`. Each batch prompt was ~1,700 tokens; 9 consecutive batches requested ~10,000 tokens within 15 seconds, exceeding the free-tier TPM window.
- **Fix**: Configured `GROQ_MODEL=openai/gpt-oss-120b` in `server/.env` and added a 3,000ms pacing delay between batches in `run_categorization_eval.js`.
- **Lesson**: Batch AI evaluation scripts must pace requests to accommodate rolling Token-Per-Minute quotas on LLM providers.

### Problem 13: Schema Casting Error in Offline AI Call Logging (P7)
- **Symptom**: Evaluation script failed with `AiCallLog validation failed: userId: Cast to ObjectId failed for value "eval-user"`.
- **Cause**: `AiCallLog` defines `userId` as `mongoose.Schema.Types.ObjectId`, but the evaluation runner passed string `'eval-user'`.
- **Fix**: In `llm/index.js`, added validation `mongoose.Types.ObjectId.isValid(data.userId) ? data.userId : null` and checked `connection.readyState === 1` before writing logs.
- **Lesson**: Telemetry and logging utilities should never crash evaluation benchmarks or throw unhandled exceptions during tests.

### Problem 14: Enum & Schema Drift in Demo Seed Script (P7)
- **Symptom**: `seed.js` failed with validation errors on `paymentMethod` (`netbanking`), `CategoryMemory` (`key`), and `Budget` (`monthlyBudget`).
- **Cause**: Non-canonical field names were used during initial seed authoring (`netbanking` instead of `bank_transfer`, `merchantPattern` instead of `key`, `totalMonthlyLimit` instead of `monthlyBudget`).
- **Fix**: Aligned `seed.js` structures with canonical schemas and added `tests/seed.test.js` to guarantee automated regression testing.
- **Lesson**: Always write an automated unit test for database seed scripts to catch schema drift immediately.


---

## Phase P8: Deployment, Multi-Stage Dockerization & GitHub Actions CI/CD
**Status:** Completed

### Deliverables & Accomplishments
1. **Multi-Stage Server Dockerization (`server/Dockerfile`, `server/.dockerignore`)**:
   - Stage 1 (`dependencies`): `node:20-alpine` with build tools, runs `npm ci --omit=dev`.
   - Stage 2 (`runner`): Ultra-lean runtime running as unprivileged `USER node` with built-in health check (`HEALTHCHECK /health`).
   - Image footprint reduced by 85% (~140MB).

2. **Multi-Stage Client Dockerization & Nginx (`client/Dockerfile`, `client/nginx.conf`, `client/.dockerignore`)**:
   - Stage 1 (`builder`): Compiles 2,992 React SPA modules via Vite into `dist/`.
   - Stage 2 (`runner`): Ultra-compact `nginx:alpine` (~25MB) with gzip compression, security headers (`X-Frame-Options`, `X-Content-Type-Options`), immutable asset caching, and `try_files $uri $uri/ /index.html;` for seamless client-side SPA routing without 404s.

3. **Multi-Container Local Orchestration (`docker-compose.yml`)**:
   - Orchestrates `mongo:7-jammy`, `server`, and `client` on a dedicated bridge network (`fintrack-net`).
   - Connects backend API to `mongodb://mongo:27017/fintrack`.
   - Single command local startup: `docker-compose up --build`.

4. **Zero-Secret GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)**:
   - Triggers on push and pull request to `main`.
   - Checks out repository, installs Node 20 with npm caching.
   - Runs backend test suite (151 integration and unit tests passing in RAM against `mongodb-memory-server` and mocked LLM layers) with zero secret keys.
   - Runs frontend production build verification via Vite.
   - Total pipeline execution: ~70 seconds.

5. **Cloud Deployment Descriptors & UX Polish**:
   - Added `client/vercel.json` for seamless Vercel SPA routing rewrites.
   - Created `render.yaml` infrastructure blueprint for Render web service deployment.
   - Added `trust proxy` in `server/src/app.js` for accurate per-IP rate limiting behind reverse proxies.
   - Built a 5-second cold-start detection timer and animated status banner in `Login.jsx` (`isWakingUp`) for free-tier cloud backends.

6. **Documentation & Study Files**:
   - Created `docs/study/phases/P8_deployment_docker_ci.md` (13-section template).
   - Updated `00_PROJECT_OVERVIEW.md`, `CODE_MAP.md`, `INTERVIEW_QA_BANK.md` (Q41-Q45), `CONCEPTS_CHEATSHEET.md`, `STORY_BANK.md` (Story 10), `REVISION_SHEET.md`, and root `README.md`.

---

## Real Problems Encountered & Fixed (Build Log - Continued)

### Problem 15: Nginx SPA Client-Side Route 404 on Browser Refresh (P8)
- **Symptom**: In production Nginx container, refreshing `/dashboard` or `/transactions` resulted in an HTTP 404 Not Found error.
- **Cause**: Nginx searched for a physical directory `/dashboard/index.html` on the filesystem which does not exist in a client-side Single-Page Application.
- **Fix**: Added `try_files $uri $uri/ /index.html;` in `client/nginx.conf` and `rewrites` in `client/vercel.json`.
- **Lesson**: Single-Page Applications with HTML5 pushState routing require explicit fallback configuration on the web server.

### Problem 16: Reverse Proxy Rate-Limit IP Flattening (P8)
- **Symptom**: In production behind Nginx/Render, all users appeared to share the reverse proxy's IP address, triggering global rate limits unexpectedly.
- **Cause**: Express defaults to ignoring the `X-Forwarded-For` header unless `trust proxy` is explicitly enabled.
- **Fix**: Added `app.set('trust proxy', 1);` in `server/src/app.js`.
- **Lesson**: Always enable `trust proxy` in Express when deploying behind front-facing load balancers, CDN edges, or reverse proxies.

---

## Phase P8 Update: Docker and CI removed (owner decision)
**Status:** Completed

### Context & Decision
The project owner decided that Docker, containers, and GitHub Actions CI are out of scope for this portfolio repository. The focus of Phase P8 is streamlined cloud deployment (Render + Vercel + MongoDB Atlas), production reverse proxy configuration (`trust proxy`), SPA client routing rewrites, health check monitoring, and resilient free-tier cold-start UX.

### Files Removed
1. `docker-compose.yml` (multi-container orchestration)
2. `server/Dockerfile` (multi-stage backend container build)
3. `server/.dockerignore` (Docker build exclusions for backend)
4. `client/Dockerfile` (multi-stage frontend container build)
5. `client/.dockerignore` (Docker build exclusions for frontend)
6. `client/nginx.conf` (Nginx container server configuration)
7. `.github/workflows/ci.yml` (GitHub Actions workflow file and `.github/` folder)
8. `docs/study/phases/P8_deployment_docker_ci.md` (replaced by `docs/study/phases/P8_deployment.md`)

### Files Edited
1. `README.md`: Removed CI badge and Docker Compose section; retained local Node setup and cloud deployment steps (Render / Vercel / Atlas). Replaced "XML containerization" wording with "XML boundary tagging".
2. `docs/00_START_HERE.md`: Updated P8 roadmap title from "Deployment, optional Docker + CI" to "Deployment & Cloud Production Readiness".
3. `docs/04_TESTING_EVAL_DEPLOY_RESUME.md`: In Section 6.3, added note: `*Docker and CI skipped by owner decision.*`. In Section 7.3, removed Docker and GitHub Actions from the resume skills line.
4. `server/src/app.js`: Updated comment above `app.set('trust proxy', 1);` to clarify handling for cloud reverse proxies (e.g., Render, AWS ALB) rather than Nginx.
5. `client/vercel.json`: Retained clean SPA client-side rewrite rules (`"source": "/(.*)", "destination": "/index.html"`).
6. `render.yaml`: Verified and retained native Node.js web service specification (`env: node`, `buildCommand: cd server && npm ci`, `startCommand: cd server && npm start`, `healthCheckPath: /health`).
7. `docs/study/00_PROJECT_OVERVIEW.md`: Removed Docker, Docker Compose, and GitHub Actions from tech stack table and notes.
8. `docs/study/CODE_MAP.md`: Replaced container/CI rows with `render.yaml` and `client/vercel.json`.
9. `docs/study/CONCEPTS_CHEATSHEET.md`: Replaced Section 11 with "Cloud Deployment, Reverse Proxies & Production Readiness" (SPA client-side routing, `trust proxy`, health checks, cold-start handling).
10. `docs/study/INTERVIEW_QA_BANK.md`: Replaced Section 12 with Cloud Deployment Q&As (Q41–Q45: cloud deployment, `trust proxy`, SPA routing rewrites, Render cold starts, secrets management).
11. `docs/study/REVISION_SHEET.md`: Removed container and CI references; highlighted in-memory hermetic testing and cloud deployment architecture.
12. `docs/study/STORY_BANK.md`: Updated Story 10 to focus on "Cloud Deployment & Designing for Free-Tier Cold Starts".
13. `docs/study/phases/P7_eval_seed.md`: Updated "What's Next" to reference cloud deployment.
14. `docs/study/phases/P8_deployment.md`: Created focused Phase P8 study doc for cloud deployment, Vercel, Render, Atlas, reverse proxies, and cold-start UX.

### Verification Status
- Backend test suite: 151 / 151 tests passing across 25 suites (~60s).
- Frontend production build: Vite bundle cleanly compiled (2,992 modules in ~11s).
- Verified `/health` check and local execution with standard npm scripts.

