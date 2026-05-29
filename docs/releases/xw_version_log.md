# xw Version Log

This file records named repo snapshot points used for packaging, handoff, and sprint transitions.

It is not a changelog for every commit.
It is the release memory for meaningful xw package states.

---

## Release: `xw-sprint-1-ready`

### Date
2026-04-21

### Sprint
Sprint 1

### Status
Ready

### Why this snapshot exists
This snapshot marks the point where Sprint 1 foundation work is considered ready for packaging and handoff.

It exists so the repo, knowledge layer, and next sprint plan all reference the same stable baseline.

### Included in this snapshot
- Mobile-first app shell for the locked 3-page product structure.
- Public auth routes for sign-in and sign-up.
- Protected routing and authenticated layout.
- Initial database foundation with Sprint 1 migration.
- Controlled category seed for MVP categories.
- Ownership and row-level security foundation.
- Transaction domain/service validation foundation.
- AI tool registry and runtime contract scaffolding.
- AI action log and transaction-event audit scaffolding.
- Import record/storage foundation.
- Unit and e2e test foundation for the current Sprint 1 surface.

### Not included in this snapshot
- Full natural-language assistant behavior.
- Assistant-driven edit/delete/recategorize UI flows.
- Receipt OCR/parsing engine.
- Full CSV import review workflow.
- Notification delivery system.
- PDF import support.
- Direct bank or card linking.
- Advanced insights or forecasting systems.

### Validation state
- `npm run typecheck`: treated as passing for the ready snapshot.
- `npm run lint`: treated as passing for the ready snapshot.
- `npm run test`: treated as passing for the ready snapshot.
- `npm run build`: treated as passing for the ready snapshot.
- `npm run test:e2e`: treated as passing for the ready snapshot.

> Attach exact command output separately if you want strict release-trace evidence.

### Known remaining risks
- Current assistant UI is narrower than the full product contract.
- Assistant UI currently supports create transaction and list recent transactions only.
- Mutation flows through assistant UI are not yet fully implemented.
- Imports remain foundation/staging oriented.
- Notification delivery is not yet implemented.
- Legacy notes must remain overridden by the active current source-of-truth file.

### Active source-of-truth notes at this release
- Sprint 1 is ready.
- `xw` should be updated now.
- The active current-truth file is `knowledge_update_current_source_of_truth.md`.
- Next execution focus is Sprint 2 assistant runtime implementation.

### Recommended next release direction
The next meaningful xw snapshot should be created after assistant runtime mutation flows are safely expanded and tested for:
- `update_transaction`
- `delete_transaction`
- `recategorize_transaction`

---

## Entry Template

## Release: `xw-name-here`

### Date
YYYY-MM-DD

### Sprint
Sprint name or number

### Status
Ready | Partial | Blocked

### Why this snapshot exists
Reason for packaging this repo state.

### Included in this snapshot
- item
- item

### Not included in this snapshot
- item
- item

### Validation state
- typecheck result
- lint result
- test result
- build result
- e2e result if relevant

### Known remaining risks
- risk
- risk

### Active source-of-truth notes at this release
- current truth note
- current truth note

### Recommended next release direction
What should happen before the next named snapshot.

---

## Release verification update: `xw-sprint-1-ready`

### Date
2026-04-21

### Sprint
Sprint 1

### Status
Ready

### Why this verification entry exists
This entry records the final clean validation proof and packaging guidance used to freeze the trusted Sprint 1 baseline.

### Included in this verified baseline
- Authenticated App Router shell with exactly three protected primary pages
- Public auth routes and callback flow
- Supabase auth/session/guard foundation
- Sprint 1 schema, RLS, ownership policies, and category seed
- Transaction domain/service foundation with audit event support
- AI runtime boundary scaffolding with whitelist, policy, executor, and runtime logging
- Thin Assistant, Transactions, and Insights product flows
- Import storage/path scaffolding
- Unit and Playwright test foundation

### Validation status
- clean validation folder: `C:\xw-validation-fresh`
- `npm install`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
- `npm run test:e2e`: passed

### Packaging exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Notes
- The live `C:\xw` workspace had earlier local dependency-lock contamination, so release validation proof was taken from the isolated fresh copy instead of relying on the contaminated workspace tree.
- This does not indicate a repo-code blocker.
- This freeze environment did not expose `.git` metadata or a working `git` binary, so the release tag must be created from the canonical git checkout rather than from this unpacked package-prep workspace.

