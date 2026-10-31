# FinTrack Concepts Cheatsheet (Cumulative)
*Core computer science and web development fundamentals explained simply with real FinTrack references.*

---

## 1. Web Architecture & HTTP

### REST & Status Codes
- **Plain Meaning**: REST (Representational State Transfer) is a stateless architectural style for web APIs where HTTP verbs (GET, POST, PUT, DELETE) operate on resources identified by URIs. Status codes inform the client of the outcome: 2xx success, 4xx client errors, 5xx server errors.
- **Where it appears in FinTrack**: All routes in `server/src/routes/` follow REST conventions: `POST /api/transactions` (201 Created), `GET /api/transactions/:id` (200 OK or 404 Not Found), and `DELETE /api/transactions/:id` (200 OK).

### CORS (Cross-Origin Resource Sharing)
- **Plain Meaning**: A security mechanism enforced by web browsers that blocks a web page from making AJAX requests to a different domain or port than the one that served it, unless the server sends explicit `Access-Control-Allow-Origin` headers.
- **Where it appears in FinTrack**: [`server/src/app.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/app.js) configures CORS to dynamically accept origins parsed from `env.FRONTEND_URL` while allowing non-browser requests (`!origin`) like curl or mobile apps.

### Rate Limiting (Draft-7)
- **Plain Meaning**: Restricting the number of requests a client can make within a given time window (e.g. 300 requests per 15 minutes) to protect against DDoS attacks, brute-force login attempts, and API quota exhaustion. Standard headers (`RateLimit-Limit`, `RateLimit-Remaining`) inform the client of quota status.
- **Where it appears in FinTrack**: [`server/src/middleware/rateLimiters.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/rateLimiters.js) defines `generalLimiter` (300/15m), `authLimiter` (20/15m), and `aiLimiter` (30/15m).

---

## 2. Security & Authentication

### JWT vs. Server-Side Sessions
- **Plain Meaning**: Sessions store user data on the server (in memory or Redis) and send a session ID cookie. JWTs (JSON Web Tokens) are stateless: the token itself contains the user claims and a cryptographic signature. The server verifies the signature without any database lookup.
- **Where it appears in FinTrack**: [`server/src/controllers/auth.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/auth.controller.js) generates a JWT with `{ id }` payload on login, and [`server/src/middleware/auth.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/auth.js) verifies it on every protected request.

### Password Salting & Hashing
- **Plain Meaning**: A cryptographic hash function is a one-way mathematical function. A "salt" is a random string generated per user and appended to the password before hashing. This ensures two identical passwords produce completely different hashes, neutralizing precomputed rainbow table attacks.
- **Where it appears in FinTrack**: [`server/src/models/User.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/User.js) uses Mongoose's `pre('save')` hook with `bcryptjs.genSalt(10)` to hash passwords only when created or modified.

### Account Enumeration Defense
- **Plain Meaning**: A design pattern where login endpoints return identical, timing-consistent error messages regardless of whether the email was not found or the password was incorrect, preventing attackers from harvesting valid user emails.
- **Where it appears in FinTrack**: [`server/src/controllers/auth.controller.js:login`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/auth.controller.js) returns `{ success: false, message: 'Invalid email or password' }` for both cases.

---

## 3. Databases & Indexing

### Database Indexes (B-Trees)
- **Plain Meaning**: An index is a separate data structure (typically a balanced B-tree) maintained by the database that allows locating records in $O(\log N)$ time rather than scanning every document in a collection ($O(N)$ full collection scan).
- **Where it appears in FinTrack**: [`server/src/models/Transaction.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/Transaction.js) indexes `{ userId: 1, transactionDate: -1 }` so fetching a user's recent transactions requires zero memory sorting.

### Compound Index & Index Prefix Rule
- **Plain Meaning**: An index containing multiple fields. In MongoDB, an index on `{ A: 1, B: 1 }` can speed up queries on `{ A }` alone or `{ A, B }`, but cannot speed up queries on `{ B }` alone because the B-tree is sorted primarily by `A`.
- **Where it appears in FinTrack**: `{ userId: 1, type: 1, transactionDate: -1 }` on `Transaction` speeds up queries filtering by user and transaction type (income vs. expense).

