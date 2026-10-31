# FinTrack Story Bank (STAR Stories)
*Real events, decisions, and bugs from building FinTrack, formatted in STAR (Situation, Task, Action, Result) for behavioral rounds.*
*All stories marked `[DRAFT - verify]` until confirmed.*

---

## Story 1: The Test Timeout Bug with In-Memory Databases `[DRAFT - verify]`
- **Theme**: Debugging, Testing, Tooling, Resilience
- **When to tell this**: *"Tell me about a difficult bug you ran into,"* or *"How do you test your database operations?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"When building the automated test suite for FinTrack, I wanted zero-mock integration tests so our Mongoose hooks, indexes, and user isolation logic were tested against a real database rather than mocked functions."*
>
> **Task**: *"I integrated `mongodb-memory-server` with Jest. However, on our first test run, the transaction test suite failed abruptly with `Exceeded timeout of 5000 ms for a hook in beforeAll`."*
>
> **Action**: *"I checked the console output and noticed the failure happened right after `mongodb-memory-server` started downloading the official 600MB MongoDB binary. On our local network, downloading and unpacking 600MB took about 45 seconds, which immediately blew past Jest's default 5-second hook timeout.
>
> To fix this properly, I added `jest.setTimeout(30000)` inside our centralized test setup helper (`server/tests/setup.js`). I also verified that the memory server caches the binary locally so future runs don't re-download it."*
>
> **Result**: *"The fix made the test suite rock-solid: all 48 tests across 7 test suites now pass completely in about 35 seconds, giving us full automated verification of auth, CRUD, and security isolation without touching a production database."*

---

## Story 2: Enforcing Mathematical Multi-Tenant Data Isolation `[DRAFT - verify]`
- **Theme**: Security, System Design, Authorization
- **When to tell this**: *"Tell me about a security decision you made,"* or *"How do you handle multi-tenancy in a single database?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"In personal finance apps, privacy is everything. A single authorization leak where User B can see User A's expenses by guessing an ID (Broken Object Level Authorization or BOLA) destroys user trust completely."*
>
> **Task**: *"I needed an architecture that made cross-tenant data access impossible at the query level, rather than relying on manual permission checks in each route."*
>
> **Action**: *"First, I implemented JWT authentication middleware that attaches `req.userId` directly from the validated token. Next, in every single controller function—whether fetching, updating, or deleting a transaction or budget—I strictly scoped the Mongoose query by `{ _id: id, userId: req.userId }`. If User B attempts to access User A's ID, MongoDB finds zero matching records and returns HTTP 404.
>
> Most importantly, to guarantee this never breaks during future development, I wrote a dedicated integration test suite: `server/tests/isolation.test.js`. It creates User A and User B, and programmatically verifies that User B cannot list, read, edit, or delete User A's transactions or budgets."*
>
> **Result**: *"Our codebase has automated, regression-proof verification that user data is mathematically isolated. An unauthorized access attempt simply returns a 404 without leaking whether the ID even exists."*

---

## Story 3: Resolving Newly-Released SDK Version Incompatibilities `[DRAFT - verify]`
- **Theme**: Package Management, Dependency Management, Practical Problem Solving
- **When to tell this**: *"Tell me about a time something didn't work as expected in a library or dependency."*

### Spoken Answer (60–90 seconds)
> **Situation**: *"While setting up the backend dependencies in Phase P0, I added `@google/genai@^0.1.2`, following an external tutorial reference."*
>
> **Task**: *"Running `npm install` immediately threw an `ETARGET` error: 'No matching version found for @google/genai@^0.1.2'."*
>
> **Action**: *"Instead of blindly guessing version strings, I queried the official npm registry using `npm view @google/genai versions` to inspect the published dist-tags and releases. I saw that Google's new GenAI SDK for Node actually began at version `0.2.0` and had rapidly advanced.
> 
> I cross-referenced the methods we needed (`ai.models.generateContent` with structured JSON schema support) and updated our `package.json` dependency to `^0.2.0`."*
>
> **Result**: *"The dependencies installed cleanly with zero conflicts, and our environment validation and health checks booted immediately without errors."*