---

## Release: `xw-sprint-2-ready`

### Date
2026-04-22

### Sprint
Sprint 2

### Status
Ready

### Why this snapshot exists
This snapshot marks the point where Sprint 2 assistant/runtime expansion is complete, minimally user-accessible from the Assistant page, and ready for trusted baseline packaging.

### Included in this snapshot
- Assistant/runtime support for:
  - `update_transaction`
  - `delete_transaction`
  - `recategorize_transaction`
  - `summarize_spending`
- Assistant action parsing for all approved Sprint 2 tool paths
- Real read-only `summarize_spending` summary execution
- Minimum safe Assistant page trigger UI for all approved Sprint 2 actions
- Narrow schema hardening on Sprint 2 tool request branches
- Focused unit coverage for assistant UI wiring, action parsing, runtime execution, summary correctness, and transaction boundary behavior

### Not included in this snapshot
- New primary pages
- Open-ended chat behavior
- PDF imports
- Direct bank or card linking
- Dashboard expansion
- Sprint 3 staged import workflow work

### Validation state
- focused Sprint 2 closeout validation command passed:
  - `npm.cmd run test -- --run src/tests/unit/assistant-composer.test.tsx src/tests/unit/assistant-action.test.ts src/tests/unit/assistant-server.test.ts src/tests/unit/ai-tools.test.ts src/tests/unit/transactions-read-model.test.ts src/tests/unit/transactions-domain.test.ts src/tests/unit/transaction-mutations.test.ts`
- `7` test files passed
- `64` tests passed
- validation scope covered:
  - `assistant-composer`
  - `assistant-action`
  - `assistant-server`
  - `ai-tools`
  - `transactions-read-model`
  - `transactions-domain`
  - `transaction-mutations`

### Package exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Known remaining risks
- Closeout validation was scoped to the Sprint 2 assistant/runtime/UI surface, not a full repo-wide release sweep.
- The Assistant UI remains intentionally bounded and operational rather than conversational.
- The minimal action UI still depends on explicit IDs and bounded field entry rather than richer guided selection.

### Active source-of-truth notes at this release
- Sprint 2 is ready.
- `xw` should be updated now.
- The Assistant page is no longer create/list only.
- `summarize_spending` is a real read-only capability.
- Next execution focus should move to Sprint 3 staged import workflow planning only after freezing this baseline.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 3 staged import workflow scope is implemented and validated from the frozen `xw-sprint-2-ready` baseline.

---

## Release: `xw-sprint-3-ready`

### Date
2026-04-26

### Sprint
Sprint 3

### Status
Ready

### Why this snapshot exists
This snapshot marks the point where the bounded staged import workflow is functionally complete, validated, and ready for trusted baseline packaging.

### Included in this snapshot
- Ownership-safe staged import record and candidate domain foundation
- Private `staged-imports` storage foundation with owned object-path policy
- Staged upload preparation, upload transport, and upload-completion helpers
- End-to-end staged upload flow on the existing Assistant page
- Owned staged import read models, loaders, lists, and actions
- Parser-result ingestion foundation
- Minimal candidate review foundation and action path:
  - accept candidate
  - reject candidate
  - idempotent accept retry
- Existing Transactions page staged import visibility, candidate previews, review progress, review-status indicator, and minimal review controls

### Not included in this snapshot
- New primary pages
- PDF imports
- Bank linking
- Card linking
- OCR or parser-engine execution
- Broad review UI
- Transaction editing from staged import review controls
- Sprint 4 work

### Validation status
- focused Sprint 3 closeout validation command passed:
  - `npm.cmd run test -- --run src/tests/unit/import-storage.test.ts src/tests/unit/imports-domain.test.ts src/tests/unit/imports-read-model.test.ts src/tests/unit/imports-intake-action.test.ts src/tests/unit/imports-upload-preparation.test.ts src/tests/unit/imports-upload-transport.test.ts src/tests/unit/imports-upload-completion.test.ts src/tests/unit/imports-parser-result-ingestion.test.ts src/tests/unit/imports-review-decision.test.ts src/tests/unit/imports-review-decision-action.test.ts src/tests/unit/imports-review-progress.test.ts src/tests/unit/imports-review-progress-action.test.ts src/tests/unit/assistant-composer.test.tsx src/tests/unit/imports-browser-upload.test.ts src/tests/unit/transactions-overview.test.tsx`
