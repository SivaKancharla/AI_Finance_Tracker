# FinTrack Demo Scripts & Walkthroughs (Cumulative)
*Step-by-step click paths, talk tracks, and fallback plans for live interview presentations.*

---

## 1. Demo Credentials & Pre-Flight Checklist

- **Demo Account**: `demo@fintrack.dev` / `Demo@1234` (seeded via `npm run seed`)
- **Backend URL**: `http://localhost:5000`
- **Frontend URL**: `http://localhost:5173`
- **Pre-Flight Checks**:
  1. Open terminal: Ensure `npm test` is green.
  2. Start backend: `npm run server:dev` (runs on port 5000).
  3. Start frontend: `npm run client:dev` (runs on port 5173).
  4. Have one sample CSV statement ready on your desktop (`server/eval/sample_statement.csv`).

---

## 2. The 2-Minute Quick Demo (For Screening Rounds & Short Presentations)

### Target: Show core value, UI polish, and AI categorization in under 120 seconds.

| Time | What to Click | What to Say (Spoken Script) |
|---|---|---|
| **0:00 - 0:25** | Login screen -> Click 'Demo Account' -> Dashboard opens | *"FinTrack is an AI-powered personal finance tracker built specifically for Indian consumers. Here on the dashboard, we see monthly spending trends, category distributions via Recharts, and budget remaining—calculated strictly per calendar month."* |
| **0:25 - 0:55** | Go to **Transactions** page -> Click **'Add Transaction'** | *"Now let's add an unformatted expense: I'll enter `UPI-SWIGGY*ORDER 4521`, amount `₹349`, and leave Category as 'Auto (AI)'. Notice what happens when I save: the backend normalizes the merchant string, calls Gemini with structured output, and automatically categorizes it as 'Food' with high confidence."* |
| **0:55 - 1:25** | Edit the transaction -> Change category to **'Entertainment'** | *"Now, suppose the user wants to categorize this order as Entertainment. I change the category and save. FinTrack immediately writes this correction to `CategoryMemory`. The next time an order from this merchant appears, the system remembers the user's preference instantly without calling the LLM."* |
| **1:25 - 2:00** | Click **Insights** or **Reports** -> Show PDF button | *"Finally, our insights and monthly reports compute spending projections and allow one-click PDF export via PDFKit. The entire application is backed by comprehensive automated tests with zero-mock in-memory MongoDB."* |

---

## 3. The 5-Minute Deep Demo (For Technical & Hiring Manager Rounds)

### Target: Walk through architecture, CSV import, budget AI, and failure resilience.

1. **Architecture & Dashboard Walkthrough (1 minute)**:
   - Walk through the 5-box whiteboard diagram.
   - Explain that all calculations (savings, budget remaining, category percentages) are deterministic pure functions in JavaScript, avoiding LLM arithmetic errors.
2. **Interactive Transaction Entry & Memory Learning (1.5 minutes)**:
   - Add a transaction with automatic categorization.
   - Show the live suggestion chip debounce (600ms).
   - Change category to demonstrate the write to `CategoryMemory`.
3. **CSV Bank Statement Import Pipeline (1.5 minutes)**:
   - Drag and drop `sample_statement.csv`.
   - Show step 1 (upload) -> step 2 (preview table): show deduplication badges and PII masking.
   - Commit valid rows.
4. **Resilience & Fallback Demonstration (1 minute)**:
   - *The killer interview moment*: Disconnect your Wi-Fi or set an invalid API key.
   - Add another transaction: show how the app gracefully falls back to rule-based heuristics with a `rule` badge.
   - Conclude: *"The system never breaks for the user because an external AI provider went down."*

---

## 4. Plan B: What to Do If Anything Fails Live

| What Failed | What Happened | What to Say & Do (Plan B) |
|---|---|---|
| **Gemini API returns 429 / Quota Error** | The LLM call failed | *"Notice that the transaction still succeeded! The system caught the API error, logged it to `AiCallLog`, and fell back to our deterministic rule categorizer. The category badge shows 'Rule' instead of 'AI'. This demonstrates our graceful degradation architecture."* |
| **Local MongoDB / Server won't start** | Port already in use | Open terminal, run `npx kill-port 5000` and `npm run server:dev`. While it restarts, walk through the architecture diagram in `docs/study/00_PROJECT_OVERVIEW.md`. |
| **Browser cache issues** | Old state showing | Open Incognito window, navigate to `http://localhost:5173`, log in with `demo@fintrack.dev`. |

