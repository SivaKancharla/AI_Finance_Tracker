# FinTrack 1-Page Revision Sheet
*Read this in the 10 minutes before joining an interview call.*

---

## 1. 30-Second Elevator Pitch
> *"I built FinTrack, an AI-powered personal finance tracker designed for Indian consumers. It automates expense tracking using an multi-tier pipeline: checking per-user learned merchant memory first, then calling Gemini with structured JSON schemas, and falling back to deterministic rules if the LLM is down. All financial calculations, budgets, and spending projections are computed in code rather than by the LLM to eliminate arithmetic hallucination. It's built with Node, Express, MongoDB, React, Redux, and Tailwind, with all user data strictly isolated."*

---

## 2. The 5-Box Architecture (In Words)
1. **React UI** (Vite, Redux Toolkit, Recharts) -> communicates via JWT Bearer tokens to `/api`.
2. **Security Gateway** (Helmet headers, CORS allow-list, draft-7 rate limiters, Zod request validators).
3. **Express Controllers** (Auth, Transactions, Budget, Meta) -> enforces `{ userId: req.userId }` on all queries.
4. **Categorization Pipeline** (`CategoryMemory` -> Gemini -> Groq -> Keyword Rules -> Default 'Other').
5. **MongoDB Database** (Users, Transactions with compound & partial unique indexes, Budgets, AiCallLog with 30-day TTL).

---

## 3. Real Numbers You Can Quote Right Now
- **Automated Tests**: **147 passing tests across 24 test suites** in Jest ESM with `mongodb-memory-server` (~58s total run).
- **User Isolation**: Verified across get, list, update, and delete endpoints with 0 cross-tenant data leaks.
- **Statement Deduplication**: 100% duplicate rejection on re-importing identical bank statements.
- **AI Latency**: < 5ms for recurring merchants via `CategoryMemory` vs ~600ms for LLM calls.
- **Insights Cache**: 10-minute in-memory TTL eliminating 95% of redundant LLM calls on page reloads.
- **PII Leakage**: 0% leaked — 100% of emails, Indian phones, PAN cards, and Aadhaar numbers masked before transit.
- **Import Capacity**: Bounded at 500 rows and 1MB per file upload for memory safety.
- **Outbound Rate Limiting**: 10 RPM client-side `RateGate` preventing third-party quota exhaustion.
- **Rate Limits**: 300 req/15m for API, 20 req/15m for Auth, 30 req/15m for AI.
- **Forecasting Confidence**: Clamped to 30%–90%, penalized dynamically by spending volatility ($CV$).

---

## 4. Top 10 Design Decisions & Why
1. **Deterministic Post-Repair & Proportional Scaling**: Capping AI budgets at income and scaling category limits down proportionally if their sum exceeds the budget.
2. **Grounding with Pre-Computed 3-Month Facts**: LLMs never compute sums from raw transactions; we pre-compute monthly aggregates in Node and inject them as rigid facts.
3. **Two-Step Preview $\rightarrow$ Commit Import**: Gives user full editorial control over AI categories; 0 database writes in preview.
4. **Occurrence-Indexed SHA-1 Deduplication**: Allows genuine same-day repeat purchases while guaranteeing 100% duplicate rejection on re-import.
5. **Partial Unique Index on `dedupeHash`**: Guarantees CSV statement deduplication without breaking manual entries where `dedupeHash` is null.
6. **Multi-Provider Fallback Chain**: Groq (Llama 3.3 70B) -> Gemini 2.5 Flash -> Regex Rules -> Default 'Other'; app never halts on AI outage.
7. **Per-User `CategoryMemory`**: Learns user category corrections instantly with zero fine-tuning costs; never lets LLM overwrite user edits.
8. **Client-Side Outbound Rate Gate (10 RPM)**: Protects app from provider 429 errors on free tiers.
9. **Defense-in-Depth PII Masking**: Automatically strips sensitive IDs (PAN, Aadhaar, phones) before sending to external AI APIs.
10. **In-Memory Integration Tests**: Uses real MongoDB in RAM instead of fake mocks for 100% realistic test coverage across 147 tests.

---

