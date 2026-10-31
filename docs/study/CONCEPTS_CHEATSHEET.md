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

