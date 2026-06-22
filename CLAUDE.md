# Langevin — FP&A GL Analysis Tool

## Elevator pitch
Langevin is an AI-native financial analysis tool that turns a raw general ledger export into a complete management report in seconds. Upload an Excel or CSV file, and the app automatically classifies every account, builds a P&L and balance sheet, detects your industry, generates AI commentary per account, and surfaces cash flow, working capital, and budget variance insights — all without touching a spreadsheet.

---

## Product overview

**Target users:** CFOs, FP&A analysts, controllers, and finance teams at SMEs and real estate / professional services firms who produce monthly management reports from accounting software exports.

**Core problem solved:** Building a monthly management pack from a GL export is tedious — copy-pasting into Excel templates, manually writing variance commentary, formatting charts. Langevin eliminates all of that in one upload.

**Deployment:** Web app, hosted on Vercel. No install. Works on any device with a browser.

**AI model:** Anthropic Claude (claude-sonnet-4-6 for analysis, claude-haiku-4-5 for streaming summaries).

---

## UI / UX design

### Visual identity
- **Brand name:** Langevin (named after physicist Paul Langevin — evokes precision and signal-from-noise)
- **Color palette:** Warm beige/parchment tones — `#F5EDD8` background, `#FDFAF5` card surface, `#C4364F` dark red accent. Feels like a high-end paper document, not a generic SaaS dashboard.
- **Typography:** Inter / system sans-serif. Tabular numerals on all financial figures.
- **Design language:** Completely flat — no border-radius anywhere. Clean, editorial, CFO-appropriate. Inspired by financial terminal aesthetics without the complexity.
- **Logo:** Dark red SVG mark in the top-left of the left navigation.

### Layout
- **Fixed left sidebar (224px):** Navigation with tabs — Dashboard, Analysis, Budget, P&L, Balances. Shows the uploaded filename and a file chip once a GL is loaded.
- **Top bar:** Period selector (global), ⌘K command palette button, AI summary strip (one-sentence streaming insight that auto-generates after analysis).
- **Main content area:** Full-width, scrollable. Each tab renders independently.

### Upload experience
- Full-screen centered upload card on first load — large drag-and-drop zone.
- Supports: `.xlsx`, `.xls`, `.csv`, `.pdf`, `.docx`, `.eml` (GL + supporting documents).
- After file selection, user picks auth mode (shared password or own API key) and clicks **Analyze**.
- Loading screen with status messages while Claude classifies accounts.

### Command palette (⌘K)
- Keyboard-triggered overlay for quick tab navigation and actions.
- Accessible without mouse — power-user feature.

---

## Features

### 1. Universal GL parsing
Handles diverse general ledger export formats automatically:
- **Auto-detects the header row** — scans all sheets and first 25 rows, scores each row against GL keyword vocabulary (date, account, debit, credit, etc.)
- **Multi-sheet detection** — picks the most data-rich sheet automatically
- **Yardi-style exports** — skips company name / report title rows at the top, section header rows ("1000 · Operating Cash"), beginning balance rows
- **Merged cells** — forward-fills vertically merged Excel cells before parsing
- **Wide/transposed format** — detects period-as-column layouts and unpivots to long format
- **Journal entry grouping** — forward-fills date/description from JE header rows to child transaction rows
- **Parentheses negatives** — converts `(1,234.56)` to `-1234.56`, strips currency symbols
- **8 date format normalizers** — handles `DD-Mon-YY`, `Mon DD YYYY`, `YYYYMMDD`, slash/dot variants, etc.
- **No-header fallback** — infers column types from data patterns when no keyword match is found
- **Multi-currency** — deprioritizes FC/foreign columns in favor of base-currency columns

### 2. AI account classification
On upload, Claude reads the file headers, a sample of rows, and all unique account names, then:
- Maps columns to semantic roles (date, account, debit, credit, description, vendor, balance)
- Classifies every account into: `revenue`, `cogs`, `expense`, `ap`, `ar`, `cash`, `asset`, `equity`, or `unmatched`
- Results are stored and can be manually overridden per account with a click
- Re-classification is available at any time via a "Reclassify" button

### 3. Industry framework auto-detection
Detects the accounting framework from account names and adapts all labels and AI prompts:

| Industry | Detected from | "COGS" label | Gross metric |
|---|---|---|---|
| Standard | Default | COGS | Gross Profit |
| Real Estate | rental income, NOI, CAM, tenant, lease… | Property Operating Expenses | NOI |
| Financial Services | net interest, provision for, loan loss… | Provision / Cost of Funds | Net Revenue |
| SaaS / Tech | ARR, MRR, churn, subscription, hosting… | Cost of Revenue | Gross Profit |
| Professional Services | billable, consulting, retainer, utilization… | Cost of Services | Gross Profit |
| Healthcare | patient, clinical, pharmacy, capitation… | Cost of Care | Clinical Margin |
| Non-Profit | donation, grant, beneficiary, endowment… | Program Expenses | Program Surplus |

User can override the detected framework via a dropdown in the period bar. All tables, charts, and AI prompts update instantly.

### 4. Dashboard tab
High-level KPI strip with 11 metrics:
- **NOI / Gross Profit Margin** (framework-adaptive label)
- **EBITDA Margin**
- **AR Balance** (opening + net invoiced vs collected)
- **AP Balance** (opening + net billed vs paid)
- **Cash Position**
- **Working Capital** + current ratio
- **Monthly Burn Rate**
- **Runway** (months at current burn)
- **DSO** — Days Sales Outstanding
- **DPO** — Days Payable Outstanding
- **Transaction count** + unmatched count

Streaming AI summary sentence in the top bar (generated by claude-haiku for speed): one-sentence financial story for the period.

### 5. Analysis tab
The primary analytical view. Three sub-sections:

**A. Analyst-style P&L table**
- Single period: `Account | Amount | % of Rev | Comment`
- Comparison mode: `Account | Period 1 | Period 2 | Δ$ | Δ% | Comment`
- Section header rows (Revenue / COGS or framework equivalent / Operating Expenses)
- Bold subtotal rows: Total Revenue, NOI/Gross Profit, EBITDA (labels adapt to framework)
- Each account row is clickable → expands inline transaction detail (date, description, amount, % share)
- Variance Δ$ and Δ% are color-coded: green = favorable, red = unfavorable (direction-aware per account type)

**B. AI variance commentary (Comment column)**
- One-sentence AI-generated insight per account, shown inline in the table
- Shows `…` while generating, then populates without page reload (streaming-aware)
- Click any comment to copy it to clipboard
- Commentary is generated once on first load; period changes show a **"Commentary reflects a different period"** banner with a **Regenerate** button — no wasted API calls

**C. Balance Sheet section**
- Card-style view per BS account
- Shows opening balance → movement → closing balance
- Expandable transaction breakdown per account

**D. Comparison mode**
- Activate via **+ Compare** button → pick a reference period from the same file, or upload a second GL file
- Cross-file comparison supports two different fiscal years or entities
- Summary bridge table appears at top: Revenue / COGS / Gross Profit / Expenses / EBITDA side-by-side

### 6. P&L tab
Monthly or quarterly time-series P&L table:
- All periods as columns, accounts as rows, grouped by type
- Toggle between monthly and quarterly aggregation
- Monthly chart (bar + line): Revenue vs Expenses vs EBITDA trend
- Clicking a section header (Revenue, COGS, Expenses) collapses/expands account detail rows

### 7. Budget tab
Budget vs actual variance analysis:
- Upload a budget file (separate Excel/CSV) alongside the GL
- Variance table: `Account | Budget | Actual | Δ$ | Δ%` grouped by Revenue / COGS / Expenses
- Favorable/unfavorable color-coding (direction-aware)
- AI-generated budget commentary per account
- Summary KPI strip: total budget vs actual revenue, costs, EBITDA, and variance
- Industry framework labels apply (NOI, Cost of Revenue, etc.)

### 8. Balances tab (AR/AP aging)
- AR and AP aging buckets: Current, 30, 60, 90, 90+ days
- As-of date picker
- Pie chart of aging distribution
- Top vendors/customers table

### 9. Supporting documents
- Upload additional context files alongside the GL: PDF, Word, email (`.eml`), etc.
- Documents are extracted and injected into Claude's prompt as context
- AI commentary cross-references supporting documents (e.g. "rent increase mentioned in lease amendment matches the March GL entry")