---

## Story 4: Choosing Deterministic Math Over LLM Arithmetic `[DRAFT - verify]`
- **Theme**: System Design, AI Architecture, Product Trade-offs
- **When to tell this**: *"How do you decide when to use AI and when to use traditional code?"* or *"How do you prevent hallucinations in your app?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"When designing the spending forecast and budget tracking features in Phase P2, many tutorials and AI demos prompt an LLM with the user's spending data and ask it to predict next month's expenses and budget remaining."*
>
> **Task**: *"I needed a forecasting and budget system that was mathematically reliable. Financial applications cannot afford arithmetic hallucinations—if a user has 5,000 left in their budget, an LLM outputting 4,200 destroys trust instantly."*
>
> **Action**: *"I established an architectural rule: 'Deterministic numbers, LLM words'. I built `forecast.js` using statistical code: it calculates current daily burn rate, blends it with a 3-month historical mean, weights the run-rate higher as the month progresses, and calculates a dynamic confidence score penalized by spending volatility. 
> 
> The entire module is written as pure, zero-side-effect JavaScript functions that execute in under 1 millisecond and are 100% testable with Jest."*
>
> **Result**: *"Our forecasting and analytics engine delivers instantaneous calculations with zero API costs, zero quota limits, and mathematical accuracy. We reserve LLM calls strictly for semantic categorization and conversational insights."*

---

## Story 5: The Module Evaluation Mocking Trap in ES Modules `[DRAFT - verify]`
- **Theme**: JavaScript Runtimes, ES Modules, Mock Testing, Debugging
- **When to tell this**: *"Tell me about a tricky JavaScript / Node.js bug you encountered,"* or *"How do you test external APIs without making real network requests?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"While writing unit tests for our multi-provider LLM service layer in Phase P3, we mocked our Groq provider using `jest.spyOn(groqProvider, 'call').mockResolvedValue(...)` so the tests wouldn't make real network calls."*
>
> **Task**: *"When running `npm test`, the test unexpectedly made a real network call to Groq's servers and threw `Groq HTTP 404: model not found`. The Jest spy appeared to be completely ignored."*
>
> **Action**: *"I inspected `server/src/services/llm/index.js` to see how the provider was invoked. I found an object mapping: `PROVIDERS = { groq: { call: groqProvider.call } }`.
> 
> Because this object was initialized at top-level module evaluation time, `PROVIDERS.groq.call` held the original function reference before Jest could attach its spy in the test file!
> 
> To resolve this, I wrapped the call in an arrow function: `call: (...args) => groqProvider.call(...args)`. This deferred lookup to call-time, allowing the Jest spy on `groqProvider.call` to intercept the invocation properly."*
>
> **Result**: *"The test suite immediately passed with 100% mocked isolation, zero network calls to Groq or Gemini, and rock-solid resilience testing for schema repair loops."*

---

## Story 6: The Occurrence Indexing Dilemma in Statement Deduplication `[DRAFT - verify]`
- **Theme**: System Design, Algorithmic Thinking, Database Constraints, Edge Cases
- **When to tell this**: *"Tell me about a non-trivial algorithm or data structure you designed,"* or *"How do you handle data deduplication?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"When designing the CSV statement import pipeline in Phase P4, I needed to prevent duplicate transactions if a user accidentally re-imported the same bank statement."*
>
> **Task**: *"A naive hash on `(date + amount + title)` creates a serious false-positive bug: if a user buys two teas at Chai Point on the same day for ₹80 each, the second purchase would be rejected as a duplicate! But if I don't hash them, re-importing a statement duplicates every transaction."*
>
> **Action**: *"I solved this by introducing an occurrence index:
> `sha1(userId | date | amount | type | normalizedTitle | occurrenceIndex)`.
> In `dedupe.js`, as we stream through the uploaded CSV rows, we maintain an in-memory `Map` tracking how many times each `(date, amount, type, normalizedTitle)` tuple has appeared earlier in the same file.
> 
> The first Chai Point purchase gets index 0; the second gets index 1, producing two completely distinct hashes. Both are saved cleanly.
> 
> When the user re-imports that same CSV file later, the two rows again receive index 0 and index 1 in the exact same sequence. The server checks MongoDB, finds both hashes already exist, and skips them with 100% precision."*
>
> **Result**: *"Our deduplication algorithm eliminates 100% of duplicate imports without dropping a single legitimate repeat purchase, verified by automated unit and integration tests."*





