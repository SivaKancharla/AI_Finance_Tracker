# 03 — Frontend Specification (Phase P6)

Read `00_START_HERE.md`, `01_SETUP_AND_ARCHITECTURE.md`, and the API contracts in `02_BACKEND_AND_AI_SPEC.md` first. The tutorial in `docs/reference/tutorial.md` has working examples of the auth flow, Redux slices, layout, dashboard, and charts. Reuse its structure, **but fix the defects listed in `00` §2.2** (especially glued template strings such as `` `Bearer ${token}` `` and Tailwind class strings).

---

## 1. Stack and structure

React 18, Vite, React Router v6+, Redux Toolkit, Axios, Recharts, Tailwind CSS 3.4.

```
client/src/
  pages/        Login, Signup, Dashboard, Transactions, Import, Budget, Insights, Reports, Profile
  components/
    layout/     Layout, Sidebar (collapsible on mobile), Navbar
    common/     Button, Input, Select, Modal, Toast, Spinner, Skeleton, EmptyState, ErrorBanner, Badge, ConfirmDialog, Pagination
    dashboard/  SummaryCard, TrendChart, CategoryPie, IncomeExpenseBar, BudgetProgress, RecentTransactions
    transactions/  TransactionForm, TransactionTable, CategoryChip, FiltersBar
    import/     UploadDropzone, ImportPreviewTable, ImportSummary
    budget/     CategoryBudgetRow, AiBudgetSuggestion
    insights/   InsightCard, ForecastPanel, AiStatsPanel
  redux/store.js and slices/ (auth, transactions, budget, insights, meta, ui)
  services/     api.js + authService, transactionService, importService, budgetService, dashboardService, reportService, aiService, metaService
  hooks/        useDebounce, useMonthParam
  utils/        format.js (currency in INR with en-IN grouping, dates)
```

---

## 2. Global behavior

- **API client (`api.js`)**: `baseURL = import.meta.env.VITE_API_URL || '/api'`. Request interceptor attaches `Authorization: Bearer ${token}` (note the space). Response interceptor clears the session **only on HTTP 401**.
- **Session hydration**: `isAuthenticated` is derived synchronously from `localStorage` token to avoid a login-page flash. `refreshUser` runs on load when a token exists; on **401** it clears the session, on other errors (network) it keeps the session and shows a banner.
- **Meta**: fetch `GET /api/meta` once after load into the `meta` slice. Category and payment-method dropdowns use it (fallback to a built-in list if the request fails).
- **Toasts** for success and error feedback (replace inline `message` strings from the tutorial).
- **Loading / empty / error states** on every data view. Use skeleton placeholders for cards and charts.
- **Responsive**: usable at 360 px wide. Sidebar collapses to a hamburger drawer below `lg`. Tables become stacked cards on small screens or scroll horizontally inside their container (no page-level horizontal scroll).
- **Accessibility basics**: labels linked to inputs, visible focus rings, buttons are `<button>`, modals trap focus and close on Esc, chart colors not the only carrier of meaning (add legends/labels), sufficient contrast.
- **Visual design**: clean, professional fintech look. Use the Tailwind theme colors from the tutorial (`primary #1f2937`, `secondary #3b82f6`, `accent #10b981`) as the base; consistent spacing, card radius, and typography; income = green, expense = red/rose, neutral = slate. Consistent chart palette across all charts. Do not use emoji as icons; use a small inline SVG icon set or `lucide-react`.
- **Currency/date formatting** via `format.js`: INR with `en-IN` grouping and no decimals in summaries, two decimals in tables; dates as `DD MMM YYYY`.

---

## 3. Routes

| Path | Page | Auth |
|---|---|---|
| `/login`, `/signup` | Login, Signup | public (redirect to `/dashboard` if already authenticated) |
| `/dashboard` | Dashboard | protected |
| `/transactions` | Transactions | protected |
| `/import` | Import | protected |
| `/budget` | Budget | protected |
| `/insights` | Insights | protected |
| `/reports` | Reports | protected |
| `/profile` | Profile | protected |
| `*` | redirect to `/dashboard` | |

---

## 4. Pages

