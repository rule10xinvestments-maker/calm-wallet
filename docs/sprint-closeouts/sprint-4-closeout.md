# Sprint 4 Closeout

## Sprint verdict
Ready

## Sprint objective
Harden the bounded staged import lifecycle and review path on top of `xw-sprint-3-ready` without widening import directions, adding pages, or adding parser/OCR execution.

Sprint 4 stayed limited to:
- `receipt_image`
- `csv_import`
- existing Assistant and Transactions surfaces
- service-layer, ownership-safe staged import boundaries

## What shipped vs planned

### Shipped
- Import lifecycle hardening:
  - `uploaded -> parsing`
  - `parsing -> parsed`
  - `parsing -> failed`
  - `parsed -> reviewed` only when all candidates are accepted or rejected
- Runtime-log type hardening for safe nullable string summaries.
- Transactions staged import review UX hardening:
  - pending candidates are clearly reviewable
  - accepted/rejected candidates are not shown as pending work
  - compact progress copy such as `1 item to review`, `1 of 3 reviewed`, and `Review complete`
  - failed imports show safe user-facing copy
  - completed imports show a calm completed state
- Parser-result ingestion hardening:
  - ingestion only runs from `parsing`
  - valid rows create pending-review candidates
  - invalid rows are skipped with safe summary metadata
  - zero valid rows fails the import safely
  - unsupported import types are rejected
  - parser-provided lifecycle and review status fields are ignored
- Focused tests for lifecycle transitions, review completion, Transactions review UX, parser ingestion hardening, action-state shapes, and older typed auth mocks.

### Planned and intentionally not shipped
- New primary pages
- PDF imports
- Bank or card linking
- OCR or parser-engine execution
- Broad CSV mapping UX
- Retry or repair flow for failed imports
- Any weakening of service-layer, ownership, validation, or AI runtime boundaries

## Files changed summary

### Import lifecycle and review services
- `C:\xw\src\domain\imports\schemas.ts`
- `C:\xw\src\domain\imports\types.ts`
- `C:\xw\src\lib\server\imports-status-transition.ts`
- `C:\xw\src\lib\server\imports-parsing-completion.ts`
- `C:\xw\src\lib\server\imports-parser-result-ingestion.ts`
- `C:\xw\src\lib\server\imports-review-decision.ts`
- `C:\xw\src\lib\server\imports-review-completion.ts`
- `C:\xw\src\lib\actions\imports.ts`
- `C:\xw\src\lib\actions\imports-state.ts`

### Transactions review UX
- `C:\xw\src\components\screens\transactions-overview.tsx`

### AI runtime validation fix
- `C:\xw\src\domain\ai\runtime-log.ts`

### Validation and test support
- `C:\xw\src\tests\unit\assistant-composer.test.tsx`
- `C:\xw\src\tests\unit\imports-*.test.ts`
- `C:\xw\src\tests\unit\transactions-overview.test.tsx`
- `C:\xw\src\tests\unit\test-users.ts`
- `C:\xw\tsconfig.json`

Repo workspace cleanup:
- removed ignored copied validation artifact `C:\xw\validation-fresh`
- added `validation-fresh` to `tsconfig.exclude`

## Validation results

Final Sprint 4 closeout validation on 2026-04-27:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `36` test files passed
  - `267` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - first sandboxed attempt failed with:
    - `EPERM: operation not permitted, unlink 'C:\xw\test-results\.last-run.json'`
  - rerun outside the sandbox passed:
    - `4` Playwright tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 4 freeze.

### Known risks and seams
- Parser execution remains intentionally out of scope; ingestion accepts bounded parser-result payloads only.
- Skipped parser-row summaries are safe action-result metadata, not a separate persisted audit table.
- Failed import UX is intentionally explanatory only; retry and repair are out of scope.
- Review UX remains intentionally compact inside the existing Transactions page.
- Supported staged import directions remain locked to `receipt_image` and `csv_import`.

## xw update instruction
Update now.

Sprint 4 is safe to freeze as `xw-sprint-4-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-4-ready`.
2. Start Sprint 5 only from the frozen Sprint 4 baseline.
3. Keep import directions locked unless a later sprint explicitly changes scope.
4. Keep all import-derived writes behind ownership, schema validation, service-layer execution, and safe review states.

## Packaging instructions for `xw-sprint-4-ready`

### Exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Suggested git tag
```powershell
& 'C:\Program Files\Git\cmd\git.exe' -C 'C:\xw' tag -a xw-sprint-4-ready -m "Sprint 4 ready baseline"
```
