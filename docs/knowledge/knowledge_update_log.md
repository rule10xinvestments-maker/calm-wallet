# Knowledge Update Log

This file records only the knowledge deltas that changed across sprints.

It is not a full product spec.
It is the running memory of what became newly true, newly locked, newly shipped, or newly overridden.

---

## Sprint 1 Closeout Update

### Date
2026-04-21

### Status
Ready

### Add this to my knowledge now
- Sprint 1 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-1-ready`.
- The active current-truth file is `knowledge_update_current_source_of_truth.md`.
- The older Sprint 1 phase correction should no longer be treated as the active hint file.
- The current repo is narrower than the full long-term product contract.
- The current assistant UI supports:
  - create transaction
  - list recent transactions
- Natural-language mutation flows are not yet fully implemented in the current UI.
- Imports are still in foundation/staging shape, not full end-to-end user workflow shape.
- Notification delivery is not yet implemented.
- PDF import remains out of scope and must not appear.
- Sprint 2 should start with safe assistant runtime expansion.

### Locked decisions changed this sprint
- No core product-shape change.
- No new primary pages.
- No change to the locked AI runtime boundary.
- No change to the locked import scope.
- Execution status changed from Sprint 1 foundation work to Sprint 1 ready handoff.

### Repo reality changed this sprint
- App shell, auth routes, and protected routing foundation now exist.
- The three protected pages exist:
  - `/assistant`
  - `/transactions`
  - `/insights`
- Initial schema, migrations, and category seed exist.
- Transaction service and validation foundations exist.
- AI tool registry and schema scaffolding exist.
- AI action logging and transaction-event audit scaffolding exist.
- Import storage/path scaffolding exists.
- Test foundation exists across unit and e2e coverage for the current Sprint 1 surface.

### Validation state
- Sprint 1 is being treated as ready for packaging.
- Release snapshot should be recorded as `xw-sprint-1-ready`.
- Exact command output logs should be attached separately if needed for stricter release traceability.

### What is now overridden
- Older notes that imply Sprint 1 is still the active execution phase.
- Older notes that imply PDF receipt import or PDF bank statement import are in current scope.
- Older wording that uses `Available balance` instead of `Tracked balance`.

### Next sprint start order
1. Package Sprint 1 as `xw-sprint-1-ready`.
2. Expand assistant runtime actions safely through approved tool contracts.
3. Wire assistant UI to approved mutation actions.
4. Keep every mutation behind validation, policy, ownership checks, and service-layer execution.
5. Preserve audit logging for all assistant mutation paths.
6. Add focused tests for assistant-driven update, delete, and recategorize flows.

---

## Entry Template

### Date
YYYY-MM-DD

### Status
Ready | Partial | Blocked

### Add this to my knowledge now
- fact changed
- fact changed

### Locked decisions changed this sprint
- decision change

### Repo reality changed this sprint
- repo truth change

### Validation state
- typecheck/lint/test/build/e2e summary

### What is now overridden
- old belief or stale note

### Next sprint start order
1. first action
2. second action
3. third action

---

## Sprint 1 Freeze Verification

### Date
2026-04-21

### Status
Ready

### Add this to my knowledge now
- Sprint 1 is safe to freeze as `xw-sprint-1-ready`.
- Clean validation proof was completed from an isolated fresh folder:
  - `C:\xw-validation-fresh`
- Validation passed for:
  - `npm install`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- The authoritative Sprint 1 closeout doc path is now:
  - `docs/sprint-closeouts/sprint-1-closeout.md`
- The authoritative Sprint 2 plan path is now:
  - `docs/plans/sprint-2-plan.md`
- The current Assistant UI remains intentionally narrow:
  - create transaction
  - list recent transactions

### Locked decisions changed this sprint
- No product-scope change.
- No change to the AI runtime boundary.
- No change to the locked three-page structure.
- Freeze readiness was verified and confirmed.

### Repo reality changed this sprint
- Closeout and packaging docs were normalized to the final Sprint 1 artifact paths.
- Sprint 2 planning doc location was normalized to `docs/plans/sprint-2-plan.md`.

### Validation state
- Fresh install validation passed in a clean isolated folder.
- Sprint 1 closeout can rely on exact command results, not assumed status.

### What is now overridden
- Older closeout references using `docs/sprint-closeouts/sprint_1_closeout.md`.
- Older Sprint 2 plan references using `docs/sprint2-plan.md`.

### Next sprint start order
1. Freeze/package `xw-sprint-1-ready`.
2. Start Sprint 2 from the approved mutation-capable assistant tool surface.
3. Keep runtime wiring behind validation, policy, ownership, audit, and service execution.

---

## Sprint 2 Closeout Update

### Date
2026-04-22

### Status
Ready

### Add this to my knowledge now
- Sprint 2 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-2-ready`.
- The Assistant/runtime surface now supports:
  - `update_transaction`
  - `delete_transaction`
  - `recategorize_transaction`
  - `summarize_spending`