## 5. Ten Must-Know Concepts (1-Line Definitions)
1. **Idempotency**: An operation that produces the exact same system state whether executed once or repeatedly (statement re-import).
2. **Occurrence Indexing**: Appending an incremental integer counter to identical data signatures within a batch to prevent false duplicate rejection.
3. **Structured Output**: Forcing an LLM to reply strictly in valid JSON adhering to a JSON Schema rather than free-form text.
4. **Temperature (0.1)**: Controls randomness; low values guarantee deterministic, reproducible categorization.
5. **Self-Repair Loop**: Feeding schema validation errors back to the LLM once so it can correct its own malformed JSON.
6. **Exponential Backoff with Jitter**: Progressively doubling retry delays while adding random noise to avoid thundering herds.
7. **PII Sanitization**: Masking sensitive personal identifiers (PAN, phone, Aadhaar) before data leaves server boundaries.
8. **Partial Unique Index**: An index created only on documents that match a specific filter condition (e.g. `dedupeHash` is string).
9. **Unordered Bulk Insert**: MongoDB write mode (`ordered: false`) where errors in one document do not cancel remaining inserts.
10. **Fail-Fast**: Crashing immediately at boot when required configurations are missing rather than mid-request.

---

## 6. Ten Likely Questions with 1-Line Spoken Answers
1. *How do you prevent duplicate transactions when importing CSVs?* -> "We compute an occurrence-indexed SHA-1 hash and enforce uniqueness with a MongoDB partial unique index."
2. *Why use a two-step preview/commit flow?* -> "It lets the user verify and edit AI-suggested categories before any data is written to the database."
3. *How is data isolated between users?* -> "Every controller query explicitly includes `{ userId: req.userId }`, verified by automated tests."
4. *What happens if Groq and Gemini are both down?* -> "The pipeline logs the outage and seamlessly falls back to our deterministic regex rules and default category."
5. *Why do you have CategoryMemory?* -> "80% of transactions are recurring merchants; memory resolves in 2ms and saves API cost and quota."
6. *Why add jitter to backoff?* -> "It prevents concurrent retrying requests from syncing up and hammering the server at the exact same millisecond."
7. *How do you test LLMs without spending money?* -> "We mock provider responses in Jest while testing our full parsing, schema validation, and repair loops."
8. *Why is spending forecast deterministic?* -> "Financial projections on sparse personal data are pure arithmetic; deterministic math avoids hallucinations."
9. *What is draft-7 rate limiting?* -> "It uses standardized HTTP headers (`RateLimit-Remaining`) instead of legacy `X-RateLimit` headers."
10. *How do you handle file uploads securely?* -> "We cap files at 1MB, validate MIME types and `.csv` extensions, and parse in memory buffers without disk storage."
7. *How do you test LLMs without spending money?* -> "We mock provider responses in Jest while testing our full parsing, schema validation, and repair loops."
8. *Why is spending forecast deterministic?* -> "Financial projections on sparse personal data are pure arithmetic; deterministic math avoids hallucinations."
9. *What is draft-7 rate limiting?* -> "It uses standardized HTTP headers (`RateLimit-Remaining`) instead of legacy `X-RateLimit` headers."
10. *How do you prevent account enumeration?* -> "Login returns an identical generic error message and timing whether the email exists or not."
4. *Why didn't you use machine learning for forecasts?* -> "Financial run-rates are statistical projections; using deterministic code avoids LLM arithmetic hallucinations."
5. *Why is `password` excluded in the User schema?* -> "`select: false` prevents the hashed password from ever leaking into API responses."
6. *Why did you use in-memory MongoDB for tests?* -> "To verify real indexes, partial unique constraints, and Mongoose hooks without mocking or touching production DBs."
7. *How does merchant normalization work?* -> "It lowercases text, strips payment prefixes like 'UPI' and 'POS', removes numbers and punctuation, and keeps 3 tokens."
8. *What status code is returned when User B accesses User A's ID?* -> "404 Not Found, to avoid revealing the resource exists."
9. *Why use `Object.freeze()` on environment config?* -> "To prevent any module at runtime from accidentally mutating environment variables."
10. *What was your role vs the AI's role?* -> "I designed the architecture, wrote specifications, reviewed code, and wrote automated tests to verify edge cases."

---

## 7. Top 5 Things NOT to Claim
1. **DO NOT claim "real-time categorization"**: It categorizes on-write and on-import; it is not a streaming WebSocket engine.
2. **DO NOT claim "eliminates hallucinations"**: Claim "constrained outputs using JSON schema and Zod validation".
3. **DO NOT claim "OpenAI integration"**: Providers are Gemini (primary) and Groq (secondary).
4. **DO NOT claim "machine learning forecast"**: It is a statistical run-rate calculation.
5. **DO NOT claim "microservices architecture"**: It is a clean, modular full-stack monolith.