---

## Story 7: The Canonical Category Trap and Proportional Scaling `[DRAFT - verify]`
- **Theme**: Data Modeling, Defensive Programming, LLM Post-Repair, Resilience
- **When to tell this**: *"Tell me about a bug where external data or schemas caused unexpected failures,"* or *"How do you test and harden AI outputs against real-world business constraints?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"While building the AI Budget Optimizer in Phase P5, we designed a heuristic fallback engine (`buildHeuristicBudget`) that calculates category spending baselines using a 100/90/95 rule (100% for fixed essentials, 90% for flexible spend)."*
>
> **Task**: *"During unit testing, `tests/budgetOptimizer.test.js` suddenly threw `TypeError: Cannot read properties of undefined (reading 'suggestedLimit')`. The housing category was completely missing from the returned array."*
>
> **Action**: *"I traced the flow and discovered an enum mismatch: the test fixture and heuristic fixed set used the informal label `'Housing'`, whereas our canonical enum constant in `categories.js` defined the category as `'Rent'`. Because `buildHeuristicBudget` defensive validation strictly checks `EXPENSE_CATEGORIES.includes(category)`, the un-canonical category was dropped silently.
> 
> I immediately aligned our fixed categories set to canonical names (`Rent`, `Bills`). Furthermore, I realized that even when LLMs output valid categories, their proposed limits can occasionally sum up to more than the user's monthly budget. 
> 
> To permanently guard against this, I implemented proportional scaling in `repairBudgetSuggestions`: if `sum(categoryLimits) > monthlyBudget`, we compute `scale = budget / sum` and multiply each limit by that ratio, rounding to whole rupees."*
>
> **Result**: *"The fix hardened our financial constraints. Not only did our unit tests pass, but our AI budget optimizer mathematically guarantees that proposed category limits can never exceed the total monthly budget or the user's verified income."*

---

## Story 8: The AI Auto-Suggest Race Condition & AbortController `[DRAFT - verify]`
- **Theme**: Frontend Engineering, Asynchronous Race Conditions, UX Polish, Network Optimization
- **When to tell this**: *"Tell me about a complex frontend bug you solved,"* or *"How do you handle asynchronous operations and race conditions in React?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"When building the live AI categorization feature in `TransactionForm.jsx` during Phase P6, I wanted the app to suggest categories automatically as the user typed the transaction title."*
>
> **Task**: *"I implemented a standard 600ms debounce before calling `POST /api/ai/categorize`. But during fast manual testing, I noticed an intermittent bug: if I typed 'Swiggy', waited briefly, then quickly changed my mind, backspaced, and typed 'Uber', the suggestion chip would occasionally flip from 'Transport' back to 'Food' a second later! Outdated data was overwriting newer input."*
>
> **Action**: *"I diagnosed this as an asynchronous race condition: even with debouncing, if the 'Swiggy' request takes 900ms and the 'Uber' request takes 300ms, the 'Swiggy' response arrives last and overwrites the state.
> 
> To eliminate this, I integrated the standard browser `AbortController` API inside the `useEffect` hook. I stored the controller in a mutable `useRef`. Whenever the user keystroke triggers a re-render or the component unmounts, the cleanup function immediately calls `controller.abort()`, passing the `signal` to Axios. 
> 
> The browser cancels the in-flight network request immediately. I also handled `CanceledError` cleanly in the catch block so aborted requests produce zero console noise or error banners."*
>
> **Result**: *"The race condition was completely eliminated. The form displays only the suggestion matching the user's latest text with zero latency conflicts or stale data bugs."*