- The Assistant page now exposes a minimum safe trigger UI for all approved Sprint 2 actions.
- `summarize_spending` is now a real read-only capability and no longer returns `not_implemented`.
- Runtime logging remains preserved across the approved Sprint 2 assistant action paths.

### Locked decisions changed this sprint
- No new primary pages.
- No weakening of the AI runtime boundary.
- No direct AI-to-database write path.
- No natural-language freeform assistant behavior was introduced.

### Repo reality changed this sprint
- Assistant action parsing now handles all approved Sprint 2 tool paths.
- Assistant request/result shaping now covers all approved Sprint 2 tool paths.
- Assistant composer UI now supports bounded create, update, delete, recategorize, and summarize flows.
- A pure read-model spending summary helper now exists for the trusted summarize path.
- Focused tests now cover Sprint 2 assistant UI wiring, action parsing, server/runtime behavior, and summary correctness.

### Validation state
- Focused Sprint 2 closeout validation passed for:
  - `assistant-composer`
  - `assistant-action`
  - `assistant-server`
  - `ai-tools`
  - `transactions-read-model`
  - `transactions-domain`
  - `transaction-mutations`
- The focused grouped validation result was:
  - `7` test files passed
  - `64` tests passed

### What is now overridden
- Older notes that describe the Assistant page as create/list only.
- Older notes that describe `summarize_spending` as scaffolded or `not_implemented`.
- Older Sprint 2 status notes that imply backend completion without UI accessibility.

### Next sprint start order
1. Freeze/package `xw-sprint-2-ready`.
2. Start Sprint 3 from the frozen Sprint 2 baseline.
3. Keep the trusted Assistant/runtime boundary unchanged unless explicitly re-scoped.
4. Move next into staged import workflow work for supported inputs only.

---

## Sprint 3 Closeout Update

### Date
2026-04-26

### Status
Ready

### Add this to my knowledge now
- Sprint 3 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-3-ready`.
- Supported staged import directions remain limited to:
  - `receipt_image`
  - `csv_import`
- The repo now contains a bounded staged import workflow including:
  - private staged upload
  - owned staged import visibility
  - minimal candidate accept/reject review
- The existing Assistant page now supports the first truthful staged upload flow.
- The existing Transactions page now shows staged imports, candidate previews, review progress, and a minimal accept/reject review surface.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No uncontrolled parser or AI execution.
- Sprint 3 remained bounded to staged import workflow only.

### Repo reality changed this sprint
- Import domain/service boundaries now exist for staged import records and candidates.
- Private staged import storage foundation now exists with owned storage policies.
- Signed private upload transport and upload-completion persistence now exist.
- Parser-result ingestion, review-decision, and review-progress foundations now exist.
- Minimal review controls now exist inside the existing Transactions page staged import detail area.

### Validation state
- Grouped Sprint 3 closeout validation passed.
- `15` Sprint 3-focused test files passed.
- `95` tests passed.

### What is now overridden
- Older notes that describe imports as storage-path scaffolding only.
- Older notes that describe Transactions staged imports as read-only without review controls.
- Older notes that imply Sprint 3 still needs a truthful end-to-end staged upload path.

### Next sprint start order
1. Freeze/package `xw-sprint-3-ready`.
2. Start Sprint 4 from the frozen Sprint 3 baseline only.
3. Keep import directions locked to `receipt_image` and `csv_import`.
4. Build only the next bounded staged import lifecycle step.

---

## Sprint 4 Closeout Update

### Date
2026-04-27

### Status
Ready

### Add this to my knowledge now
- Sprint 4 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-4-ready`.
- The staged import lifecycle is now hardened through:
  - `uploaded -> parsing`
  - `parsing -> parsed`
  - `parsing -> failed`
  - `parsed -> reviewed` only when all candidates are accepted or rejected
