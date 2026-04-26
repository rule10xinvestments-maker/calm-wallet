# Sprint 3 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver the bounded staged import workflow only for:
- `receipt_image`
- `csv_import`

This sprint was intentionally limited to staging, upload, owned visibility, and minimal candidate review inside the existing product structure.

## What shipped vs planned

### Shipped
- Ownership-safe staged import domain foundation for:
  - `import_records`
  - `import_candidates`
- Ownership-safe read models, loaders, and imports actions
- Private staged import storage foundation with the `staged-imports` bucket and owned object paths
- Truthful staged upload transport and upload-completion flow
- End-to-end staged upload flow on the existing Assistant page
- Read-only staged import visibility on the existing Transactions page
- Minimal candidate review flow on the existing Transactions page:
  - accept candidate
  - reject candidate
  - review progress
  - review-status indicator
- Focused tests covering staged import domain, storage, upload, review, and Assistant and Transactions UI wiring

### Planned and intentionally not shipped
- New primary pages
- PDF imports
- Bank or card linking
- OCR or parser-engine execution
- Broad review UI
- Transaction editing from the staged import review area
- Sprint 4 work

## Repo truth summary

### Import foundation changes
- `C:\xw\src\domain\imports\types.ts`
- `C:\xw\src\domain\imports\schemas.ts`
- `C:\xw\src\domain\imports\service.ts`
- `C:\xw\src\lib\server\imports-read-model.ts`
- `C:\xw\src\lib\server\imports-loader.ts`
- `C:\xw\src\lib\server\imports-list.ts`
- `C:\xw\src\lib\actions\imports.ts`
- `C:\xw\src\lib\actions\imports-state.ts`

These files now provide the narrow staged import record, candidate, read-model, loader, review-progress, and action boundaries for owned staged imports only.

### Storage and upload changes
- `C:\xw\src\supabase\migrations\20260421023000_sprint1_foundation.sql`
- `C:\xw\src\lib\imports\storage.ts`
- `C:\xw\src\lib\imports\browser-upload.ts`
- `C:\xw\src\lib\server\imports-upload-preparation.ts`
- `C:\xw\src\lib\server\imports-upload-transport.ts`
- `C:\xw\src\lib\server\imports-upload-completion.ts`

Repo truth:
- staged imports use the private `staged-imports` bucket
- storage object keys are user-owned
- upload transport is limited to `receipt_image` and `csv_import`
- upload completion persists only truthful metadata

### Review-flow changes
- `C:\xw\src\lib\server\imports-parser-result-ingestion.ts`
- `C:\xw\src\lib\server\imports-review-decision.ts`
- `C:\xw\src\lib\server\imports-review-progress.ts`
- `C:\xw\src\lib\server\imports-status-transition.ts`
- `C:\xw\src\lib\server\imports-parsing-completion.ts`
- `C:\xw\src\domain\transactions\types.ts`
- `C:\xw\src\domain\transactions\schemas.ts`
- `C:\xw\src\domain\transactions\service.ts`

Repo truth:
- parser-result ingestion creates owned import candidates only
- accept candidate creates one final transaction through the existing transaction service boundary
- accept retry stays idempotent through existing linkage and lookup behavior
- reject candidate updates candidate state only
- review progress stays read-only

### Assistant page upload changes
- `C:\xw\src\components\assistant\assistant-composer.tsx`

Repo truth:
- the existing Assistant page now supports the first truthful staged import upload flow
- upload scope remains bounded to `receipt_image` and `csv_import`
- success and error confirmations stay minimal

### Transactions page staged import and review changes
- `C:\xw\src\app\(protected)\transactions\page.tsx`
- `C:\xw\src\components\screens\transactions-overview.tsx`

Repo truth:
- staged imports are visible on the existing Transactions page
- staged import details remain inside the existing page
- candidate previews are visible
- accept and reject controls exist for pending candidates only
- review progress and review-status indicators are visible