### Partial Unique Index
- **Plain Meaning**: An index that enforces uniqueness constraints only on documents that satisfy a specified filter expression (`partialFilterExpression`), rather than all documents in the collection.
- **Where it appears in FinTrack**: [`server/src/models/Transaction.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/Transaction.js) enforces unique `{ userId: 1, dedupeHash: 1 }` only when `dedupeHash` is a string, preventing import duplication without blocking manual entries where `dedupeHash` is null.

### TTL (Time-To-Live) Index
- **Plain Meaning**: A MongoDB index that instructs the database's background thread to automatically delete documents after a specified number of seconds past a timestamp field.
- **Where it appears in FinTrack**: [`server/src/models/AiCallLog.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/AiCallLog.js) sets `expires: 30 * 24 * 60 * 60` on `createdAt`, automatically pruning AI logs older than 30 days.

---

## 4. Software Design & Node.js Runtimes

### Fail-Fast Principle
- **Plain Meaning**: A design pattern where a software system immediately halts and reports an error as soon as an unexpected condition occurs (like a missing config), rather than attempting to continue in a broken state.
- **Where it appears in FinTrack**: [`server/src/config/env.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/config/env.js) validates all environment variables with Zod at startup. If `JWT_SECRET` is missing, the server crashes instantly with an actionable error.

### Express Middleware Pattern
- **Plain Meaning**: Functions that have access to the request object (`req`), response object (`res`), and the `next` function in the application’s request-response cycle. They can execute code, modify `req`/`res`, end the request, or pass control to the next handler.
- **Where it appears in FinTrack**: Auth checking (`auth.js`), validation (`validate.js`), rate limiting (`rateLimiters.js`), and centralized error handling (`app.js`).

### In-Memory Integration Testing
- **Plain Meaning**: Running automated tests against a lightweight, real database instance running entirely in system RAM (`mongodb-memory-server`) rather than mocking database queries with fake returns.
- **Where it appears in FinTrack**: [`server/tests/setup.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/tests/setup.js) spins up an in-memory Mongo instance for Jest, ensuring all indexes, constraints, and Mongoose hooks run exactly as they would in production.

---

## 5. Analytics, Mathematics & Data Streams

### Timezone Offsets & UTC Storage
- **Plain Meaning**: Best-practice web architecture mandates storing all timestamps in Universal Coordinated Time (UTC). When rendering reports or filtering by calendar months, local timezone offsets (e.g. IST +05:30) must be applied to calculate correct boundaries.
- **Where it appears in FinTrack**: [`server/src/services/analytics/dateRange.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/dateRange.js) computes UTC boundaries for IST calendar months.

### Pure Functions in Financial Calculations
- **Plain Meaning**: A pure function's return value depends solely on its input arguments, causing no side-effects (no network calls, no database mutations, no global state changes). This makes financial logic 100% deterministic, easy to test, and mathematically verifiable.
- **Where it appears in FinTrack**: [`server/src/services/analytics/summary.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/summary.js) (`summarizeMonth`, `buildTrend`) and [`forecast.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/forecast.js) are pure functions.

### Run-Rate Spending Projection
- **Plain Meaning**: A statistical forecasting method that calculates the current daily spending rate ($\text{spent} / \text{daysElapsed}$) and projects it across the remaining days of the month, blended with historical averages.
- **Where it appears in FinTrack**: [`server/src/services/analytics/forecast.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/forecast.js) computes end-of-month projections and triggers `budgetRisk` flags.

### Writable HTTP Streams (PDF Generation)
- **Plain Meaning**: A Node.js streaming interface that sends data in sequential binary chunks to the client socket as it is generated, avoiding storing large files in server RAM or on disk.
- **Where it appears in FinTrack**: [`server/src/controllers/report.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/report.controller.js) pipes the `PDFDocument` directly into `res`.

---

## 6. AI, LLM Resilience & Data Privacy (Phase P3)

### Structured Output & JSON Schema
- **Plain Meaning**: Forcing an LLM to generate responses strictly adhering to a JSON Schema specification (properties, types, required keys, enum values) rather than natural language markdown.
- **Where it appears in FinTrack**: [`server/src/services/llm/schemas.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/schemas.js) converts Zod schemas into JSON Schemas sent in Groq and Gemini API payloads.

