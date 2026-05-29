# Knowledge Update Current Source Of Truth And Execution Status

Status: Sprint 14 ready knowledge file

Use this file as the current knowledge correction until replaced by a newer locked update.

## Source Priority

When older prompts, notes, or repo memories conflict, use this priority order:

1. Locked Product Decisions Register
2. Sprint 1 Readiness Document
3. AI Runtime Permission Document
4. Architecture Decision Record Pack
5. Core Business Rules
6. Import Strategy Document
7. Older master prompts or legacy notes only when they do not conflict with the above

## Current Product Identity

The product is a mobile-first AI budget tracking web app for general consumers.

The product positioning is an AI financial notebook.

The interface language is English.

User input may be multilingual.

## Locked Product Priorities

Priority order is locked as:

1. speed
2. simplicity
3. intelligence
4. automation
5. analytics

Do not sacrifice speed and simplicity for feature breadth.

## Locked Product Structure

The app has exactly 3 protected primary pages:

1. AI Assistant
2. Transactions
3. Insights

Do not introduce additional primary pages without an explicit product decision.

## Locked Capture Rules

Amount is the most important field.

If a numeric amount exists and expense or income intent exists, the system should save a useful entry.

If no numeric amount exists, the system must not create a financial record.

Merchant is optional.

Category is not required before saving.

The system should prefer fast capture over excessive follow-up questions.

## Locked Uncertainty Rules

If enough data exists to save something useful, save it.

If meaning is unclear, save with uncertainty instead of blocking the user.

Unclear items should enter a friendly reviewable state.

Review is preferred over friction.

## Locked Categorization Rules

MVP uses a controlled category system.

The system should categorize intelligently when context is sufficient.

If uncertain, use a review state instead of pretending certainty.

User corrections are remembered and reused later through user-owned category correction memory when the match is strong.

## Locked Balance Terminology

Use the term **Tracked balance**.

Do not use **Available balance**.

Tracked balance is derived from tracked product data only.

Tracked balance is not a bank balance and must never be presented as authoritative account truth.

## Locked Input Scope

Currently supported input directions in current scope:

- chat input
- manual quick entry
- receipt image upload
- CSV bank statement upload

Currently excluded from scope:

- PDF receipt upload
- PDF bank statement upload
- direct bank linking
- direct card linking

## Locked AI Runtime Boundary

The in-app AI assistant is tool-bound and permission-bound.

It may request only approved tools.

It may not write directly to the database.

It may not bypass validation.

All meaningful runtime actions must pass:

- schema validation
- policy validation
- ownership validation
- service-layer execution

Meaningful assistant actions must be auditable.

## Current Repo Reality

Treat current implemented repo behavior as narrower than the full product contract.

Current repo truth:

- current protected pages are Assistant, Transactions, and Insights
- current assistant UI scope is bounded and operational
- current assistant/runtime surface supports the approved transaction actions from prior sprints
- natural-language correction intents exist for delete, recategorize, mark correct, show needs review, and show recent
- safe target resolution exists for last, current, text, and id references
- ambiguous correction targets do not mutate
- undo last restore for a recently soft-deleted transaction is supported through the approved restore transaction runtime path
- staged imports support only `receipt_image` and `csv_import`
- staged import upload, upload transport, parser-result ingestion, review progress, accept/reject decisions, and review completion are implemented behind service-layer and ownership boundaries
- the staged import lifecycle is hardened as `uploaded -> parsing`, `parsing -> parsed`, `parsing -> failed`, and `parsed -> reviewed` only when all candidates are accepted or rejected
- parser-result ingestion runs only from `parsing`, skips invalid rows safely, fails safely when no valid rows exist, and ignores parser-provided lifecycle/status fields
- Transactions shows pending staged import candidates as reviewable work and keeps accepted/rejected candidates non-actionable
- notification delivery is not yet implemented
- PDF import must not appear
- stale older enum examples or legacy notes should not override current repo constants or locked docs

## Current Execution Status

Sprint 15 should now be treated as ready.

xw should be updated now.

Recommended handoff snapshot label: **xw-sprint-15-ready**

Sprint 15 validation passed:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

Next execution focus: **Sprint 16 from the frozen Sprint 15 baseline**

## Sprint 15 Current Source Of Truth

Sprint 15 should now be treated as ready.

Recommended handoff snapshot label: **xw-sprint-15-ready**

Sprint 15 validation passed:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