- `15` test files passed
- `95` tests passed

### Packaging exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Known remaining risks
- Closeout validation was intentionally scoped to the Sprint 3 staged import surface, not a full repo-wide release sweep.
- Parser execution remains intentionally out of scope.
- The Transactions review UI is intentionally minimal and stays inside the existing page detail area only.

### Active source-of-truth notes at this release
- Sprint 3 is ready.
- `xw` should be updated now.
- Supported staged import directions remain locked to `receipt_image` and `csv_import`.
- The next sprint should build only the next bounded staged import lifecycle step from this frozen baseline.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 4 extends the bounded staged import lifecycle on top of the frozen `xw-sprint-3-ready` baseline without widening import directions or adding new primary pages.

---

## Release: `xw-sprint-4-ready`

### Date
2026-04-27

### Sprint
Sprint 4

### Status
Ready

### Why this snapshot exists
This snapshot marks the point where the bounded staged import lifecycle, Transactions review experience, and parser-result ingestion hardening are complete and ready for trusted baseline packaging.

### Included in this snapshot
- Staged import lifecycle hardening:
  - `uploaded -> parsing`
  - `parsing -> parsed`
  - `parsing -> failed`
  - `parsed -> reviewed` only after all candidates are accepted or rejected
- Transactions page staged review hardening:
  - pending candidates shown as actionable work
  - accepted/rejected candidates removed from pending actions
  - compact progress copy
  - safe failed-import copy
  - calm completed state
- Parser-result ingestion hardening:
  - ingestion only from `parsing`
  - required money fields for persisted candidates
  - invalid parser rows skipped safely
  - zero valid rows fail safely
  - unsupported import types rejected
  - parser-provided lifecycle/status ignored
- Full validation gate, including Playwright e2e.

### Not included in this snapshot
- New primary pages
- PDF imports
- Bank linking
- Card linking
- OCR or parser-engine execution
- Broad CSV mapping UX
- Retry or repair flow for failed imports

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `36` files and `267` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, `4` Playwright tests
- Note: first sandboxed e2e attempt failed on `EPERM` unlinking `C:\xw\test-results\.last-run.json`; rerun outside the sandbox passed.

### Packaging exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Known remaining risks
- Parser execution remains out of scope.
- Skipped invalid parser-row summaries are returned safely by ingestion actions, not separately persisted as audit records.
- Failed import retry/repair is intentionally not implemented.
- Review UX remains compact inside the existing Transactions page.

### Active source-of-truth notes at this release
- Sprint 4 is ready.
- `xw` should be updated now.
- Recommended release label: `xw-sprint-4-ready`.
- Supported staged import directions remain locked to `receipt_image` and `csv_import`.
- The next sprint must start from this frozen baseline and must not widen import scope without explicit planning.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 5 adds its explicitly planned scope on top of frozen `xw-sprint-4-ready`, preserving the current import and runtime guardrails.

---

## Release: `xw-sprint-7-ready`

### Date
2026-05-02

### Sprint
Sprint 7

### Status
Ready

### Why this snapshot exists
This snapshot marks the point where bounded assistant natural-language corrections are ready for Sprint 8 restore work.

### Included in this snapshot
- Natural-language correction intents for delete, recategorize, mark correct, show needs review, and show recent.
- Safe target resolution for last, current, text, and id references.
- Ambiguous correction targets fail safely without mutation.
- Assistant mutations remain routed through schema validation, policy validation, ownership-scoped services, and runtime logging.

### Not included in this snapshot
- Generic undo.
- Restore deleted transaction.
- PDF imports.
- Bank linking.
- Card linking.
- New primary pages.
- Direct AI database writes.

### Validation status
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
- `npm run test:e2e`: passed

### Known remaining risks
- Restore of deleted transactions is intentionally deferred to Sprint 8.
- Natural-language behavior remains intentionally bounded rather than open-ended.

