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