- The existing Transactions page now distinguishes pending review work from completed accepted/rejected candidates.
- Parser-result ingestion now runs only from `parsing`, creates only valid pending-review candidates, skips invalid rows safely, and fails imports safely when there are zero valid rows.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No OCR or parser-engine execution.
- No broad CSV mapping UX.
- No weakening of ownership, validation, service-layer, or AI runtime boundaries.

### Repo reality changed this sprint
- Import lifecycle transition helpers now enforce the intended staged import state graph.
- Review completion only transitions parsed imports to reviewed when no pending candidates remain.
- Transactions staged import UI now shows compact review progress and safe failed/completed states.
- Parser-result ingestion now validates each parser row before persistence and ignores parser-provided lifecycle/status fields.
- Unit coverage now includes lifecycle, review completion, review UX, parser ingestion hardening, and typed auth mock support.

### Validation state
- Full Sprint 4 freeze validation passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run test`
  - `npm.cmd run build`
  - `npm.cmd run test:e2e`
- Unit validation result:
  - `36` files passed
  - `267` tests passed
- E2E validation result:
  - `4` Playwright tests passed
- First sandboxed e2e attempt failed on an `EPERM` unlink of `C:\xw\test-results\.last-run.json`; the approved rerun outside the sandbox passed.

### What is now overridden
- Older notes that describe staged imports as upload-only or parser-ingestion foundation only.
- Older notes that imply parser-result ingestion can run after an import is already parsed.
- Older notes that imply accepted/rejected candidates remain actionable review work.

### Next sprint start order
1. Freeze/package `xw-sprint-4-ready`.
2. Start Sprint 5 from the frozen Sprint 4 baseline only.
3. Preserve staged import directions as `receipt_image` and `csv_import`.
4. Keep parser execution, PDF imports, bank/card linking, new pages, and broad CSV UX out of scope unless a later sprint explicitly re-plans them.

---

## Sprint 7 Baseline Update

### Date
2026-05-02

### Status
Ready

### Add this to my knowledge now
- Sprint 7 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-7-ready`.
- Natural-language correction intents exist for delete, recategorize, mark correct, show needs review, and show recent.
- Safe target resolution exists for last, current, text, and id references.
- Ambiguous correction targets do not mutate.
- Undo last remains unsupported until Sprint 8 restore work.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No uncontrolled AI behavior.
- No direct AI-to-database write path.

### Repo reality changed this sprint
- Assistant natural-language correction behavior is bounded to known intents and approved service-backed tools.
- Target resolution is constrained to owned transaction candidates and refuses ambiguous matches.
- The Assistant message composer remains the primary entry point.

### Validation state
- Sprint 7 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`

### What is now overridden
- Older notes that describe the Assistant as only create/list or manual-form driven.
- Older notes that imply ambiguous natural-language correction targets can mutate.

### Next sprint start order
1. Freeze/package `xw-sprint-7-ready`.
2. Start Sprint 8 restore work from the frozen Sprint 7 baseline.
3. Implement only restore of recently soft-deleted transactions through the service and AI tool runtime.

---

## Sprint 9 Closeout Update

### Date
2026-05-02

### Status
Ready

### Add this to my knowledge now
- Sprint 9 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-9-ready`.
- Sprint 9 is Receipt Image Import MVP, not OCR or line-item extraction.
- Receipt image uploads are authenticated, private, MIME-limited, size-limited, filename-sanitized, and user-scoped.
- Import records are created only after receipt upload reaches private storage in the new receipt-specific server upload path.
- Receipt candidates are created only for staged usable data and remain pending review.
- Imported content is untrusted input and cannot alter AI runtime/tool policy.
- Sprint 8 `restore_transaction` remains accepted and passed e2e regression.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No uncontrolled AI behavior.
- No direct assistant database writes.
- No fake OCR confidence.
- No line-item extraction.

