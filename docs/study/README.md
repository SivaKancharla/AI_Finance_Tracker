# FinTrack Study Guide & Interview Prep System

Welcome, Siva. This directory is your personal interview playbook for **FinTrack (AI-Powered Personal Finance Tracker)**.

Antigravity writes the code, but **you own the architecture, decisions, trade-offs, and explanations**. You do not need to memorize lines of code. Your goal is to speak confidently, draw the architecture on a whiteboard in 60 seconds, and answer technical follow-ups like a senior engineer.

---

## 1. How to Use These Files (Time Guide)

### If you have 10 Minutes before an interview:
1. Open [`REVISION_SHEET.md`](./REVISION_SHEET.md).
2. Read the **30-second elevator pitch** aloud.
3. Review the **5-box whiteboard architecture** in your head.
4. Scan the **Top 5 Things NOT to Claim** (e.g. no "real-time", no "OpenAI", no "ML forecast").

### If you have 1 Hour before an interview:
1. Read [`00_PROJECT_OVERVIEW.md`](./00_PROJECT_OVERVIEW.md) to anchor your story and trade-offs.
2. Read the **Top 25 Must-Prepare Questions** in [`INTERVIEW_QA_BANK.md`](./INTERVIEW_QA_BANK.md).
3. Review your personal review triggers in [`WEAK_SPOTS.md`](./WEAK_SPOTS.md).
4. Review [`CODE_MAP.md`](./CODE_MAP.md) section on "5 Live Coding Requests" so you know where to look if an interviewer asks you to show the code.

### If you have 1 Day (Full Preparation):
1. **Morning**: Read [`00_PROJECT_OVERVIEW.md`](./00_PROJECT_OVERVIEW.md) and draw the architecture from memory 3 times.
2. **Mid-day**: Read the individual phase study docs in [`phases/`](./phases/) (15–20 minutes each). Practice the "Try it yourself" exercises.
3. **Afternoon**: Go through [`CONCEPTS_CHEATSHEET.md`](./CONCEPTS_CHEATSHEET.md) to cement backend fundamentals (indexes, JWT, salting, status codes).
4. **Evening**: Practice spoken STAR stories from [`STORY_BANK.md`](./STORY_BANK.md) and rehearse the 2-minute demo in [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
5. Run a mock interview in Antigravity chat: type `mock all product` or `mock all service`.

---

## 2. Directory Structure & File Map

| File | Purpose | When to Read |
|---|---|---|
| [`00_PROJECT_OVERVIEW.md`](./00_PROJECT_OVERVIEW.md) | Cumulative project vision, 30s/2min pitch, whiteboard diagram, tech stack trade-offs, defensible resume claims. | Start of every study session; updated every phase. |
| [`phases/`](./phases/) | Deep-dive study docs for each completed phase (P0 to P8) following a strict 13-section template. | When reviewing a specific module or feature. |
| [`CODE_MAP.md`](./CODE_MAP.md) | Exact mapping of Feature → File → Key Function → "If asked to change X, edit here". | When asked to show code or do live modifications. |
| [`INTERVIEW_QA_BANK.md`](./INTERVIEW_QA_BANK.md) | Tagged Q&As with 15s answers, 60s spoken answers, follow-ups, and common traps. | Practice answering out loud. |
| [`CONCEPTS_CHEATSHEET.md`](./CONCEPTS_CHEATSHEET.md) | Core software engineering fundamentals explained simply with real links to FinTrack code. | Preparing for general technical rounds (DBMS, Networks, OS, Web). |
| [`STORY_BANK.md`](./STORY_BANK.md) | Real STAR stories based strictly on build events, bugs, and architectural pivots. | Behavioral rounds and "Tell me about a time you solved a hard bug". |
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | Step-by-step clicks and talk tracks for 2-minute and 5-minute live demos, plus Plan B fallbacks. | Before live screen-share interviews. |
| [`WEAK_SPOTS.md`](./WEAK_SPOTS.md) | Running record of questions you missed during chat quizzes, with corrections. | Final revision check. |
| [`REVISION_SHEET.md`](./REVISION_SHEET.md) | Ultra-compact 1-page summary. | 10 minutes before joining the call. |

---

## 3. Tagging Guide

Every concept and question is tagged so you can prioritize your study time:

- **Importance**:
  - `[MUST]`: Asked in 80%+ of interviews. Non-negotiable.
  - `[SHOULD]`: Common follow-up or asked by product companies.
  - `[SKIP]`: Low priority or irrelevant trivia for your target roles.
- **Difficulty**: `[Basic]`, `[Intermediate]`, `[Deep]`.
- **Company Target**:
  - `[Service]` (TCS, Cognizant, Infosys): Focuses on definitions, syntax, status codes, standard DBMS/SQL/NoSQL differences, and high-level project walkthrough.
  - `[Product]` (Swiggy, Razorpay, Flipkart): Focuses on architectural trade-offs, race conditions, edge cases, partial failures, indexing mechanics, and why you rejected alternatives.
  - `[Startup]`: Focuses on velocity, practical security, user experience, reliability with low cost, and honest problem-solving.
  - `[AI-role]`: Focuses on prompt engineering, structured output, hallucinations, fallback chains, evaluation benchmarks, and rate gating.

---

## 4. Commands You Can Use in Antigravity Chat

- `quiz p1` or `quiz p0`: Antigravity will quiz you on 5 questions from that phase, evaluate your answers, and log any mistakes to `WEAK_SPOTS.md`.
- `mock p1 service` or `mock all product`: Full interactive mock interview.
- `explain <concept> simply`: Get a <150 word plain-English analogy.
- `pitch`: Practice your 30-second or 2-minute elevator pitch with live feedback.
- `next`: Move to the next phase after review.

