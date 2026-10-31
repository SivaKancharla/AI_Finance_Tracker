# FinTrack Interview Q&A Bank (Cumulative)
*Tagged technical and behavioral questions with real project answers.*

---

## Top 25 Must-Prepare Questions (Current Priority List)

1. **Tell me about your project FinTrack in 2 minutes.**
2. **What happens when the LLM service is down, rate-limited, or returns invalid JSON?**
3. **How does user authentication and authorization work in your application?**
4. **How do you ensure User B cannot access or modify User A's transactions?**
5. **Why did you use MongoDB instead of PostgreSQL for financial data?**
6. **What indexes did you create in MongoDB, and why?**
7. **What is a partial unique index, and where is it used in FinTrack?**
8. **Why use both JSON Schema and Zod validation? Isn't one enough?**
9. **How do you prevent SQL / NoSQL injection in your backend?**
10. **Why use stateless JWT tokens instead of server-side sessions? What are the trade-offs?**
11. **How do password salting and hashing work in your User model?**
12. **Why do you return the same generic error for unknown email and wrong password?**
13. **How does per-user category memory work, and when could it be wrong?**
14. **Why is the spending forecast deterministic instead of using machine learning?**
15. **How do you handle floating-point precision issues with currency in JavaScript?**
16. **What is CORS, and why does your server allow requests with no Origin header?**
17. **What is the difference between synchronous and asynchronous code in Node.js?**
18. **How does Express middleware work, and what happens if you forget to call `next()`?**
19. **How do you prevent race conditions during statement imports?**
20. **Why did you use in-memory MongoDB for testing instead of mocking Mongoose queries?**
21. **What did you use AI coding tools for, and what architectural decisions did you personally make?**
22. **What was the hardest bug you encountered while building this?**
23. **What is the difference between PUT and PATCH, and which did you use?**
24. **How does draft-7 rate limiting protect your application?**
25. **If you had another month to work on this, what would you improve?**

---

## 1. Project Overview & Architecture

#### Q1: Tell me about your project FinTrack in 2 minutes.
- **Tags**: `[Basic]` `[Service]` `[Product]` `[Startup]`
- **15-second answer**: FinTrack is an AI-powered personal finance tracker with automated categorization, deterministic budget forecasting, and strict multi-tenant data isolation.
- **60-second spoken answer**: *"FinTrack is a full-stack MERN application designed to eliminate manual transaction entry. The core problem with finance apps is that users abandon them because categorization is tedious, while AI-based prototypes hallucinate math. In FinTrack, categorization uses a multi-tier resilience pipeline: we first check per-user learned memory (`CategoryMemory`), then call Gemini with strict JSON schema enforcement, and fall back to keyword rules if the LLM is unavailable. Crucially, all math—totals, budget margins, and run-rate forecasts—is calculated deterministically in code. On the backend, I built secure REST APIs with JWT, compound indexes for fast date queries, and automated integration tests proving strict user isolation."*
- **Follow-ups**:
  - *Q: Did you build the frontend as well?* -> *A: Yes, with React 18, Redux Toolkit, Recharts, and Tailwind CSS.*
  - *Q: Why not use OpenAI?* -> *A: FinTrack uses Google Gemini as primary and Groq as secondary. Both have generous free tiers and fast inference, eliminating paid API dependencies.*
- **Trap**: Do not claim "real-time streaming" or "machine learning model for predictions". It is event-driven on-write categorization and statistical run-rate forecasting.

---

## 2. Security, Authentication & User Isolation

#### Q2: How does authentication and route protection work in FinTrack?
- **Tags**: `[Basic]` `[Service]` `[Product]`
- **15-second answer**: Users sign up or log in to receive a signed JWT token containing their user ID. The client sends this token in `Authorization: Bearer <token>`, and our `protect` middleware verifies it.
- **60-second spoken answer**: *"When a user logs in via `POST /api/auth/login`, we look up the user, verify their password using `bcryptjs.compare`, and issue a signed JSON Web Token using `jwt.sign({ id: user._id }, env.JWT_SECRET)`. For protected routes like `/api/transactions`, our `protect` middleware in `server/src/middleware/auth.js` intercepts the request, parses the Bearer header, and verifies the signature. If valid, it attaches `req.userId` and `req.user` to the request object and calls `next()`. All failure paths—missing token, invalid signature, expired token—return an identical 401 response."*
- **Follow-ups**:
  - *Q: Where does the client store the token?* -> *A: In localStorage for the SPA, with a response interceptor clearing it on 401.*
  - *Q: What is the downside of localStorage vs httpOnly cookie?* -> *A: localStorage is vulnerable to XSS; httpOnly cookies mitigate XSS but require CSRF protection.*