### 10. Access modes
Three subscription plans gated by Clerk auth + Stripe:
- **Starter ($49/mo):** 1 user, 3 entities included (+$15 each), shared AI proxy (our key)
- **Business ($149/mo):** Unlimited seats, 10 entities (+$10 each), shared AI proxy
- **BYOK ($25/mo):** 1 user, user pastes their own Anthropic key in the browser — never sent to our servers

New users see a Clerk sign-in screen. After sign-in, plan is checked against Supabase; users without a paid plan see a pricing page and are routed to Stripe Checkout.

---

## Technical differentiators

- **Zero setup for end users** — no install, no account creation, no data export format requirements
- **Handles messy real-world GL exports** — Yardi, QuickBooks, Sage, SAP-style, custom formats
- **Industry-aware AI** — prompts adapt to detected framework so commentary uses correct terminology
- **Commentary on demand** — no API calls on period changes; stale banner + Regenerate keeps costs predictable
- **Single-file architecture** — entire app is one HTML file; trivial to audit, self-host, or white-label
- **Edge Function proxy** — API key never exposed to the browser; password-protected

---

## Development notes (for code edits, not pitch)

### Key files
- `index.html` — entire frontend (~4500+ lines)
- `api/claude.js` — Vercel Edge Function proxy to Anthropic API
- `.gitignore` — excludes `*.xlsx`, `*.xls`, `*.csv`, `*.docx`, `*.doc`, `node_modules/`

### Tech stack
- Vanilla JS, no framework or bundler
- SheetJS (XLSX) for Excel parsing
- ApexCharts for charts
- Anthropic Claude API via server-side proxy
- Vercel Edge Functions

### CSS theme
- `--bg:#F5EDD8`, `--surface:#FDFAF5`, `--surface-2:#EDE5D4`, `--surface-3:#E4D9C4`
- `--border:rgba(0,0,0,0.08)`, `--accent:#C4364F`, `--txt:#1A0A06`, `--txt-2:#7A5C50`, `--txt-3:#A08C80`
- Left nav: `--nav-w:224px`, fixed position

### Architecture: Auth + payments
- **Clerk** handles sign-in/sign-up (`CLERK_PUBLISHABLE_KEY` in index.html, `CLERK_SECRET_KEY` in Vercel env)
- **Supabase** stores user plan info (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Vercel env). Schema in `supabase-schema.sql`.
- **Stripe** handles subscriptions and entity add-ons (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/BUSINESS/BYOK/ENTITY_STARTER/ENTITY_BUSINESS`, `APP_URL` in Vercel env)
- `api/claude.js` — Edge Function; verifies Clerk JWT, checks Supabase plan, proxies to Anthropic
- `api/check-plan.js` — Edge Function; returns plan details, auto-creates Supabase row on first sign-in
- `api/create-checkout.js` — Node.js; creates Stripe Checkout session for subscriptions
- `api/add-entities.js` — Node.js; creates Stripe one-time payment for extra entity slots
- `api/stripe-webhook.js` — Node.js; updates Supabase on subscription events
- `PROXY_SENTINEL = '__proxy__'` — still present; `usingProxy()` returns true when no personal API key in localStorage (i.e., starter/business users)
- `proxyHeaders()` now sends `Authorization: Bearer <clerk_jwt>` instead of `x-proxy-password`
- To give demo access: manually set `plan = 'business'` in Supabase for that `clerk_user_id`

### Git / deployment
- Repo: `https://github.com/VictorVDP/Langevin.git`, branch `master`
- Vercel auto-deploys on push to `master`
- Custom domain connected via Porkbun

### Rules
- **Always ask before running `git push`** — confirm with the user before pushing to GitHub
- Never commit `.xlsx`, `.xls`, `.csv`, `.docx`, or `.doc` files
- Never put API keys or passwords in source code — use Vercel env vars
- Edit `index.html` directly; do not create separate JS/CSS files
- When editing `index.html`, use Node.js for safe UTF-8 replacements if needed (PowerShell 5.1 corrupts non-ASCII characters)
- Use `?.addEventListener` (optional chaining) on all `getElementById()` chains to avoid null crashes
