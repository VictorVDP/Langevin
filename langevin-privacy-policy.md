# Langevin Privacy Policy

**Last updated: [DATE]**

*This is a draft prepared to reflect Langevin's actual architecture as described in its technical documentation. It has not been reviewed by a lawyer and should be before publication. Bracketed items marked `[ ]` must be filled in or confirmed.*

---

## 1. Who we are

Langevin ("**Langevin**," "**we**," "**us**," or "**our**") is a financial analysis tool operated by **[Legal Entity Name]**, [a company/corporation] incorporated in **[Jurisdiction]** ("**Company**"). This Privacy Policy explains what information we collect through the Langevin web application (the "**Service**"), how we use it, and the choices you have.

If you have questions, contact us at **[privacy contact email]**.

## 2. Information we collect

### 2.1 Account and billing information
When you sign up, we (via our processors Clerk and Stripe) collect:
- Name and email address
- Authentication credentials (managed entirely by Clerk; we do not store passwords ourselves)
- Billing address and payment details (processed by Stripe; we do not store full card numbers)
- Subscription plan, entity count, and usage tier (stored in Supabase)

### 2.2 Financial data you upload
Langevin is designed to process your general ledger exports and supporting documents (Excel, CSV, PDF, Word, `.eml` files) **only as needed to provide the Service to you**:
- Parsing of your file (header detection, format normalization) happens in your browser.
- Where AI classification or commentary is requested, a subset of your data (account names, sampled transaction rows, extracted document text) is transmitted, over encrypted connection, to our AI provider (Anthropic) via our server-side proxy — or, if you use our **Bring Your Own Key (BYOK)** plan, directly from your browser to Anthropic using your own API key.
- **We do not persist your uploaded files or their contents on our servers.** Data used for analysis lives in your browser session for the duration of your use of the Service.

### 2.3 Usage data
We may collect standard technical/operational data: IP address, browser type, pages viewed, timestamps, and error logs, for security and reliability purposes.

## 3. How we use information

We use the information above to:
- Provide, maintain, and improve the Service (parsing, classification, reporting, AI commentary)
- Authenticate you and enforce plan entitlements
- Process payments and manage subscriptions
- Provide customer support
- Detect, prevent, and address technical issues, fraud, or abuse
- Comply with legal obligations

**We do not use the content of your uploaded financial data to train AI models**, ours or, to the best of our knowledge and per our agreements with Anthropic, Anthropic's foundation models. See Section 5.

## 4. Legal bases for processing (EEA/UK users)

Where applicable, we process personal data under the following legal bases: performance of a contract (providing the Service you signed up for), legitimate interests (security, service improvement), and consent (where required, e.g. certain cookies).

## 5. Third parties / subprocessors

We share information with the following subprocessors, each acting under its own data protection terms and, where applicable, a data processing agreement with us:

| Subprocessor | Purpose | Data shared |
|---|---|---|
| **Anthropic** (Claude API) | AI-powered classification, commentary, summaries | Account names, sampled transactions, document excerpts submitted per request; not retained by us |
| **Vercel** | Application hosting and Edge Function execution | Request/response data in transit |
| **Clerk** | Authentication | Name, email, session data |
| **Supabase** | Plan/entitlement storage | User ID, plan tier |
| **Stripe** | Payment processing | Billing/payment details |

We do not sell your personal information or your financial data to any third party. A current subprocessor list is available on request at **[privacy contact email]**.

## 6. Data retention

- **Uploaded financial data:** not retained by Langevin servers; held only in your active browser session.
- **Account/billing data:** retained for as long as your account is active, and thereafter as required for legal, tax, or accounting purposes.
- **BYOK API keys:** stored only in your browser's local storage; never transmitted to or retained by us.

## 7. Your rights

Depending on your location, you may have the right to access, correct, delete, or export your personal data, or to object to or restrict certain processing. To exercise these rights, contact **[privacy contact email]**. Because we do not retain your uploaded financial data server-side, most such requests will concern your account/billing information.

If you are in the EEA/UK, you also have the right to lodge a complaint with your local data protection authority. If you are a California resident, you have rights under the CCPA/CPRA, including the right to know, delete, and opt out of "sale" or "sharing" of personal information (we do not sell or share personal information as defined by the CCPA).

## 8. International data transfers

Our subprocessors may process data in the United States and other countries. Where required, we rely on appropriate safeguards (such as Standard Contractual Clauses) for transfers of personal data originating in the EEA, UK, or Switzerland.

## 9. Security

We rely on encryption in transit (TLS), authentication via Clerk, and a minimal-retention architecture (your financial data is not stored server-side) to reduce risk. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.

## 10. Children's privacy

The Service is not directed to individuals under 18, and we do not knowingly collect personal data from children.

## 11. Changes to this policy

We may update this Privacy Policy from time to time. Material changes will be notified via the Service or by email. Continued use of the Service after changes take effect constitutes acceptance.

## 12. Contact

**[Legal Entity Name]**
[Address]
**[privacy contact email]**
