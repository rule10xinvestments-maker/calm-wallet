# Sprint 14 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Category Correction Memory v1 on top of `xw-sprint-13-ready`, preserving accepted restore, receipt import, Assistant spending questions, Insights, budgets, and CSV import baselines.

Sprint 14 stayed limited to:
- user-owned correction memory
- controlled category suggestions only
- strong-match reuse for future capture and import staging
- no new UI surface or rule builder

## What shipped
- Added category-memory domain schemas, policy helpers, types, and service-layer functions.
- Used the existing `user_category_memory` table and own-row RLS assumptions; no schema expansion was required.
- Added `recordCategoryCorrectionMemory`, `findCategoryMemoryMatch`, and `applyCategoryMemorySuggestion`.
- Recording runs only from user-approved correction paths:
  - transaction recategorization
  - accepted import candidates when a category exists
- Memory reuse now supports:
  - Assistant natural-language capture
  - receipt candidate staging
  - CSV candidate staging
- Strong owned matches can suggest a controlled category.
- Weak matches stay reviewable.
- User correction memory can beat generic category guessing.
- Imported content remains untrusted data and cannot affect AI/runtime/tool policy.

## Intentionally not shipped
- New primary pages
- Custom categories
- Rule-builder UI
- Global learning
- Model training
- PDF import support
- Bank or card linking
- Bank-balance claims
- Available balance wording
- Automatic fake certainty
- Uncontrolled AI behavior

## Files changed summary

### Category memory domain
- `C:\xw\src\domain\category-memory\schemas.ts`
- `C:\xw\src\domain\category-memory\policy.ts`
- `C:\xw\src\domain\category-memory\service.ts`
- `C:\xw\src\domain\category-memory\types.ts`

### Service wiring
- `C:\xw\src\lib\actions\assistant.ts`
- `C:\xw\src\lib\server\assistant.ts`
- `C:\xw\src\lib\server\transaction-mutations.ts`
- `C:\xw\src\lib\server\receipt-candidate-staging.ts`
- `C:\xw\src\lib\server\csv-bank-statement-import.ts`
- `C:\xw\src\lib\server\imports-review-decision.ts`

### Import candidate category support
- `C:\xw\src\domain\imports\schemas.ts`
- `C:\xw\src\domain\imports\service.ts`
- `C:\xw\src\domain\imports\types.ts`
- `C:\xw\src\lib\server\imports-parser-result-ingestion.ts`

### Tests
- `C:\xw\src\tests\unit\category-memory-domain.test.ts`
- `C:\xw\src\tests\unit\transaction-mutations.test.ts`
- `C:\xw\src\tests\unit\assistant-action.test.ts`
- `C:\xw\src\tests\unit\assistant-server.test.ts`
- `C:\xw\src\tests\unit\receipt-candidate-staging.test.ts`
- `C:\xw\src\tests\unit\csv-bank-statement-import.test.ts`

## Validation results

Final Sprint 14 validation on 2026-05-03:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `48` test files passed
  - `371` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - unauthenticated default run: `4` passed, `1` authenticated test skipped
  - authenticated env run with `.env.e2e.local`: `5` passed
  - Sprint 8 restore regression executed and passed in the authenticated run

Focused Sprint 14 validation also passed:
- `5` test files passed
- `64` tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 14 closeout.

### Known risks and seams
- Matching is intentionally lightweight: normalized exact merchant matches and contained phrase/import-description matches.
- Memory strength is simple and increments on reuse; there is no decay or conflict-resolution UI.
- No rule-builder UI exists.
- No custom categories exist.
- Import candidate category suggestions remain review-first; they do not auto-create final transactions.
- Candidate category changes before accept are not a separate UI path yet.

## xw update instruction
Update now.

Sprint 14 is safe to freeze as `xw-sprint-14-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-14-ready`.
2. Start Sprint 15 only from the frozen Sprint 14 baseline.
3. Preserve controlled-category-only memory, review-first imports, and all prior sprint guardrails.
4. Do not add PDF import, bank/card linking, new primary pages, custom categories, rule-builder UI, model training, Available balance wording, or uncontrolled AI behavior.