- **Trap**: Don't say "the JWT stores the user's password". The JWT payload contains only `{ id }`.

#### Q3: How do you prove User B cannot access User A's data?
- **Tags**: `[MUST]` `[Product]`
- **15-second answer**: Every database query in our controllers is explicitly scoped with `{ userId: req.userId }`, and we verify this with an automated isolation test suite.
- **60-second spoken answer**: *"A common vulnerability in student apps is BOLA—Broken Object Level Authorization—where User B fetches User A's record by guessing an ID like `GET /api/transactions/123`. In FinTrack, every query in `transaction.controller.js` explicitly includes `userId: req.userId`, for example: `Transaction.findOne({ _id: id, userId: req.userId })`. If User B requests User A's transaction ID, MongoDB finds zero matching records and returns HTTP 404. In `server/tests/isolation.test.js`, I wrote automated tests that spin up User A and User B, verifying that User B receives 404 on get, update, and delete, and receives an empty list on `GET /api/transactions`."*
- **Trap**: Don't return 403 Forbidden for a guessed ID; return 404 Not Found. Returning 403 reveals to an attacker that the resource exists.

#### Q4: Why do you return the same generic error for unknown email and wrong password?
- **Tags**: `[Basic]` `[Product]`
- **15-second answer**: To prevent account enumeration attacks.
- **60-second spoken answer**: *"If a login endpoint returns 'Email does not exist' for one request and 'Incorrect password' for another, an attacker can use this difference to enumerate which email addresses are registered in your database. In `server/src/controllers/auth.controller.js`, whether `User.findOne` returns null or `user.matchPassword` returns false, both paths return HTTP 401 with the exact same response: `{ success: false, message: 'Invalid email or password' }`."*

---

## 3. Database, Indexing & Data Modeling

#### Q5: Why did you choose MongoDB over a SQL database like PostgreSQL?
- **Tags**: `[Intermediate]` `[Product]` `[Service]`
- **15-second answer**: FinTrack transactions have variable metadata (UPI refs, dedupe hashes, AI confidence scores) that fit a document model with zero schema migrations.
- **60-second spoken answer**: *"Personal finance ledgers deal with semi-structured and evolving transaction shapes. A manual cash expense has just a title and amount, whereas a CSV imported statement row contains bank narrations, deduplication hashes, confidence scores, and raw merchant keys. In MongoDB, these optional fields live natively in the document without creating sparse relational columns or complex joins. In addition, because all personal finance queries are partitioned per user, MongoDB's horizontal scaling and compound indexes on `{ userId: 1, transactionDate: -1 }` give optimal read performance."*
- **Follow-ups**:
  - *Q: What if you needed double-entry bookkeeping?* -> *A: For commercial multi-account banking or institutional ledgers, PostgreSQL with strict ACID relational constraints would be preferred. For a single-user personal finance tracker, MongoDB document-level ACID guarantees are completely sufficient.*

#### Q6: What is a compound index, and what compound indexes did you create?
- **Tags**: `[Deep]` `[Product]`
- **15-second answer**: A compound index indexes multiple fields together. In FinTrack, we indexed `{ userId: 1, transactionDate: -1 }` and `{ userId: 1, type: 1, transactionDate: -1 }`.
- **60-second spoken answer**: *"Whenever a user opens their dashboard or transaction list, the backend queries `find({ userId }).sort({ transactionDate: -1 })`. In MongoDB, an index on `userId` alone would require fetching all of the user's documents into RAM and performing an in-memory sort. By creating the compound index `{ userId: 1, transactionDate: -1 }`, MongoDB navigates the B-tree directly to that user's node and reads the records in already-sorted date order. This eliminates the `SORT` stage, reducing execution time from linear to logarithmic."*