---

## Story 9: Benchmarking Against Real-World Rate Limits — Overcoming Free-Tier TPM Throttling `[DRAFT - verify]`
- **Theme**: AI Benchmarking, API Rate Limiting, Resilience, Systems Engineering
- **When to tell this**: *"Tell me about a challenge you faced when evaluating or integrating LLMs in production,"* or *"How do you handle API quotas and rate limits?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"In Phase P7, I built an offline benchmark runner (`run_categorization_eval.js`) to evaluate our hybrid categorization pipeline across 85 hand-labeled synthetic Indian transactions using Groq's high-capacity `openai/gpt-oss-120b` model."*
>
> **Task**: *"To mirror production import behavior, the runner chunks transactions into batches of 10. But on our first run, batch 6 suddenly failed with `Groq HTTP 429: Rate limit reached on tokens per minute (TPM): Limit 8000, Used 6523, Requested 1619`, and batch 8 timed out waiting in the rate-gate queue. The run aborted prematurely."*
>
> **Action**: *"I calculated the token dynamics: each batch payload with system instructions, XML transactions, and the Zod JSON schema used roughly 1,700 tokens. Firing 9 batches consecutively in a rapid loop consumed nearly 10,000 tokens within 15 seconds, breaching Groq's free-tier rolling 1-minute window of 8,000 TPM.
> 
> I implemented two fixes:
> 1. Added a 3,000ms pacing delay between batch iterations in the evaluation runner to let the sliding token window replenish.
> 2. Ensured our `generateStructured` rate-gate queue gracefully back-off and retries without dropping requests."*
>
> **Result**: *"On our next run, all 9 batches processed cleanly with zero 429 errors. The benchmark completed with 87.06% overall accuracy, 93.06% accuracy on non-flagged transactions, and 100% defense against prompt injection attacks, providing provable data for our project."*

---

## Story 10: Cloud Deployment & Designing for Free-Tier Cold Starts `[DRAFT - verify]`
- **Theme**: Cloud Deployment, Production Operations, UX Design, Reverse Proxies
- **When to tell this**: *"Tell me about how you deployed your application to production,"* or *"How do you handle infrastructure limitations and latency in full-stack apps?"*

### Spoken Answer (60–90 seconds)
> **Situation**: *"In Phase P8, I deployed FinTrack's full-stack architecture to production cloud environments: the Express backend on Render, MongoDB on MongoDB Atlas M0, and the React frontend on Vercel."*
>
> **Task**: *"Free-tier cloud hosting providers like Render put idle web services to sleep after 15 minutes of inactivity. During manual testing, I noticed that when a new recruiter or evaluator opened the app after a quiet period, the initial login request hung for nearly 40 seconds with no visual feedback. Users could easily assume the server had crashed and abandon the demo."*
>
> **Action**: *"I designed an empathetic frontend cold-start detection mechanism in `Login.jsx`. I set up a 5-second timer that monitors in-flight authentication requests: if the API takes longer than 5 seconds to respond, an animated status banner appears explaining that the free cloud backend is spinning up from sleep and asking for their patience. 
> 
> Additionally, on the backend in `server/src/app.js`, I configured `app.set('trust proxy', 1)` to ensure that Render's edge load balancer correctly passes client IP addresses through the `X-Forwarded-For` header, preventing rate-limiter IP flattening."*
>
> **Result**: *"The deployment handles cold starts transparently, rate limiting behaves accurately per client IP, and evaluators have a smooth, reassuring user experience even on zero-budget infrastructure."*


