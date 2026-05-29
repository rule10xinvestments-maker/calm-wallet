# Sprint 9 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Receipt Image Import MVP on top of `xw-sprint-8-ready`, preserving the accepted Sprint 8 `restore_transaction` path and keeping imports bounded, private, and review-first.

Sprint 9 stayed limited to:
- receipt image upload hardening
- private staged import storage
- `import_records` and `import_candidates`
- lightweight Transactions review/accept/reject behavior
- existing Assistant and Transactions surfaces
- service-layer, ownership-safe import boundaries

## What shipped vs planned

### Shipped
- Receipt-image-only server upload path:
  - authenticated user required
  - safe raster image MIME allow-list
  - 5 MB file-size limit
  - sanitized filename
  - user-scoped private storage path
  - private `staged-imports` bucket
  - import record created only after storage upload succeeds
- Existing staged signed-upload intake hardened:
  - receipt uploads reject PDF and unsupported image MIME types
  - CSV uploads remain constrained to CSV-shaped files
  - Assistant upload UI rejects PDFs and oversized receipt images before upload
- Receipt candidate staging:
  - stages candidates only for owned `receipt_image` import records
  - requires usable amount, currency, date, and transaction type
  - stores untrusted receipt text as candidate text only
  - keeps `confidenceScore` null; no fake OCR confidence
  - marks candidates `pending_review`
- Existing Transactions staged import review remains the MVP review surface:
  - pending candidates are reviewable
  - accepted/rejected candidates stop being actionable pending work
  - accept calls the existing transaction service-layer creation path
  - reject updates candidate state instead of deleting trace data
- Sprint 8 restore regression protected by authenticated e2e.

### Planned and intentionally not shipped
- New primary pages
- PDF imports
- Bank or card linking
- Public raw-file exposure
- OCR engine execution
- Fake OCR confidence
- Line-item extraction
- Accounting-style import dashboard
- Direct assistant database writes
- Any imported-content path that can alter AI runtime/tool policy

## Files changed summary

### Receipt upload and candidate staging
- `C:\xw\src\lib\imports\storage.ts`
- `C:\xw\src\lib\server\receipt-image-import.ts`
- `C:\xw\src\lib\server\receipt-candidate-staging.ts`
- `C:\xw\src\lib\server\imports-upload-preparation.ts`
- `C:\xw\src\lib\server\imports-upload-completion.ts`
- `C:\xw\src\lib\actions\imports.ts`
- `C:\xw\src\lib\actions\imports-state.ts`

### UI
- `C:\xw\src\components\assistant\assistant-composer.tsx`

### Tests
- `C:\xw\src\tests\unit\receipt-image-import.test.ts`
- `C:\xw\src\tests\unit\receipt-candidate-staging.test.ts`
- `C:\xw\src\tests\unit\imports-receipt-actions.test.ts`
- `C:\xw\src\tests\unit\imports-upload-preparation.test.ts`
- `C:\xw\src\tests\unit\imports-intake-action.test.ts`
- `C:\xw\src\tests\unit\imports-upload-completion.test.ts`
- `C:\xw\src\tests\unit\assistant-composer.test.tsx`

## Validation results

Final Sprint 9 validation on 2026-05-02:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `41` test files passed
  - `325` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - `5` Playwright tests passed
  - authenticated Sprint 8 restore regression executed and passed

Focused Sprint 9 import validation also passed:
- `9` test files passed
- `59` tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 9 closeout.

### Known risks and seams
- Receipt OCR/extraction remains intentionally out of scope.
- Candidate staging is a bounded server path for usable data; it does not infer or extract line items.
- The existing signed-upload flow remains available for staged uploads and is now MIME-hardened, while the new `uploadReceiptImage` server action provides the receipt-specific direct server upload path.
- Review UX remains intentionally compact inside the existing Transactions page.
- The workspace still contains prior Sprint 8 package artifacts unless cleaned separately for a packaging task.

## xw update instruction
Update now.

Sprint 9 is safe to freeze as `xw-sprint-9-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-9-ready`.
2. Start Sprint 10 only from the frozen Sprint 9 baseline.
3. Preserve receipt image imports as review-first and untrusted.
4. Do not add PDF import, bank/card linking, new primary pages, line-item extraction, or uncontrolled AI behavior.
