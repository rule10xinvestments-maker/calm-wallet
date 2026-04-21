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