#### Q7: What is a partial unique index, and why did you use one on `dedupeHash`?
- **Tags**: `[Deep]` `[Product]`
- **15-second answer**: It enforces uniqueness only on documents matching a filter expression. We use it to ensure statement imports don't insert duplicate rows without breaking manual entries.
- **60-second spoken answer**: *"When a user imports a CSV bank statement, we compute a `dedupeHash` for each row to prevent re-importing the same file twice. However, manual transactions created through the UI do not have a `dedupeHash`—it is null. In MongoDB, a regular unique index treats multiple `null` values as duplicate keys and throws an error on the second manual transaction! We solved this by creating a partial unique index on `{ userId: 1, dedupeHash: 1 }` with `partialFilterExpression: { dedupeHash: { $type: 'string' } }`. This enforces uniqueness only when `dedupeHash` is a string, allowing unlimited manual transactions."*

---

## 4. Backend Engineering & REST Conventions

#### Q8: What HTTP status codes do you use across your APIs?
- **Tags**: `[Basic]` `[Service]`
- **15-second answer**: 200 OK for reads/updates, 201 Created for inserts, 400 for validation errors, 401 for unauthorized, 404 for not found, and 500 for server errors.
- **60-second spoken answer**: *"I followed standard REST semantics throughout the backend: `200 OK` for successful queries (`GET /api/transactions`, `GET /api/budget`); `201 Created` for resource creation (`POST /api/auth/signup`, `POST /api/transactions`); `400 Bad Request` for Zod validation failures or malformed inputs; `401 Unauthorized` for missing or invalid JWT tokens; `404 Not Found` when a requested resource or ID does not exist for the authenticated user; and `500 Internal Server Error` handled by our centralized error middleware in `app.js`."*

#### Q9: What happens if you forget to call `next()` in an Express middleware?
- **Tags**: `[Basic]` `[Service]`
- **15-second answer**: The request hangs indefinitely until the client or browser times out.
- **60-second spoken answer**: *"Express executes middleware in an ordered pipeline. If a middleware neither sends an HTTP response (like `res.json()`) nor calls `next()`, the pipeline stalls. The connection remains open and the client eventually experiences a gateway timeout (HTTP 504) or socket hang up. In FinTrack, our `protect` and `validate` middlewares guarantee that every execution branch either returns an error response or calls `next()`."*

---

## 5. Real Project Decisions & Behavioral

#### Q10: What was the hardest bug you encountered while building this?
- **Tags**: `[MUST]` `[Product]` `[Startup]`
- **15-second answer**: A Jest hook timeout during integration testing caused by `mongodb-memory-server` downloading a 600MB binary.
- **60-second spoken answer**: *"When I ran our full integration test suite, all 48 tests passed except `transactions.test.js`, which threw `Exceeded timeout of 5000 ms for a hook in beforeAll`. Looking at the console logs, I discovered that on the first run, `mongodb-memory-server` downloads the official 600MB MongoDB binary to cache locally. The download took 45 seconds on our network, exceeding Jest's default 5-second hook timeout. Rather than disabling tests, I added `jest.setTimeout(30000)` in `server/tests/setup.js`. Once downloaded, the binary was cached, and subsequent test runs finished in under 35 seconds across all 7 suites."*

#### Q11: Did you use AI to write this code, and what was your role?
- **Tags**: `[MUST]` `[Product]` `[Startup]`
- **15-second answer**: Yes. I acted as the systems architect and reviewer; I directed an AI agent to implement the code, and I verified everything through automated testing and code review.
- **60-second spoken answer**: *"Yes, I used Antigravity as an AI pair programmer. I defined the data models, system architecture, API contracts, and resilience patterns in detailed specifications. The AI wrote the initial boilerplate and implementation, and my role was senior review: catching subtle bugs, fixing version incompatibilities, ensuring user data isolation, and writing 48 automated integration tests using `mongodb-memory-server`. Using AI allowed me to build a production-grade multi-tier architecture in days while maintaining complete understanding and ownership of the system."*