### 4.1 Login / Signup
Email + password forms with inline validation (email format, password min 8, confirm match on signup), disabled submit while loading, server error shown in an error banner. Link between the two pages. Include a small "Try the demo account" hint on Login only when `VITE_DEMO_HINT=true` (shows the seeded demo credentials).

### 4.2 Dashboard
- **Month selector** (previous / next month buttons + label; stored in the URL query `?month=YYYY-MM`). Default current month.
- **Summary cards (4):** Income, Expenses, Savings, Budget remaining (shows "No budget set" with a link to the Budget page when `budgetRemaining` is `null`).
- **Budget progress bar** for the selected month with color tiers (green < 80 %, amber 80–99 %, red ≥ 100 %) and the overspend alert text.
- **Charts (Recharts, all inside `ResponsiveContainer`):**
  - Line or area chart: monthly expense trend (last 6 months).
  - Donut chart: category distribution for the selected month, with legend and percentages.
  - Grouped bar chart: income vs expense by month.
- **Forecast strip:** "Projected this month: ₹X (confidence Y %)" and a warning chip when `budgetRisk` is true.
- **Recent transactions** (5), each with a category chip.
- Charts have tooltips with INR formatting; empty states when there is no data ("Add your first transaction or import a statement").

### 4.3 Transactions (this page has **no code in the tutorial**; build it fully)
- **Filters bar:** search (debounced 400 ms), type, category, date range (from/to), sort. Changing any filter resets to page 1. Filters sync with the URL query so refresh keeps them.
- **Table:** date, title (+ description in muted text), category chip, amount (colored by type), payment method, actions (edit, delete). Pagination from server `pagination`.
- **Category chip** shows the category and, when `categorySource` is `llm`, `memory`, or `rule`, a small badge ("AI", "Learned", "Rule"). When `needsReview` is true show an amber "Review" badge; clicking opens the edit modal focused on the category.
- **Add/Edit modal (same form component):** fields: type (toggle), title, description, amount, date, payment method, category.
  - Category control: a select that includes **"Auto (AI)"** as the default for new transactions.
  - **Live suggestion:** when the user has typed a title (>= 3 chars) and amount, after a 600 ms debounce call `POST /api/ai/categorize` and show a suggestion row: "Suggested: **Food** (92 %) · AI" with a button "Use this". Show a spinner while loading, a subtle message when the AI is unavailable ("Suggestion unavailable, using rules") and never block saving. Cancel stale requests (AbortController or request id).
  - On save with "Auto (AI)", the server decides; after save, a toast shows the final category and source.
- **Delete** with a confirm dialog. After create, update, or delete, refetch the list so pagination totals are correct.
- Empty state with call-to-action buttons: "Add transaction" and "Import CSV".

### 4.4 Import (CSV)
Three steps in one page with a step indicator:
1. **Upload:** drag-and-drop zone and file picker, accepts `.csv` only, shows file name and size, shows the max rows/size limits, link to download a **sample CSV** (`/sample_statement.csv` placed in `client/public/`, copied from `server/eval/sample_statement.csv`).
2. **Review:** calls `/import/preview`. Show the summary chips (total, valid, invalid, duplicates, needs review, counts by source) and a table of rows: date, title, amount, type, **editable category dropdown** (changing it marks the row `edited`), confidence bar, source badge, status (OK / Duplicate / Invalid with reasons). Provide filters: "Needs review only", "Hide duplicates". Duplicates and invalid rows are excluded from the commit by default (duplicates can be toggled but default off). A "Select all / none" control per row group.
3. **Done:** calls `/import/commit` with the included rows (sending `source` and `edited`). Show a result summary (imported / duplicates skipped / failed) with a link to Transactions.
Handle API errors (file too large, too many rows, wrong type) with clear messages. Disable buttons while requests are running.

### 4.5 Budget
- Monthly budget input and the per-category limit rows (category select from meta, limit input, remove button, **no duplicate categories**). Show per-category progress for the **current month** using `categoryBudgetStatus` from the dashboard summary.
- **"AI suggest budget" button** → `POST /api/ai/budget-optimize`. Shows `AiBudgetSuggestion`: suggested monthly budget, a table of suggested limits with reasons, and tips, plus a provider badge (`gemini` / `groq` / `heuristic`). Buttons: "Apply to form" (fills the inputs; **does not save**) and "Dismiss". The user must press Save. If `not_enough_data`, show a friendly message.
- Save via `POST /api/budget`; after saving, refetch the dashboard summary.

