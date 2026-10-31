# FinTrack Code Map (Cumulative)
*A feature-to-file reference so you can find any module in under 60 seconds.*

---

## 1. Feature Map Table

| Feature / Domain | File Path | Key Functions / Exports | One-Line Purpose | If Asked to Change X, Edit Here |
|---|---|---|---|---|
| **Canonical Categories & Lists** | [`server/src/constants/categories.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/constants/categories.js) | `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `PAYMENT_METHODS` | Single source of truth for categories and enums | To add a new category or payment method |
| **Environment & Config** | [`server/src/config/env.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/config/env.js) | `validateEnv`, `env` | Zod schema parsing, coercion, fail-fast startup | To add a new environment variable or change default port |
| **Express App Setup** | [`server/src/app.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/app.js) | `app` | Express configuration, Helmet, CORS, general rate limiter, 404, error handler | To add global middleware or mount a new top-level router |
| **Server Listener** | [`server/src/server.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/server.js) | `startServer` | Database connection, HTTP listening, graceful shutdown | To handle OS termination signals (SIGINT/SIGTERM) |
| **Database Connection** | [`server/src/config/db.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/config/db.js) | `connectDB` | Mongoose MongoDB connection helper | To modify MongoDB connection options |
| **User Model** | [`server/src/models/User.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/User.js) | `User`, `userSchema.pre('save')`, `matchPassword` | User schema, bcryptjs hashing, safe object serializer | To add user profile fields (phone, avatar) |
| **Transaction Model** | [`server/src/models/Transaction.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/Transaction.js) | `Transaction`, compound indexes | Core financial ledger schema, compound and partial indexes | To add transaction tags or attachments |
| **Budget Model** | [`server/src/models/Budget.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/Budget.js) | `Budget`, `categoryBudgetSchema` | Monthly budget and category limit storage | To change budget structure or validation |
| **Category Memory Model** | [`server/src/models/CategoryMemory.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/CategoryMemory.js) | `CategoryMemory` | Per-user learned merchant -> category mapping | To change confidence weights or memory retention |
| **AI Call Log Model** | [`server/src/models/AiCallLog.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/AiCallLog.js) | `AiCallLog` | Observability schema with 30-day TTL index | To change TTL retention days or log metadata |
| **JWT Auth Middleware** | [`server/src/middleware/auth.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/auth.js) | `protect` | Parses Bearer token, attaches `req.userId`, generic 401s | To change token header format or claims |
| **Zod Request Validator** | [`server/src/middleware/validate.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/validate.js) | `validate(schema, source)` | Validates `req.body`, `req.query`, or `req.params` | To change validation error response format |
| **Rate Limiters** | [`server/src/middleware/rateLimiters.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/middleware/rateLimiters.js) | `generalLimiter`, `authLimiter`, `aiLimiter` | Draft-7 IP and user rate limiting | To adjust rate limit windows or max requests |
| **Merchant Normalization** | [`server/src/services/categorization/normalize.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/normalize.js) | `normalizeMerchant` | Strips payment prefixes, punctuation, numbers; extracts 3 tokens | To add new payment prefixes (e.g., 'rtgs', 'paytm') |
| **Rule Categorizer** | [`server/src/services/categorization/ruleCategorizer.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/ruleCategorizer.js) | `ruleCategorize` | Keyword dictionary for deterministic categorization fallback | To add new merchant keywords or brand rules |
| **Categorization Pipeline** | [`server/src/services/categorization/pipeline.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/pipeline.js) | `categorizeTransactions`, `categorizeSingle` | Orchestrates Memory -> LLM -> Rules -> Default fallback chain | To adjust batch size (default: 10) or confidence threshold |
| **PII Masking Engine** | [`server/src/services/categorization/piiMask.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/piiMask.js) | `piiMask` | Strips emails, phones, PAN, Aadhaar before LLM transit | To add new PII patterns (e.g. credit card 16-digits) |
| **LLM Schemas & Zod Types** | [`server/src/services/llm/schemas.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/schemas.js) | `CategorizeResultSchema`, `CategorizeJsonSchema` | Zod validation schemas converted to strict JSON Schema for LLMs | To add fields to LLM structured output |
| **LLM Prompts & Anti-Injection** | [`server/src/services/llm/prompts.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/prompts.js) | `PROMPT_VERSION`, `SYSTEM_PROMPT_CATEGORIZE`, `buildCategorizeUserPrompt` | Anti-injection prompts with XML transaction isolation | To modify system instructions or prompt version |
| **Client-side Rate Gate** | [`server/src/services/llm/rateGate.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/rateGate.js) | `RateGate` | Token-bucket/queue enforcing 10 RPM to prevent provider 429s | To change outbound LLM request rate |
| **Groq LLM Provider** | [`server/src/services/llm/providers/groq.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/providers/groq.js) | `call` | Native fetch wrapper for Groq OpenAI-compatible API | To adjust Groq HTTP headers or base URL |
| **Gemini LLM Provider** | [`server/src/services/llm/providers/gemini.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/providers/gemini.js) | `call` | `@google/genai` SDK wrapper with timeout race | To adjust Gemini SDK generation parameters |
| **LLM Service Layer & Resilience** | [`server/src/services/llm/index.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/llm/index.js) | `generateStructured`, `LLMUnavailableError` | Multi-provider fallback, exponential backoff + jitter, self-repair retry loop, AiCallLog | To change provider priority order or max retries |
| **AI Controller (Categorize & Stats)** | [`server/src/controllers/ai.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/ai.controller.js) | `categorizeTransaction`, `getAiStats`, `calculatePercentile` | Handles `/api/ai/categorize` and `/api/ai/stats` observability | To add percentile metrics or change time window |
| **Timezone & Date Ranges** | [`server/src/services/analytics/dateRange.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/dateRange.js) | `getMonthRange`, `parseMonthParam`, `currentMonthKey`, `lastNMonthKeys` | Timezone-aware (IST) calendar-month calculations | To change default timezone offset or month format |
| **Summary & Trend Engine** | [`server/src/services/analytics/summary.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/summary.js) | `summarizeMonth`, `buildTrend`, `round2` | Pure functions for totals, savings, category splits, and 6-mo trend | To change rounding precision or category percentage calculation |
| **Spending Forecast Engine** | [`server/src/services/analytics/forecast.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/analytics/forecast.js) | `forecast` | Statistical run-rate blended with 3-month history and variance penalty | To tune confidence bounds or progression weighting |
| **Dashboard Controller** | [`server/src/controllers/dashboard.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/dashboard.controller.js) | `getDashboardSummary` | Fetches 6-month transaction slice and coordinates analytics | To modify recent transaction limit or dashboard response payload |
| **Monthly Reports Controller** | [`server/src/controllers/report.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/report.controller.js) | `getMonthlyReport` | Serves JSON reports and streams PDF downloads via PDFKit | To customize PDF layout, font styling, or table truncation |
| **AI Controller (Predict)** | [`server/src/controllers/ai.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/ai.controller.js) | `predictSpending` | Exposes `/api/ai/predict` forecast endpoint | To add additional forecasting options |
| **Auth Controller** | [`server/src/controllers/auth.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/auth.controller.js) | `signup`, `login`, `getMe`, `updateProfile`, `updatePassword`, `getAuthStats` | Authentication business logic | To customize login or profile update logic |
| **Transaction Controller** | [`server/src/controllers/transaction.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/transaction.controller.js) | `createTransaction`, `getTransactions`, `getTransactionById`, `updateTransaction`, `deleteTransaction` | Transaction CRUD, pagination, filtering, memory writing | To change sorting options or search filters |
| **Budget Controller** | [`server/src/controllers/budget.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/budget.controller.js) | `getBudget`, `setBudget`, `updateBudget` | User-scoped budget management | To change budget upsert behavior |
| **Meta Controller & Routes** | [`server/src/controllers/meta.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/meta.controller.js) | `getMeta` | Public metadata endpoint (`GET /api/meta`) | To expose new constants to the client |
| **Auth Validation Schemas** | [`server/src/validations/auth.validation.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/validations/auth.validation.js) | `signupSchema`, `loginSchema`, `updateProfileSchema`, `updatePasswordSchema` | Zod validation schemas for auth endpoints | To change password length or email validation rules |
| **Transaction Validation Schemas** | [`server/src/validations/transaction.validation.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/validations/transaction.validation.js) | `createTransactionSchema`, `updateTransactionSchema`, `transactionQuerySchema` | Zod validation schemas for transactions | To make description required or add new query fields |
| **Budget Validation Schemas** | [`server/src/validations/budget.validation.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/validations/budget.validation.js) | `budgetSchema`, `categoryBudgetSchema` | Zod validation with duplicate category check | To allow duplicate category limits or add period |

---

## 2. Five Live Coding Scenarios (If an Interviewer Asks You to Make a Change)

### 1. "Add a new category called 'Pets' or 'Charity'"
- **Files to edit**:
  1. [`server/src/constants/categories.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/constants/categories.js): Add `'Pets'` to `EXPENSE_CATEGORIES`.
  2. [`server/src/services/categorization/ruleCategorizer.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/services/categorization/ruleCategorizer.js): Add `{ category: 'Pets', keywords: ['vet', 'pet', 'dog', 'cat', 'heads up for tails'] }`.
- **Why this works**: `ALL_CATEGORIES`, validation schemas, Mongoose models, and `/api/meta` all automatically inherit from `categories.js`.

### 2. "Add a new payment method called 'crypto' or 'netbanking'"
- **Files to edit**:
  1. [`server/src/constants/categories.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/constants/categories.js): Add `'netbanking'` to `PAYMENT_METHODS`.
- **Why this works**: `PAYMENT_METHODS` is dynamically referenced by `Transaction.js` Mongoose enum, Zod validations, and `GET /api/meta`.

### 3. "Add a `tags` array to each transaction"
- **Files to edit**:
  1. [`server/src/models/Transaction.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/Transaction.js): Add `tags: { type: [String], default: [] }`.
  2. [`server/src/validations/transaction.validation.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/validations/transaction.validation.js): Add `tags: z.array(z.string()).optional()` to `createTransactionSchema` and `updateTransactionSchema`.
  3. [`server/src/controllers/transaction.controller.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/controllers/transaction.controller.js): Add `tags` to destructured request body in `createTransaction` and `updateTransaction`.

### 4. "Change the password minimum length from 8 to 10 characters"
- **Files to edit**:
  1. [`server/src/validations/auth.validation.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/validations/auth.validation.js): Update `.min(10)` on `signupSchema` and `updatePasswordSchema`.
  2. [`server/src/models/User.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/models/User.js): Update `minlength: [10, 'Password must be at least 10 characters']`.

### 5. "Change the JWT token expiration duration"
- **Files to edit**:
  1. [`server/.env`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/.env): Change `JWT_EXPIRE=7d` to `JWT_EXPIRE=30d` or `JWT_EXPIRE=15m`.
  2. [`server/src/config/env.js`](file:///c:/Users/kanch/Desktop/AI_Finance_Tracker/server/src/config/env.js): Adjust fallback default if needed.

