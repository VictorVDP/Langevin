# Data Processing Addendum

**Last updated: [DATE]**

*Draft prepared to reflect Langevin's actual architecture. This is not legal advice. A DPA is a binding contract — have qualified counsel review and adapt this before sending it to any customer, and expect enterprise customers' counsel to redline it. Bracketed items marked `[ ]` must be filled in or confirmed.*

---

This Data Processing Addendum ("**DPA**") is entered into between **[Legal Entity Name]** ("**Processor**," "**Langevin**") and the customer identified in the applicable order form or account ("**Controller**," "**Customer**"), and forms part of the Terms of Service between the parties (the "**Agreement**"). In the event of a conflict between this DPA and the Agreement regarding the processing of Personal Data, this DPA controls.

## 1. Definitions

- **"Personal Data"** means any information relating to an identified or identifiable natural person that is processed by Langevin on behalf of Customer in connection with the Service, which may be contained in general ledger exports, supporting documents, or account/user records (e.g., employee names in transaction descriptions, vendor contacts, or Customer's own authorized users).
- **"Processing"**, **"Controller"**, **"Processor"**, **"Data Subject"**, and **"Supervisory Authority"** have the meanings given under applicable Data Protection Law.
- **"Data Protection Law"** means, as applicable, the EU General Data Protection Regulation (GDPR), the UK GDPR and Data Protection Act 2018, the California Consumer Privacy Act as amended by the CPRA, and any other applicable data protection law.
- **"Subprocessor"** means any third party engaged by Langevin to process Personal Data on Customer's behalf.

## 2. Roles of the parties

Customer is the Controller of Personal Data contained in the general ledger exports and other files it uploads to the Service. Langevin is a Processor acting only on Customer's documented instructions, as set out in the Agreement and this DPA.

## 3. Scope and nature of processing

| | |
|---|---|
| **Subject matter** | Provision of the Langevin financial analysis Service |
| **Duration** | For the term of the Agreement, subject to Section 8 (deletion) |
| **Nature of processing** | Parsing, classification, and AI-assisted analysis of uploaded financial data; authentication; billing |
| **Categories of data** | Financial/accounting data (account names, transaction amounts, dates, descriptions), which may incidentally include names of employees, vendors, or customers referenced in transaction descriptions or supporting documents; Customer's own user account data (name, email) |
| **Categories of data subjects** | Customer's employees/authorized users; individuals referenced in Customer's financial records (e.g., named vendors, payees) |

## 4. Langevin's obligations as Processor

Langevin shall:

1. Process Personal Data only on documented instructions from Customer (including as set out in the Agreement and this DPA), unless required to do otherwise by law, in which case Langevin will inform Customer before processing, unless legally prohibited.
2. Ensure persons authorized to process Personal Data are subject to confidentiality obligations.
3. Implement appropriate technical and organizational measures to protect Personal Data, as described in Section 6.
4. Not persist Customer's uploaded financial data (Customer Data) on Langevin's servers beyond the active browser session in which it is used, consistent with Langevin's architecture as described to Customer.
5. Assist Customer, taking into account the nature of processing, in responding to Data Subject requests and in meeting Customer's obligations under Data Protection Law relating to security, breach notification, data protection impact assessments, and consultation with Supervisory Authorities, to the extent Langevin is able given that it does not retain Customer Data server-side.
6. Notify Customer without undue delay after becoming aware of a Personal Data breach affecting Customer's Personal Data, and provide reasonably requested information to assist Customer's own breach notification obligations.
7. At Customer's choice, delete or return all Personal Data after the end of the provision of Services, except as required to be retained by law — noting that, per Langevin's architecture, Customer Data is not retained server-side in the ordinary course, so this obligation principally concerns account/billing records held in Clerk, Supabase, and Stripe.
8. Make available information reasonably necessary to demonstrate compliance with this DPA, and allow for and contribute to audits, including inspections, conducted by Customer or a Customer-appointed auditor, subject to reasonable notice, confidentiality, and no more than [once annually] absent a Personal Data breach or regulatory requirement.

## 5. Subprocessors

### 5.1 Authorization
Customer authorizes Langevin to engage the Subprocessors listed in Section 5.2 to process Personal Data in connection with the Service.

### 5.2 Current Subprocessors

| Subprocessor | Function | Location(s) |
|---|---|---|
| Anthropic, PBC | AI model inference (classification, commentary, summarization) | United States |
| Vercel Inc. | Application hosting, Edge Function execution | [United States / global CDN] |
| Clerk Inc. | Authentication | [United States] |
| Supabase Inc. | Plan/entitlement data storage | [United States / region] |
| Stripe, Inc. | Payment processing | [United States] |

### 5.3 Changes
Langevin will provide notice of any new Subprocessor or change to an existing Subprocessor (e.g., via [email / a subprocessor page at URL]) at least [10] days before granting the new Subprocessor access to Personal Data. Customer may object on reasonable data-protection grounds within that period; if the parties cannot resolve the objection, Customer may terminate the affected part of the Service as its sole remedy.

### 5.4 Liability
Langevin remains liable for the acts and omissions of its Subprocessors to the same extent Langevin would be liable if performing the services of each Subprocessor directly, and imposes data protection obligations substantially similar to this DPA on each Subprocessor.

## 6. Security measures

Langevin implements the following measures, consistent with its architecture:

- Encryption in transit (TLS) for all data transmitted between the browser, Langevin's Edge Functions, and Anthropic
- Authentication and session management via Clerk
- A minimal-server-retention design: uploaded financial files and derived analysis are not persisted on Langevin's servers; parsing occurs client-side and AI processing occurs per-request without server-side storage of results
- Access to account/billing data (Supabase, Stripe, Clerk) restricted to authorized personnel
- API keys and secrets (including Anthropic API keys for shared-proxy plans) stored as environment variables, not in source code or client-accessible locations
- For BYOK customers, the customer's own Anthropic API key is stored only in the customer's browser local storage and is never transmitted to or stored by Langevin

*[Note to counsel/customer: if the customer requires a formal Annex II-style technical and organizational measures list, SOC 2 report, or penetration test summary, this section should be expanded accordingly — currently reflects only what is documented in Langevin's engineering notes.]*

## 7. International transfers

Where Personal Data originating in the EEA, UK, or Switzerland is transferred to a Subprocessor located outside that region (including the United States), the parties agree that such transfer is governed by the Standard Contractual Clauses (Module 2: Controller to Processor, and Module 3 as applicable for Subprocessors), incorporated by reference as **Annex III (SCCs)**, or another valid transfer mechanism recognized under applicable Data Protection Law. [Attach or reference the applicable SCC module and UK Addendum as needed.]

## 8. Deletion and return of data

Given Langevin's architecture, Customer Data (uploaded GL files, budgets, supporting documents, and derived AI analysis) is not retained server-side beyond the active session, so no further server-side deletion action is typically required at the end of the Agreement. Account, billing, and entitlement data held in Clerk, Supabase, and Stripe will be deleted or returned within [30] days of termination, except where retention is required by law (e.g., financial/tax records via Stripe).

## 9. Liability

Each party's liability arising under this DPA is subject to the limitations of liability set out in the Agreement, except where such limitation is not permitted under applicable Data Protection Law.

## 10. Term

This DPA remains in effect for as long as Langevin processes Personal Data on behalf of Customer under the Agreement.

## 11. Order of precedence

In case of conflict between this DPA and the Agreement, this DPA governs with respect to the processing of Personal Data.

---

**Signature blocks** *(if executed as a standalone document rather than incorporated by reference/clickthrough)*

**Processor: [Legal Entity Name]**
Name:
Title:
Date:

**Controller: [Customer Legal Name]**
Name:
Title:
Date:
