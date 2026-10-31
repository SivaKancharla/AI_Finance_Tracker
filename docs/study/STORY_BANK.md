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