### Repo reality changed this sprint
- Added a receipt-specific server upload path.
- Hardened existing staged upload intake/completion against receipt PDFs and unsupported MIME types.
- Added a receipt candidate staging path for owned receipt image records.
- Existing Transactions staged import review UI remains the review/accept/reject surface.

### Validation state
- Full Sprint 9 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `41` files passed
  - `325` tests passed
- E2E validation result:
  - `5` Playwright tests passed

### What is now overridden
- Older notes that describe receipt image import as storage-path-only.
- Older notes that imply receipt upload accepts any `image/*` MIME.
- Any note implying Sprint 9 added OCR, PDF, bank/card linking, or a separate Imports page.

### Next sprint start order
1. Freeze/package `xw-sprint-9-ready`.
2. Start Sprint 10 from the frozen Sprint 9 baseline.
3. Keep receipt import review-first and do not add OCR or PDF scope unless explicitly planned.

---

## Sprint 10 Closeout Update

### Date
2026-05-02

### Status
Ready

### Add this to my knowledge now
- Sprint 10 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-10-ready`.
- Sprint 10 is Assistant Spending Questions v1.
- Assistant financial questions are read-only and routed through approved tool schema validation, policy validation, ownership-scoped service reads, and runtime logging.
- Supported financial question intents are monthly spending total, monthly income total, category spending total, recent largest expense, needs-review summary, and recent transactions summary.
- Assistant answers use Tracked wording, not Available balance or bank-balance wording.
- Sprint 8 `restore_transaction` remains accepted and passed authenticated e2e regression.
- Sprint 9 receipt image import remains accepted and did not regress.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No uncontrolled AI behavior.
- No direct assistant database access.
- No arbitrary SQL.
- No financial advice beyond tracked-data summaries.
- No Available balance language.

### Repo reality changed this sprint
- Added `answer_financial_question` as a whitelisted read-only AI tool.
- Added typed schemas for narrow Assistant financial questions.
- Added service-layer read-model answers backed by `TransactionService.listTransactions(userId, filters)`.
- Added natural-language parsing for bounded spending, income, category, largest expense, needs-review, and recent transaction questions.
- Updated tests for read-only behavior, date handling, unsupported fallbacks, Tracked wording, and no mutation from read questions.

### Validation state
- Full Sprint 10 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `41` files passed
  - `331` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes that describe Assistant financial questions as unsupported.
- Any note implying Assistant read questions can use direct database access, arbitrary SQL, Available balance wording, or financial advice.

### Next sprint start order
1. Freeze/package `xw-sprint-10-ready`.
2. Start Sprint 11 from the frozen Sprint 10 baseline.
3. Keep Assistant financial questions read-only and tracked-data-only.

---

## Sprint 11 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 11 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-11-ready`.
- Sprint 11 is Insights Page v1: Monthly Clarity Layer.
- Insights now shows monthly tracked spending, monthly tracked income, Tracked balance, category breakdown, largest recent expenses, and Needs Review count.
- Insights uses tracked user-owned transaction data only.
- Insights copy avoids Available balance and bank-balance claims.
- Sprint 8 `restore_transaction` remains accepted and passed authenticated e2e regression.
- Sprint 9 Receipt Image Import MVP remains accepted and covered by regression tests.
- Sprint 10 Assistant Spending Questions v1 remains accepted and covered by regression tests.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No uncontrolled AI behavior.
- No Available balance wording.
- No bank-balance claims.
- No accounting dashboard.
- No direct assistant database access.

### Repo reality changed this sprint
- Expanded `InsightsData` in the transaction read model.
- Rebuilt the existing Insights page into a mobile-first monthly clarity view.
- Added largest recent expenses and Needs Review count to Insights.
- Added empty and low-data states for new users.
- Added tests for Insights rendering, tracked wording, no Available balance wording, category breakdown, empty states, Needs Review prompts, and ownership-scoped read loading.

