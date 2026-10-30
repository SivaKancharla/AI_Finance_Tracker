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