### Temperature Parameter
- **Plain Meaning**: A hyperparameter in generative models controlling randomness. Low temperature ($0.0 - 0.2$) forces greedy token selection for deterministic, reproducible answers; higher values ($0.7 - 1.0$) encourage creative variation.
- **Where it appears in FinTrack**: Configured as `0.1` in [`server/src/services/llm/index.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/index.js) so categorization produces identical results across runs.

### LLM Self-Repair Feedback Loop
- **Plain Meaning**: An automated retry mechanism that feeds validation error messages (like missing JSON fields or bad syntax) back into the prompt, asking the model to fix its mistake.
- **Where it appears in FinTrack**: `attemptRepair()` in [`server/src/services/llm/index.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/index.js) passes Zod issue paths back to the provider once before failing over.

### Exponential Backoff with Jitter
- **Plain Meaning**: An error-recovery algorithm that progressively doubles the wait duration before retrying ($500\text{ms}, 1000\text{ms}, 2000\text{ms}$) while adding random noise (jitter) to prevent synchronized retries ("thundering herd").
- **Where it appears in FinTrack**: [`server/src/services/llm/index.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/index.js) calculates `Math.pow(2, attempt) * 500 + Math.random() * 200` on 429 and 5xx errors.

### Client-Side Rate Gating (Outbound Throttling)
- **Plain Meaning**: Throttling outbound client requests before they hit an external third-party API to guarantee compliance with the third-party's tier quotas (e.g. 10 requests per minute).
- **Where it appears in FinTrack**: `RateGate` class in [`server/src/services/llm/rateGate.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/rateGate.js).

### PII Sanitization
- **Plain Meaning**: Programmatically identifying and masking Personally Identifiable Information (PAN, phone, email, Aadhaar) before data is transmitted over the wire or logged to disk.
- **Where it appears in FinTrack**: [`server/src/services/categorization/piiMask.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/piiMask.js) strips all sensitive regex patterns from transaction strings.

### Prompt Injection & XML Tag Boundary Defense
- **Plain Meaning**: An attack where untrusted user input tricks the LLM into executing malicious instructions. Defended against by encapsulating user input inside XML tags and strictly commanding the model to treat tag contents as literal string data.
- **Where it appears in FinTrack**: [`server/src/services/llm/prompts.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/prompts.js) wraps transaction titles in `<transactions><transaction><title>` tags.

---

## 7. Data Ingestion, Hashing & Idempotency (Phase P4)

### Idempotency
- **Plain Meaning**: A mathematical property where an operation can be applied multiple times without changing the result beyond the initial application ($f(f(x)) = f(x)$).
- **Where it appears in FinTrack**: Re-importing the same CSV statement multiple times results in 0 newly inserted rows and flags 100% of the transactions as duplicates via SHA-1 hashing.

### Occurrence Indexing in Deduplication
- **Plain Meaning**: Appending an incremental integer counter to identical data signatures within a batch to allow legitimate same-day duplicate purchases while preserving idempotency across repeat imports.
- **Where it appears in FinTrack**: [`server/src/services/import/dedupe.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/import/dedupe.js) assigns `occurrenceIndex` (0, 1, 2...) for identical `(date, amount, type, normalizedTitle)` tuples.

### Unordered Bulk Insert (`{ ordered: false }`)
- **Plain Meaning**: A database batch-insertion mode where individual document write errors (such as duplicate-key violations) do not stop MongoDB from attempting to insert all remaining documents in the array.
- **Where it appears in FinTrack**: [`server/src/controllers/import.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/import.controller.js) uses `Transaction.insertMany(docs, { ordered: false })` so existing duplicates never abort remaining valid rows.

