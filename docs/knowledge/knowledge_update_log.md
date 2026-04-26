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