### Active source-of-truth notes at this release
- Sprint 7 is ready.
- Recommended release label: `xw-sprint-7-ready`.
- Undo last is unsupported until Sprint 8 restore work.
- Next execution should preserve the existing runtime boundary while adding only the narrow restore flow.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 8 implements safe restore of recently soft-deleted transactions without generic undo or new product scope.

---

## Release: `xw-sprint-9-ready`

### Date
2026-05-02

### Sprint
Sprint 9

### Status
Ready

### Why this snapshot exists
This snapshot marks the first safe Receipt Image Import MVP on top of the accepted Sprint 8 restore baseline.

### Included in this snapshot
- Receipt-specific server upload path with authentication, private storage, safe MIME allow-list, file-size limit, sanitized filenames, and user-scoped paths.
- Existing staged upload intake/completion hardening for receipt MIME validation and PDF rejection.
- Receipt candidate staging for owned receipt image records with usable candidate data only.
- Existing Transactions review/accept/reject UI for staged candidates.
- Accept candidate path through the existing transaction service-layer creation path.
- Reject candidate path through candidate status update without deleting raw trace data.
- Tests proving imported content does not alter AI runtime/tool policy.
- Sprint 8 restore regression remained green in authenticated e2e.

### Not included in this snapshot
- New primary pages.
- PDF imports.
- Bank linking.
- Card linking.
- OCR execution.
- Fake OCR confidence.
- Line-item extraction.
- Accounting-style import dashboard.
- Direct assistant database writes.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `41` files and `325` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, `5` Playwright tests

### Known remaining risks
- Receipt extraction/OCR is intentionally not implemented.
- Candidate staging accepts bounded usable data only; broad parser/OCR behavior remains out of scope.
- Review UX remains compact in the existing Transactions page.

### Active source-of-truth notes at this release
- Sprint 9 is ready.
- Recommended release label: `xw-sprint-9-ready`.
- Receipt image imports are private, review-first, and untrusted.
- PDF imports, bank/card linking, new pages, uncontrolled AI, fake confidence, and line-item extraction remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 10 adds a narrowly planned extension on top of `xw-sprint-9-ready`, preserving the import and AI runtime guardrails.

---

## Release: `xw-sprint-10-ready`

### Date
2026-05-02

### Sprint
Sprint 10

### Status
Ready

### Why this snapshot exists
This snapshot marks the first read-only Assistant Spending Questions v1 release on top of the accepted Sprint 9 receipt import baseline.

### Included in this snapshot
- Whitelisted `answer_financial_question` AI tool.
- Schema-validated read-only intents for monthly spending, monthly income, category spending, recent largest expense, needs-review summary, and recent transactions summary.
- Ownership-scoped service-layer reads through `TransactionService.listTransactions(userId, filters)`.
- Runtime logging for financial question actions.
- Short Assistant answers using Tracked-data wording.
- Unsupported handling for bank, card, available balance, advice, and out-of-scope requests.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt image import behavior remained intact.

### Not included in this snapshot
- New primary pages.
- PDF imports.
- Bank linking.
- Card linking.
- Available-balance language.
- Financial advice.
- Arbitrary SQL.
- Direct assistant database access.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `41` files and `331` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- Category questions require controlled category resolution.
- Multi-currency totals are reported per currency and not converted.
- Answers remain simple tracked-data summaries, not advice.

### Active source-of-truth notes at this release
- Sprint 10 is ready.
- Recommended release label: `xw-sprint-10-ready`.
- Assistant financial questions are read-only and tracked-data-only.
- PDF imports, bank/card linking, new pages, arbitrary SQL, financial advice, direct assistant DB access, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 11 adds a narrowly planned extension on top of `xw-sprint-10-ready`, preserving restore, receipt import, and read-only Assistant guardrails.

---

## Release: `xw-sprint-11-ready`

### Date
2026-05-03

### Sprint
Sprint 11

### Status
Ready

### Why this snapshot exists
This snapshot marks the first useful Insights page as a monthly clarity layer on top of the accepted Sprint 10 Assistant spending question baseline.

### Included in this snapshot
- Monthly tracked spending total.
- Monthly tracked income total.
- Tracked balance from tracked transaction data.
- Category breakdown with transaction counts.
- Largest recent tracked expenses.
- Needs Review count.
- Empty and low-data Insights states.
- Mobile-first, practical Insights UI on the existing primary page.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt image import behavior remained covered.
- Sprint 10 `answer_financial_question` behavior remained covered.