### 4.6 Insights
- **Insight cards** from `POST /api/ai/insights` with severity styling (info/warning/critical) and a provider badge. "Refresh" button (`?force=1`) with cooldown of a few seconds to avoid spamming.
- **Forecast panel** from `POST /api/ai/predict`: projected month-end, historical average, confidence meter, budget-risk warning, and an explanation line ("Based on your spending so far this month and your last N months").
- **AI usage panel** from `GET /api/ai/stats`: success rate, average latency per provider, fallback rate, and a small bar chart of categorization by source (memory / AI / rule / manual / import). Label it "AI reliability (last 30 days)".

### 4.7 Reports
Month/year pickers, summary cards, category bar chart, transaction list for the period, and an **Export PDF** button (blob download, correct filename `finance-report-YYYY-MM.pdf`, error toast on failure, spinner while generating).

### 4.8 Profile
Update name/email, change password (min 8, show server errors), and account statistics. Logout is in the sidebar.

---

## 5. Redux slices (minimum state)

- `auth`: `user`, `token`, `isAuthenticated`, `loading`, `error`; thunks `loginUser`, `signupUser`, `refreshUser`, `updateProfileThunk`; reducer `logout`.
- `meta`: `expenseCategories`, `incomeCategories`, `paymentMethods`, `loaded`; thunk `fetchMeta`.
- `transactions`: `items`, `pagination`, `filters`, `loading`, `error`; thunks `fetchTransactions`, `saveTransaction`, `removeTransaction`.
- `budget`: `monthlyBudget`, `categoryBudgets`, `loading`, `error`; thunks `fetchBudget`, `saveBudget`.
- `insights`: `insights`, `provider`, `forecast`, `stats`, `loading`, `error`; thunks `fetchInsights`, `fetchForecast`, `fetchAiStats`.
- `ui`: toast queue.
Local component state is fine for the dashboard summary, import wizard, and budget suggestion (single-page use).

---

## 6. API service functions (match `02` exactly)

`signup, login, getMe, updateProfile, changePassword, getAccountStats`; `getTransactions(params), createTransaction, updateTransaction, deleteTransaction, previewImport(file), commitImport(rows)`; `getBudget, setBudget`; `getDashboardSummary(month)`; `getMonthlyReport(params), downloadMonthlyReport(params)`; `categorize(body), optimizeBudget(), generateInsights(force), predictSpending(), getAiStats()`; `getMeta()`.

`previewImport` sends `multipart/form-data` with field name `file`.

---

## 7. Quality bar

- No `console.error` noise in normal flows; no unhandled promise rejections.
- Every form: validation, disabled-while-loading, error display.
- No layout shift on loading (skeletons with fixed heights).
- Production build (`npm run build`) succeeds. `vite preview` works against a running backend.
- Keep components small (< ~200 lines each); extract chart components.

---

## 8. Optional polish (only after everything else works)

Dark mode toggle, keyboard shortcut to add a transaction, CSV export of filtered transactions, a Playwright smoke test of login → add transaction → dashboard.

---

## 9. End-to-end flows that must work (Phase P6 exit criteria)

1. Sign up → lands on the empty Dashboard with the "Add your first transaction" state.
2. Add an expense with "Auto (AI)" → live suggestion appears → save → category and AI badge shown in the list.
3. Edit that transaction's category → add another with a similar title → it is categorized as "Learned" (memory) instantly.
4. Import `sample_statement.csv` → review (edit one category, one duplicate flagged, one invalid row shown) → commit → Dashboard charts update.
5. Re-import the same file → everything flagged duplicate; commit imports 0.
6. Set a monthly budget → progress bars and overspend alert respond; "AI suggest budget" fills the form without saving until Save is clicked.
7. Insights page shows insights, forecast, and AI reliability stats.
8. Export the monthly PDF; it downloads and opens.
9. With **no LLM key configured** (server), flows 2, 4, 6, 7 still work using rule/heuristic fallbacks and show the `rule` / `heuristic` badges.
10. Logout → protected routes redirect to login; refreshing keeps the session when logged in.
