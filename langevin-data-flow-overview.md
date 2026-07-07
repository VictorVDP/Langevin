# Langevin — Data Flow & Security Overview

*A plain-language summary for prospective customers and their security/procurement teams. Not a substitute for the Privacy Policy or Data Processing Addendum, which govern in case of any conflict.*

---

## 1. What data Langevin touches

When you use Langevin, you upload a general ledger export (Excel/CSV) and, optionally, supporting documents (PDF, Word, `.eml`). These files typically contain:

- Account names and balances
- Transaction-level detail (dates, descriptions, amounts, vendor/customer names)
- No payment card or bank account credentials are collected by Langevin itself

## 2. How your data moves through the system

**Shared-proxy plans (Starter, Business):**

1. You upload a file in your browser. Parsing (header detection, format normalization) happens **client-side in JavaScript** — the raw file is not sent anywhere just to be parsed into a table.
2. When you request AI classification, commentary, or summaries, the relevant account names, sampled transaction rows, and document excerpts are sent from your browser to our Vercel Edge Function (`api/claude.js`).
3. The Edge Function verifies your identity (Clerk-issued session token) and your plan entitlement (Supabase), then forwards the request to the Anthropic API over TLS, using **our** Anthropic API key.
4. Anthropic returns the classification/commentary result, which is passed back to your browser and rendered. It is not written to a database on our side.
5. Your file itself is **not stored on our servers** — the working data lives in your browser session for the duration of your use of the app.

**BYOK plan (Bring Your Own Key):**

1. Same client-side parsing as above.
2. Your personal Anthropic API key is stored **only in your browser's local storage** — it is never transmitted to, or stored on, our servers.
3. AI requests go directly from your browser to the Anthropic API using your key. We never see the request or response content in this mode.

## 3. What we store, and where

| Data | Stored? | Where |
|---|---|---|
| Uploaded GL/budget/support files | No | Not persisted server-side; held in-browser only |
| Account classifications, AI commentary | No | Held in browser session only, regenerated as needed |
| Your API key (BYOK) | No (by us) | Browser localStorage only |
| Account/plan/billing info | Yes | Supabase (plan status), Clerk (authentication), Stripe (payment/subscription records) |
| Login credentials | Not by us directly | Managed entirely by Clerk (we never see passwords) |

## 4. Subprocessors

| Subprocessor | Role | Data it may see |
|---|---|---|
| **Anthropic** | AI model inference (classification, commentary, summaries) | GL account names, sampled transactions, supporting-document excerpts, per-request only — not retained by Langevin |
| **Vercel** | Hosting, Edge Function execution | Request metadata; transient in-memory access to data in transit through the proxy |
| **Clerk** | Authentication (sign-in/sign-up, session tokens) | Name, email, authentication metadata |
| **Supabase** | Plan/entitlement storage | Clerk user ID, plan tier, entity count |
| **Stripe** | Billing and subscription management | Payment details, billing contact info |

We do not use customer financial data to train AI models, and we do not sell customer data to third parties. See the Privacy Policy for Anthropic's and our own data-retention commitments in full.

## 5. Why this matters for your review

- **No server-side data lake of customer financials** — there's nothing to breach because there's very little sitting still.
- **BYOK mode** gives security-sensitive customers a path where their financial data never touches our infrastructure at all.
- **Single-file architecture** (per our engineering docs) means the entire client application is auditable in one file — no obscured data paths across dozens of services.

If your security team needs a completed vendor security questionnaire, SOC 2 status, or a signed DPA, contact us at **[support/security contact email]**.