### Tests added or updated
- `C:\xw\src\tests\unit\import-storage.test.ts`
- `C:\xw\src\tests\unit\imports-domain.test.ts`
- `C:\xw\src\tests\unit\imports-read-model.test.ts`
- `C:\xw\src\tests\unit\imports-intake-action.test.ts`
- `C:\xw\src\tests\unit\imports-upload-preparation.test.ts`
- `C:\xw\src\tests\unit\imports-upload-transport.test.ts`
- `C:\xw\src\tests\unit\imports-upload-completion.test.ts`
- `C:\xw\src\tests\unit\imports-parser-result-ingestion.test.ts`
- `C:\xw\src\tests\unit\imports-review-decision.test.ts`
- `C:\xw\src\tests\unit\imports-review-decision-action.test.ts`
- `C:\xw\src\tests\unit\imports-review-progress.test.ts`
- `C:\xw\src\tests\unit\imports-review-progress-action.test.ts`
- `C:\xw\src\tests\unit\assistant-composer.test.tsx`
- `C:\xw\src\tests\unit\imports-browser-upload.test.ts`
- `C:\xw\src\tests\unit\transactions-overview.test.tsx`

## Validation results

### Sprint 3 closeout validation command
```powershell
npm.cmd run test -- --run src/tests/unit/import-storage.test.ts src/tests/unit/imports-domain.test.ts src/tests/unit/imports-read-model.test.ts src/tests/unit/imports-intake-action.test.ts src/tests/unit/imports-upload-preparation.test.ts src/tests/unit/imports-upload-transport.test.ts src/tests/unit/imports-upload-completion.test.ts src/tests/unit/imports-parser-result-ingestion.test.ts src/tests/unit/imports-review-decision.test.ts src/tests/unit/imports-review-decision-action.test.ts src/tests/unit/imports-review-progress.test.ts src/tests/unit/imports-review-progress-action.test.ts src/tests/unit/assistant-composer.test.tsx src/tests/unit/imports-browser-upload.test.ts src/tests/unit/transactions-overview.test.tsx
```

### Result
- `15` test files passed
- `95` tests passed

### Validation scope
- staged import domain
- staged import storage
- staged upload preparation
- staged upload transport
- staged upload completion
- parser-result ingestion foundation
- review-decision foundation and action
- review-progress foundation and action
- Assistant staged upload UI
- Transactions staged import and review UI

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 3 freeze.

### Known risks and debt
- Validation was intentionally scoped to the Sprint 3 staged import surface, not a full repo-wide release sweep.
- Parser execution remains intentionally out of scope; parser-result ingestion exists only as bounded future-job foundation.
- The Transactions review UI is intentionally minimal and remains inside the existing staged import detail area only.

## xw update instruction
Update now

Sprint 3 is safe to freeze as `xw-sprint-3-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-3-ready`.
2. Start Sprint 4 from the frozen Sprint 3 baseline only.
3. Keep import directions locked to `receipt_image` and `csv_import` unless a later sprint explicitly changes scope.
4. Keep all future import-derived writes behind ownership, validation, and service-layer execution.

## Packaging instructions for `xw-sprint-3-ready`

### Exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Manual archive steps
1. Start from the repo root.
2. Confirm the Sprint 3 closeout validation has passed.
3. Create an archive named `xw-sprint-3-ready.zip`.
4. Exclude generated and dependency artifacts listed above.

### Example PowerShell archive flow
```powershell
$stage = 'C:\xw-package\xw-sprint-3-ready'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
robocopy 'C:\xw' $stage /E /XD '.next' 'node_modules' 'playwright-results' 'test-results' 'validation-fresh' /XF 'tsconfig.tsbuildinfo' | Out-Null
Compress-Archive -Path "$stage\*" -DestinationPath 'C:\xw-package\xw-sprint-3-ready.zip' -Force
```

### If git is available
Suggested checkpoint command:
```powershell
& 'C:\Program Files\Git\cmd\git.exe' -C 'C:\xw' tag -a xw-sprint-3-ready -m "Sprint 3 ready baseline"
```
