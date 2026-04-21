# Knowledge Update — Current Source of Truth and Execution Status

Status: upload-ready knowledge file

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

The app has exactly 3 primary pages:

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

User corrections should be remembered and reused later.

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
- current assistant UI scope is narrow
- current assistant surface supports create transaction and list recent transactions
- natural-language chat mutation flows are not yet fully implemented in the current UI
- imports are foundation/staging oriented, not broad automation
- notification delivery is not yet implemented
- PDF import must not appear
- stale older enum examples or legacy notes should not override current repo constants or locked docs

## Current Execution Status

Sprint 1 should now be treated as ready.

xw should be updated now.

Recommended handoff snapshot label: **xw-sprint-1-ready**

Next execution focus: **Sprint 2 assistant runtime implementation**

## Sprint 2 Starting Order

1. expand assistant runtime actions safely through approved tool contracts
2. keep all writes behind validators, policy, ownership checks, and service layer
3. add transaction mutation actions beyond create/list only when auditability is preserved
4. keep UI scope aligned to the 3-page product shape
5. continue excluding PDF imports, direct bank linking, extra pages, and uncontrolled AI behavior

## Non-Negotiable Guardrails

Do not let the product drift into:

- accounting software
- spreadsheet-first UX
- extra primary pages
- uncontrolled AI behavior
- direct AI-to-database writes
- PDF import support in the current scope
- bank/card linking in the current scope

## Working Rule

When repo reality, legacy prompts, and memory conflict:
- first follow locked docs
- then follow current repo truth for implemented behavior
- ignore stale legacy instructions that conflict
