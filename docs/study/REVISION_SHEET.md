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
- **Automated Tests**: **48 passing tests across 7 test suites** in Jest ESM with `mongodb-memory-server`.
- **User Isolation**: Verified across get, list, update, and delete endpoints with 0 cross-tenant data leaks.
- **Normalization Coverage**: Verified against 12 Indian merchant narration patterns.
- **Rate Limits**: 300 req/15m for API, 20 req/15m for Auth, 30 req/15m for AI.

---

## 4. Top 10 Design Decisions & Why
1. **Zod Validation for Env & Requests**: Fails fast on boot; validates all API bodies to block NoSQL injection.
2. **Stateless JWTs**: Avoids server-side session lookups on every request, scaling horizontally.
3. **Compound Index `{ userId: 1, transactionDate: -1 }`**: Eliminates in-memory sorting for recent transaction queries.
4. **Partial Unique Index on `dedupeHash`**: Guarantees CSV statement deduplication without breaking manual entries.
5. **Deterministic Math vs. Generative Words**: LLMs categorize text; pure JavaScript code computes all numbers.
6. **Per-User `CategoryMemory`**: Learns user category corrections instantly with zero fine-tuning costs.
7. **Bcryptjs (Cost 10) Salting**: Neutralizes rainbow table attacks without C++ compilation issues on Windows.
8. **Graceful Fallback Chain**: System never crashes if LLM is down; always degrades to rules or memory.
9. **Generic 401 & 404 Responses**: Prevents account enumeration and resource probing.
10. **In-Memory Integration Tests**: Uses real MongoDB in RAM instead of fake mocks for 100% realistic test coverage.

---

## 5. Ten Must-Know Concepts (1-Line Definitions)
1. **Authentication vs Authorization**: AuthN = verifying identity (login); AuthZ = verifying permissions (user data isolation).
2. **CORS**: Browser-enforced rule restricting web pages on domain A from making requests to domain B.
3. **Salting**: Adding random bytes to a password before hashing so identical passwords produce unique hashes.
4. **Compound Index**: Multi-field B-tree index speeding up queries filtering and sorting on those fields.
5. **Partial Index**: An index created only on documents that match a specific filter condition.
6. **TTL Index**: MongoDB index that automatically purges documents older than a specified duration.
7. **Draft-7 Rate Limiter**: Standards-compliant rate limiting sending `RateLimit-Limit` and `RateLimit-Remaining` headers.
8. **ES Modules**: Standardized JavaScript module format (`import/export`) running natively in Node.js.
9. **NoSQL Injection**: Attacking unvalidated queries using operator objects like `{"$gt": ""}`.
10. **Fail-Fast**: Crashing immediately at boot when required configurations are missing rather than mid-request.

---

## 6. Ten Likely Questions with 1-Line Spoken Answers
1. *Why use MongoDB?* -> "Transactions have varied semi-structured metadata (UPI refs, dedupe hashes, AI confidence) that fit a document model cleanly."
2. *How is data isolated between users?* -> "Every controller query explicitly includes `{ userId: req.userId }`, verified by automated tests."
3. *What happens if Gemini is down?* -> "The pipeline catches the error, logs it to `AiCallLog`, and falls back to our keyword rules engine."
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