### Multipart/form-data & Memory Buffers
- **Plain Meaning**: An encoding standard for HTTP POST requests allowing binary files to be transmitted in segmented boundaries. Storing files in RAM (`memoryStorage`) avoids disk I/O and server filesystem vulnerabilities for small files.
- **Where it appears in FinTrack**: [`server/src/middleware/upload.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/upload.js) parses CSV uploads into `req.file.buffer` with an explicit 1MB cap.





---

## 8. AI Grounding, Deterministic Repair & Heuristics (Phase P5)

### Grounding vs. Parametric Memory
- **Plain Meaning**: Grounding restricts an LLM to answer strictly from verified facts supplied directly in prompt context, preventing the model from guessing or relying on out-of-date training data (parametric memory).
- **Where it appears in FinTrack**: [`server/src/services/ai/budgetOptimizer.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/ai/budgetOptimizer.js) injects pre-computed MongoDB aggregates into the prompt and commands the LLM to use only those figures.

### Deterministic Post-Repair
- **Plain Meaning**: Programmatically intercepting AI outputs with hardcoded mathematical rules to guarantee business constraints and schema invariants before exposing data to the user.
- **Where it appears in FinTrack**: `repairBudgetSuggestions()` clamps negative numbers, drops unknown categories, caps suggested budgets to income, and scales category limits.

### Proportional Scaling
- **Plain Meaning**: Scaling multiple related numerical components by a uniform multiplier ($S / \sum X_i$) so their total exactly equals a target constraint ceiling without distorting their relative weight.
- **Where it appears in FinTrack**: When the sum of proposed category limits exceeds the monthly budget, category limits are scaled down proportionally: `lim * (budget / sumLimits)`.

### Heuristic Fallback
- **Plain Meaning**: A deterministic, rule-based algorithmic alternative designed to run instantly with zero external dependencies when external services (like LLM APIs) encounter outages or rate limits.
- **Where it appears in FinTrack**: `buildHeuristicBudget()` applies 100% fixed / 90% flexible allocation rules, guaranteeing that the budget optimizer works 100% of the time.

### In-Memory TTL Caching
- **Plain Meaning**: Storing computational or external API results in process RAM for a specified Time-To-Live duration to eliminate repetitive, expensive calls.
- **Where it appears in FinTrack**: `insightsCache` in [`server/src/services/ai/insights.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/ai/insights.js) caches monthly insights for 10 minutes per user.

---

## 9. Frontend Architecture, React & Browser APIs (Phase P6)

### React Reconciliation & Virtual DOM
- **Plain Meaning**: React's core rendering mechanism that compares an in-memory Virtual DOM tree against the previous tree using an $O(N)$ heuristic diffing algorithm, applying only the necessary minimal mutations to the real browser DOM.
- **Where it appears in FinTrack**: All dynamic lists (transaction ledger, category limit rows, preview tables) use stable `key` attributes to optimize re-renders.

### Debouncing vs. Throttling
- **Plain Meaning**: Debouncing delays execution until a user has stopped triggering events for a specified duration ($N$ ms idle). Throttling enforces a maximum execution frequency (at most once every $N$ ms) regardless of trigger frequency.
- **Where it appears in FinTrack**: `useDebounce` hook (400ms on search query input, 600ms on transaction form AI suggestion).

### AbortController & Request Cancellation
- **Plain Meaning**: A standard Web API interface that can cancel in-flight HTTP requests and DOM asynchronous operations via an `AbortSignal`, preventing race conditions and saving network bandwidth.
- **Where it appears in FinTrack**: `TransactionForm.jsx` cancels pending `/api/ai/categorize` requests when a user edits the transaction title or amount before the previous call finishes.

### Synchronous State Hydration
- **Plain Meaning**: Reading persisted credentials (e.g. from `localStorage`) during initial Redux state initialization rather than in an asynchronous effect hook, eliminating intermediate loading states or login screen flashes.
- **Where it appears in FinTrack**: `authSlice.js` derives `isAuthenticated: Boolean(localStorage.getItem('token'))` immediately on module load.

### Cumulative Layout Shift (CLS) & Skeletons
- **Plain Meaning**: A Core Web Vital metric measuring visual stability. Skeletons reserve layout space with animated placeholder shapes so content doesn't abruptly push surrounding elements when loaded.
- **Where it appears in FinTrack**: `SkeletonCard` and `SkeletonChart` maintain fixed heights while dashboard summary and Recharts data load.