Current repo reality:

- Sprint 8 `restore_transaction` is accepted and remains protected by authenticated e2e regression.
- Sprint 9 Receipt Image Import MVP is accepted and remains review-first, private, and untrusted.
- Sprint 10 Assistant Spending Questions v1 is read-only and service-backed.
- Sprint 11 Insights Page v1 is accepted as a monthly clarity layer on tracked user-owned data only.
- Sprint 12 Budget Setup v1 is accepted as optional monthly controlled-category budgets inside Insights.
- Sprint 13 CSV Bank Statement Import MVP is accepted as a private, review-first staged import path.
- Sprint 14 Category Correction Memory v1 is accepted as user-owned, controlled-category-only memory.
- Sprint 15 Notifications Foundation v1 is accepted as user-controlled preference and subscription scaffolding.
- Notification preferences are user-owned, service-backed, and surfaced only inside the existing Assistant page.
- Push subscription storage scaffolding exists with owner-scoped RLS and disable support.
- Daily reminder and monthly review eligibility helpers exist with disabled, outside-window, already-sent, and already-active suppression states.
- Notification copy templates are calm and non-judgmental.
- No real push delivery, scheduler, autonomous AI notification sending, spammy alert behavior, new primary page, PDF import support, bank/card linking, Available balance wording, bank-balance claims, or uncontrolled AI behavior was added.

Next execution focus: **Sprint 16 from the frozen Sprint 15 baseline**

## Sprint 14 Current Source Of Truth

Sprint 14 should now be treated as ready.

Recommended handoff snapshot label: **xw-sprint-14-ready**

Sprint 14 validation passed:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

Current repo reality:

- Sprint 8 `restore_transaction` is accepted and remains protected by authenticated e2e regression.
- Sprint 9 Receipt Image Import MVP is accepted and remains review-first, private, and untrusted.
- Sprint 10 Assistant Spending Questions v1 is read-only and service-backed.
- Sprint 11 Insights Page v1 is accepted as a monthly clarity layer on tracked user-owned data only.
- Sprint 12 Budget Setup v1 is accepted as optional monthly controlled-category budgets inside Insights.
- Sprint 13 CSV Bank Statement Import MVP is accepted as a private, review-first staged import path.
- Sprint 14 Category Correction Memory v1 is accepted as user-owned, controlled-category-only memory.
- Supported Assistant financial question intents are monthly spending total, monthly income total, category spending total, recent largest expense, needs-review summary, and recent transactions summary.
- Assistant financial answers use Tracked-data wording, not Available balance or bank-balance wording.
- Assistant financial questions go through tool schema validation, policy validation, ownership-scoped service reads, and runtime logging.
- Insights shows monthly tracked spending, monthly tracked income, Tracked balance, category breakdown, largest recent expenses, Needs Review count, and empty/low-data states.
- Insights budget progress shows budget amount, actual spending, remaining amount, percent used, and over-budget state.
- Budgets use controlled expense/both categories only; no custom categories, rollover budgets, envelope system, forecasting, or Assistant budget-writing tool was added.
- CSV import validates authenticated users, compatible MIME types, safe file size, sanitized filenames, and user-scoped private storage paths.
- CSV parsing is bounded by max rows, max columns, max cell length, and simple amount/date/description/debit-credit header detection.
- CSV rows stage pending review candidates only; they do not create final transactions automatically.
- Duplicate CSV rows and same-user existing transaction matches are skipped before staging.
- Category memory records merchant, phrase, and import-description signals from user-approved corrections.
- Strong memory matches can suggest categories for Assistant capture, receipt staging, and CSV staging.
- Weak memory matches remain reviewable.
- No new primary pages, custom categories, rule-builder UI, global learning, model training, PDF import support, bank/card linking, automatic trusted bulk import, arbitrary SQL, direct assistant database access, financial advice, Available balance wording, or uncontrolled AI behavior was added.

Next execution focus: **Sprint 15 from the frozen Sprint 14 baseline**

## Non-Negotiable Guardrails

Do not let the product drift into:

- accounting software
- spreadsheet-first UX
- extra primary pages
- uncontrolled AI behavior
- direct AI-to-database writes
- PDF import support in the current scope
- bank/card linking in the current scope
- generic undo behavior

## Working Rule

When repo reality, legacy prompts, and memory conflict:

- first follow locked docs
- then follow current repo truth for implemented behavior
- ignore stale legacy instructions that conflict