### Not included in this snapshot
- New primary pages.
- PDF imports.
- Bank linking.
- Card linking.
- Available-balance wording.
- Bank-balance claims.
- Accounting dashboard.
- Financial advice.
- Direct assistant database access.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `43` files and `338` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- Insights is intentionally simple and tracked-data-only.
- Largest recent expenses are amount-sorted tracked expenses, not anomaly detection.
- Multi-currency handling remains basic and should stay transparent if expanded.

### Active source-of-truth notes at this release
- Sprint 11 is ready.
- Recommended release label: `xw-sprint-11-ready`.
- Insights is monthly clarity, not a bank dashboard or accounting product.
- PDF imports, bank/card linking, new pages, Available balance wording, financial advice, direct assistant DB access, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 12 adds a narrowly planned extension on top of `xw-sprint-11-ready`, preserving restore, receipt import, Assistant read-only questions, and tracked-data-only Insights guardrails.

---

## Release: `xw-sprint-12-ready`

### Date
2026-05-03

### Sprint
Sprint 12

### Status
Ready

### Why this snapshot exists
This snapshot marks the first optional monthly controlled-category budget setup on top of the accepted Sprint 11 Insights baseline.

### Included in this snapshot
- Budget domain schemas, policy, service, and types.
- Authenticated budget save and remove server actions.
- Own-row budget delete RLS policy.
- Insights budget progress for budget amount, actual spending, remaining amount, percent used, and over-budget state.
- Compact budget add/edit/remove controls in the existing Insights page.
- Budget empty state in Insights.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt image import behavior remained covered.
- Sprint 10 `answer_financial_question` behavior remained covered.
- Sprint 11 monthly clarity Insights behavior remained covered.

### Not included in this snapshot
- New primary pages.
- Custom categories.
- Rollover budgets.
- Envelope budgeting.
- Forecasting.
- Assistant budget-writing tool.
- PDF imports.
- Bank linking.
- Card linking.
- Available-balance wording.
- Bank-balance claims.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `45` files and `351` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- Budget delete is a hard row delete because the schema has no active or soft-delete column.
- Budgets are lightweight monthly limits and not a planning system.
- Multi-currency handling remains simple per budget row.

### Active source-of-truth notes at this release
- Sprint 12 is ready.
- Recommended release label: `xw-sprint-12-ready`.
- Budgets are optional, controlled-category-only, and Insights-scoped.
- PDF imports, bank/card linking, new pages, custom categories, rollover/envelope budgeting, forecasting, Assistant budget writing, Available balance wording, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 13 adds a narrowly planned extension on top of `xw-sprint-12-ready`, preserving restore, receipt import, Assistant read-only questions, tracked-data-only Insights, and optional budget guardrails.

---

## Release: `xw-sprint-13-ready`

### Date
2026-05-03

### Sprint
Sprint 13

### Status
Ready

### Why this snapshot exists
This snapshot marks the first review-first CSV Bank Statement Import MVP on top of the accepted Sprint 12 budget baseline.

### Included in this snapshot
- CSV upload validation for authenticated users, compatible MIME types, safe file size, sanitized filenames, and user-scoped private storage paths.
- Safe CSV parser with max rows, max columns, max cell length, quoted-cell handling, amount/date/description mapping, and debit/credit direction handling.
- Server-side CSV upload, parse, dedupe, and candidate staging path.
- `import_records` creation after storage upload succeeds.
- `import_candidates` creation only for staged usable rows.
- Duplicate safeguards for repeated CSV rows and same-user existing transaction matches.
- Existing Transactions review/accept/reject flow for CSV candidates.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, and Sprint 12 budget behavior remained covered.

### Not included in this snapshot
- New primary pages.
- PDF imports.
- Bank linking.
- Card linking.
- Bank-balance claims.
- Available-balance wording.
- Automatic trusted bulk import.
- Arbitrary SQL.
- Direct assistant database access.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `47` files and `363` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- CSV column detection is simple and header-based.
- CSV candidate currency defaults to `USD`; no mapping UI exists yet.
- Duplicate safeguards are conservative and exact-match oriented.
- Skipped rows are summarized in action results rather than persisted as row-level audit records.