### Validation state
- Full Sprint 11 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `43` files passed
  - `338` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes that describe Insights as only early placeholder cards.
- Any note implying Insights uses Available balance, bank data, direct assistant reads, or dashboard-heavy accounting surfaces.

### Next sprint start order
1. Freeze/package `xw-sprint-11-ready`.
2. Start Sprint 12 from the frozen Sprint 11 baseline.
3. Preserve tracked-data-only Insights, Assistant read-only questions, receipt import guardrails, and restore regression coverage.

---

## Sprint 12 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 12 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-12-ready`.
- Sprint 12 is Budget Setup v1.
- Budgets are optional monthly category budgets using controlled expense/both categories only.
- Budget setup lives inside the existing Insights page; no new primary page was added.
- Budget progress shows budget amount, actual current-month spending, remaining amount, percent used, and over-budget state.
- Removing a budget deletes the user-owned budget row because the existing schema has no active or soft-delete column.
- Sprint 8 `restore_transaction` remains accepted and passed authenticated e2e regression.
- Sprint 9 Receipt Image Import MVP remains accepted and covered by regression tests.
- Sprint 10 Assistant Spending Questions v1 remains accepted and covered by regression tests.
- Sprint 11 Insights Monthly Clarity remains accepted and covered by regression tests.

### Locked decisions changed this sprint
- No new primary pages.
- No custom categories.
- No rollover budgets.
- No envelope budgeting system.
- No forecasting.
- No Assistant budget-writing tool.
- No PDF import support.
- No bank or card linking.
- No Available balance wording.
- No bank-balance claims.
- No uncontrolled AI behavior.

### Repo reality changed this sprint
- Added budget domain schemas, policy, service, and authenticated server actions.
- Added budget delete RLS policy for own budget rows.
- Extended Insights read model with budget progress.
- Added compact budget setup, update, and remove controls inside Insights.
- Added budget tests and kept prior sprint regressions green.

### Validation state
- Full Sprint 12 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `45` files passed
  - `351` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes that describe Insights as monthly clarity only without budget progress.
- Any note implying budgets use custom categories, rollover/envelope behavior, forecasting, Assistant budget-writing, bank data, or Available balance wording.

### Next sprint start order
1. Freeze/package `xw-sprint-12-ready`.
2. Start Sprint 13 from the frozen Sprint 12 baseline.
3. Preserve optional controlled-category budgets, tracked-data-only Insights, Assistant read-only questions, receipt import guardrails, and restore regression coverage.

---

## Sprint 13 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 13 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-13-ready`.
- Sprint 13 is CSV Bank Statement Import MVP.
- CSV uploads are authenticated, private, MIME-limited, size-limited, filename-sanitized, and user-scoped.
- CSV parsing is bounded by max rows, max columns, and max cell length.
- CSV rows are treated as untrusted input and staged only as import candidates for review.
- Amount, date, description/counterparty, and optional debit/credit direction are detected from simple headers.
- Duplicate CSV rows and same-user existing transaction matches are skipped before candidate staging.
- Accepting CSV candidates still creates transactions through the existing transaction service-layer review path.
- Sprint 8 `restore_transaction`, Sprint 9 receipt import, Sprint 10 Assistant Spending Questions, Sprint 11 Insights, and Sprint 12 Budget Setup remain accepted and covered.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No direct bank or card linking.
- No bank-balance claims.
- No Available balance wording.
- No automatic trusted bulk import.
- No arbitrary SQL.
- No direct assistant database access.
- No uncontrolled AI behavior.

### Repo reality changed this sprint
- Added `csv-bank-statement-parser`.
- Added authenticated server CSV upload, parse, dedupe, and stage flow.
- Hardened CSV MIME validation to require a CSV extension and compatible MIME type.
- Assistant staged import upload now routes CSV files through the server parse/stage path.
- Transactions remains the only staged import review surface.

### Validation state
- Full Sprint 13 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `47` files passed
  - `363` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes that describe CSV import as upload-only or parser-out-of-scope.
- Any note implying CSV imports create final transactions automatically.
- Any note implying CSV content can affect AI runtime/tool policy.

