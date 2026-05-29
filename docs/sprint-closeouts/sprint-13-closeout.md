# Sprint 13 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver CSV Bank Statement Import MVP on top of `xw-sprint-12-ready`, preserving accepted restore, receipt import, Assistant spending questions, Insights, and budget baselines.

Sprint 13 stayed limited to:
- CSV upload into private staged import storage
- safe CSV parsing with bounded limits
- staged `import_candidates`
- duplicate safeguards before staging
- existing Transactions review/accept/reject flow

## What shipped
- Added CSV file-size and CSV-compatible MIME validation while continuing to reject PDFs.
- Added a safe CSV bank statement parser with max rows, max columns, max cell length, quoted-cell handling, amount/date/description mapping, debit/credit handling, and graceful invalid-row skipping.
- Added authenticated server upload for CSV bank statements.
- CSV uploads use sanitized filenames and user-scoped private storage paths in the existing `staged-imports` bucket.
- CSV uploads create `import_records` only after storage upload succeeds.
- Parsed usable rows are staged as pending review candidates.
- Duplicate rows and same-user existing transaction matches are skipped before staging.
- Existing Transactions review remains the review surface; accepting a candidate still creates the transaction through the service layer.
- Assistant staged upload UI now routes CSV files through the server parse/stage flow while receipt images keep the existing staged upload transport.

## Intentionally not shipped
- New primary pages
- PDF import support
- Bank or card linking
- Bank-balance claims
- Available balance wording
- Accounting dashboard
- Automatic trusted bulk import without review
- Arbitrary SQL
- Direct assistant database access
- Uncontrolled AI behavior
- Line-item extraction
- Fake OCR or confidence

## Files changed summary

### CSV import
- `C:\xw\src\lib\imports\storage.ts`
- `C:\xw\src\lib\imports\csv-bank-statement-parser.ts`
- `C:\xw\src\lib\server\csv-bank-statement-import.ts`
- `C:\xw\src\lib\actions\imports.ts`
- `C:\xw\src\lib\actions\imports-state.ts`

### UI
- `C:\xw\src\components\assistant\assistant-composer.tsx`

### Tests
- `C:\xw\src\tests\unit\csv-bank-statement-parser.test.ts`
- `C:\xw\src\tests\unit\csv-bank-statement-import.test.ts`
- `C:\xw\src\tests\unit\assistant-composer.test.tsx`
- `C:\xw\src\tests\unit\import-storage.test.ts`

## Validation results

Final Sprint 13 validation on 2026-05-03:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `47` test files passed
  - `363` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - unauthenticated default run: `4` passed, `1` authenticated test skipped
  - authenticated env run with `.env.e2e.local`: `5` passed
  - Sprint 8 restore regression executed and passed in the authenticated run

Focused Sprint 13 validation also passed:
- `4` test files passed
- `24` tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 13 closeout.

### Known risks and seams
- CSV column detection is intentionally simple and header-based.
- Currency defaults to `USD` for staged CSV candidates because Sprint 13 did not add a mapping UI.
- Duplicate protection is conservative and skips exact same-user matches by amount, date, and normalized description/counterparty.
- Skipped CSV rows are summarized in the action result but not persisted as separate row-level audit records.
- Existing browser upload transport remains for receipt images; CSV uses the server upload path so it can parse safely before review.

## xw update instruction
Update now.

Sprint 13 is safe to freeze as `xw-sprint-13-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-13-ready`.
2. Start Sprint 14 only from the frozen Sprint 13 baseline.
3. Preserve CSV imports as private, review-first, staged candidates.
4. Do not add PDF import, bank/card linking, new primary pages, Available balance wording, automatic trusted bulk import, or uncontrolled AI behavior.