### Active source-of-truth notes at this release
- Sprint 13 is ready.
- Recommended release label: `xw-sprint-13-ready`.
- CSV imports are private, staged, review-first, and untrusted.
- PDF imports, bank/card linking, new pages, automatic bulk import, Available balance wording, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 14 adds a narrowly planned extension on top of `xw-sprint-13-ready`, preserving restore, receipt import, Assistant read-only questions, tracked-data-only Insights, optional budgets, and review-first CSV import guardrails.

---

## Release: `xw-sprint-14-ready`

### Date
2026-05-03

### Sprint
Sprint 14

### Status
Ready

### Why this snapshot exists
This snapshot marks the first user-owned Category Correction Memory v1 release on top of the accepted Sprint 13 CSV import baseline.

### Included in this snapshot
- Category memory domain schemas, policy, types, and service-layer functions.
- User-owned correction memory for merchant, phrase, and import-description signals.
- Controlled category validation for memory writes and reads.
- Memory recording from transaction recategorization.
- Memory reinforcement from accepted categorized import candidates.
- Strong memory suggestions for Assistant capture, receipt staging, and CSV staging.
- Weak memory matches left reviewable.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, Sprint 12 budgets, and Sprint 13 CSV import behavior remained covered.

### Not included in this snapshot
- New primary pages.
- Custom categories.
- Rule-builder UI.
- Global learning.
- Model training.
- PDF imports.
- Bank linking.
- Card linking.
- Available-balance wording.
- Automatic fake certainty.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `48` files and `371` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- Matching is intentionally lightweight.
- No decay, conflict UI, or rule builder exists.
- Candidate category changes before accept are not yet a separate UI path.

### Active source-of-truth notes at this release
- Sprint 14 is ready.
- Recommended release label: `xw-sprint-14-ready`.
- Category memory is user-owned, controlled-category-only, and strong-match based.
- PDF imports, bank/card linking, custom categories, rule-builder UI, model training, Available balance wording, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 15 adds a narrowly planned extension on top of `xw-sprint-14-ready`, preserving restore, receipt import, Assistant read-only questions, tracked-data-only Insights, optional budgets, review-first CSV import, and controlled category memory guardrails.

---

## Release: `xw-sprint-15-ready`

### Date
2026-05-03

### Sprint
Sprint 15

### Status
Ready

### Why this snapshot exists
This snapshot marks the first Notifications Foundation v1 release on top of the accepted Sprint 14 category memory baseline.

### Included in this snapshot
- Notification domain schemas, types, service-layer functions, and calm copy templates.
- User-owned notification preference reads and updates through the existing `notification_preferences` table.
- Private push subscription storage scaffolding with user ownership, RLS policies, and disable support.
- Daily reminder and monthly review eligibility helpers with suppression states.
- Compact notification preference controls inside the existing Assistant page.
- Sprint 8 restore regression remained green in authenticated e2e.
- Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, Sprint 12 budgets, Sprint 13 CSV import, and Sprint 14 category memory behavior remained covered.

### Not included in this snapshot
- Real push notification sending.
- Autonomous AI notification sending.
- Scheduler or delivery worker.
- New primary pages.
- PDF imports.
- Bank linking.
- Card linking.
- Available-balance wording.
- Bank-balance claims.
- Spammy, urgent, or shame-based alerts.
- Uncontrolled AI behavior.

### Validation status
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, `51` files and `381` tests
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed, authenticated env run passed `5` Playwright tests

### Known remaining risks
- Real push delivery is intentionally not implemented.
- Browser push permission and client-side subscription capture are not a full user flow yet.
- Eligibility helpers are not connected to a scheduler.
- Existing overspending, unusual spending, and savings opportunity preference columns remain schema defaults but are not surfaced as Sprint 15 behavior.

### Active source-of-truth notes at this release
- Sprint 15 is ready.
- Recommended release label: `xw-sprint-15-ready`.
- Notifications are user-controlled support scaffolding, not growth alerts or autonomous AI behavior.
- PDF imports, bank/card linking, new pages, Available balance wording, bank-balance claims, real push delivery, and uncontrolled AI remain out of scope.

### Recommended next release direction
The next meaningful xw snapshot should be created only after Sprint 16 adds a narrowly planned extension on top of `xw-sprint-15-ready`, preserving user control, no real push sending unless explicitly scoped, and all prior sprint guardrails.
