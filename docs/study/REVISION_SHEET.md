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
- **Automated Tests**: **104 passing tests across 17 test suites** in Jest ESM with `mongodb-memory-server` (~74s total run).
- **User Isolation**: Verified across get, list, update, and delete endpoints with 0 cross-tenant data leaks.
- **AI Latency**: < 5ms for recurring merchants via `CategoryMemory` vs ~600ms for LLM calls.
- **PII Leakage**: 0% leaked — 100% of emails, Indian phones, PAN cards, and Aadhaar numbers masked before transit.
- **Outbound Rate Limiting**: 10 RPM client-side `RateGate` preventing third-party quota exhaustion.
- **Rate Limits**: 300 req/15m for API, 20 req/15m for Auth, 30 req/15m for AI.
- **Forecasting Confidence**: Clamped to 30%–90%, penalized dynamically by spending volatility ($CV$).

---

## 4. Top 10 Design Decisions & Why
1. **Zod Validation for Env, Requests & LLMs**: Fails fast on boot; validates all API bodies to block NoSQL injection; parses structured LLM output with repair loops.
2. **Stateless JWTs**: Avoids server-side session lookups on every request, scaling horizontally.
3. **Compound Index `{ userId: 1, transactionDate: -1 }`**: Eliminates in-memory sorting for recent transaction queries.
4. **Partial Unique Index on `dedupeHash`**: Guarantees CSV statement deduplication without breaking manual entries.
5. **Deterministic Math vs. Generative Words**: LLMs categorize text; pure JavaScript code computes all numbers.
6. **Per-User `CategoryMemory`**: Learns user category corrections instantly with zero fine-tuning costs; never lets LLM overwrite user edits.
7. **Multi-Provider Fallback Chain**: Groq (Llama 3.3 70B) -> Gemini 2.5 Flash -> Regex Rules -> Default 'Other'; app never halts on AI outage.
8. **Client-Side Outbound Rate Gate (10 RPM)**: Protects app from provider 429 errors on free tiers.
9. **Defense-in-Depth PII Masking**: Automatically strips sensitive IDs (PAN, Aadhaar, phones) before sending to external AI APIs.
10. **In-Memory Integration Tests**: Uses real MongoDB in RAM instead of fake mocks for 100% realistic test coverage across 104 tests.

---

## 5. Ten Must-Know Concepts (1-Line Definitions)
1. **Structured Output**: Forcing an LLM to reply strictly in valid JSON adhering to a JSON Schema rather than free-form text.
2. **Temperature (0.1)**: Controls randomness; low values guarantee deterministic, reproducible categorization.
3. **Self-Repair Loop**: Feeding schema validation errors back to the LLM once so it can correct its own malformed JSON.
4. **Exponential Backoff with Jitter**: Progressively doubling retry delays while adding random noise to avoid thundering herds.
5. **PII Sanitization**: Masking sensitive personal identifiers (PAN, phone, Aadhaar) before data leaves server boundaries.
6. **Authentication vs Authorization**: AuthN = verifying identity (login); AuthZ = verifying permissions (user data isolation).
7. **CORS**: Browser-enforced rule restricting web pages on domain A from making requests to domain B.
8. **Compound Index**: Multi-field B-tree index speeding up queries filtering and sorting on those fields.
9. **Draft-7 Rate Limiter**: Standards-compliant rate limiting sending `RateLimit-Limit` and `RateLimit-Remaining` headers.
10. **Fail-Fast**: Crashing immediately at boot when required configurations are missing rather than mid-request.

---

## 6. Ten Likely Questions with 1-Line Spoken Answers
1. *Why use MongoDB?* -> "Transactions have varied semi-structured metadata (UPI refs, dedupe hashes, AI confidence) that fit a document model cleanly."
2. *How is data isolated between users?* -> "Every controller query explicitly includes `{ userId: req.userId }`, verified by automated tests."
3. *What happens if Groq and Gemini are both down?* -> "The pipeline logs the outage and seamlessly falls back to our deterministic regex rules and default category."
4. *How do you prevent prompt injection?* -> "We isolate user input inside XML tags, enforce system anti-injection rules, and whitelist outputs with Zod enums."
5. *Why do you have CategoryMemory?* -> "80% of transactions are recurring merchants; memory resolves in 2ms and saves API cost and quota."
6. *Why add jitter to backoff?* -> "It prevents concurrent retrying requests from syncing up and hammering the server at the exact same millisecond."
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

