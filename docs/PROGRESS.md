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