### Next sprint start order
1. Freeze/package `xw-sprint-13-ready`.
2. Start Sprint 14 from the frozen Sprint 13 baseline.
3. Preserve review-first private CSV import behavior and all prior sprint guardrails.

---

## Sprint 14 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 14 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-14-ready`.
- Sprint 14 is Category Correction Memory v1.
- Category correction memory is user-owned and uses the existing `user_category_memory` table.
- Memory records merchant, phrase, and import-description signals with a preferred controlled category.
- Memory is recorded from user-approved correction paths, including transaction recategorization and accepted import candidates with a category.
- Strong memory matches can suggest categories for Assistant capture, receipt candidate staging, and CSV candidate staging.
- Weak memory matches remain reviewable.
- User correction memory can beat generic category guessing.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant Spending Questions, Sprint 11 Insights, Sprint 12 Budget Setup, and Sprint 13 CSV import remain accepted and covered.

### Locked decisions changed this sprint
- No new primary pages.
- No custom categories.
- No rule-builder UI.
- No global learning.
- No model training system.
- No PDF import support.
- No bank or card linking.
- No Available balance wording.
- No automatic fake certainty.
- No uncontrolled AI behavior.

### Repo reality changed this sprint
- Added category-memory schemas, policy, types, and service.
- Assistant natural-language capture can use strong user-owned memory suggestions.
- Receipt and CSV candidate staging can use strong user-owned memory suggestions.
- Import candidate creation now supports controlled category ids.
- Transaction recategorization records lightweight category memory.
- Accepted categorized import candidates can reinforce memory.

### Validation state
- Full Sprint 14 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `48` files passed
  - `371` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes implying user correction memory exists only as schema scaffolding.
- Any note implying category learning is global, model-trained, custom-category based, or automatic certainty.

### Next sprint start order
1. Freeze/package `xw-sprint-14-ready`.
2. Start Sprint 15 from the frozen Sprint 14 baseline.
3. Preserve controlled-category-only, user-owned memory and all prior sprint guardrails.

---

## Sprint 15 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 15 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-15-ready`.
- Sprint 15 is Notifications Foundation v1.
- Notification preferences are user-owned, service-backed, and surfaced only inside the existing Assistant page.
- Push subscription storage scaffolding now exists with user-owned RLS and disable support.
- Daily reminder and monthly review eligibility helpers exist with disabled, outside-window, already-sent, and already-active suppression states.
- Notification copy templates are calm and non-judgmental.
- No real push delivery, scheduler, autonomous AI notification sending, or spammy alert behavior was added.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant Spending Questions, Sprint 11 Insights, Sprint 12 Budget Setup, Sprint 13 CSV import, and Sprint 14 Category Correction Memory remain accepted and covered.

### Locked decisions changed this sprint
- No new primary pages.
- No PDF import support.
- No bank or card linking.
- No Available balance wording.
- No bank-balance claims.
- No real push notification sending.
- No autonomous AI notification sending.
- No uncontrolled AI behavior.

### Repo reality changed this sprint
- Added notification schemas, types, copy templates, and service-layer preference/subscription helpers.
- Added `push_subscriptions` storage migration with owner-scoped RLS policies.
- Added authenticated notification preference and push subscription actions.
- Added compact notification preference controls to the existing Assistant page.
- Added tests for preference defaults, updates, ownership, subscription storage, eligibility, suppression, calm copy, and Assistant UI placement.

### Validation state
- Full Sprint 15 validation passed:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:e2e`
- Unit validation result:
  - `51` files passed
  - `381` tests passed
- E2E validation result:
  - authenticated env run passed `5` Playwright tests

### What is now overridden
- Older notes that describe notification delivery as entirely absent without preference controls.
- Any note implying Sprint 15 added real push delivery, autonomous notification sending, a scheduler, a new settings page, or growth-style alerts.

### Next sprint start order
1. Freeze/package `xw-sprint-15-ready`.
2. Start Sprint 16 from the frozen Sprint 15 baseline.
3. Preserve user-controlled notification preferences and all prior sprint guardrails.
