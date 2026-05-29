# Sprint 10 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Assistant Spending Questions v1 on top of `xw-sprint-9-ready`, preserving Sprint 8 restore and Sprint 9 receipt import behavior while keeping financial answers read-only, ownership-scoped, and service-backed.

Sprint 10 stayed limited to:
- monthly tracked spending total
- monthly tracked income total
- category tracked spending total
- recent largest tracked expense
- needs-review summary
- recent transactions summary
- existing Assistant surface only

## What shipped
- Added a whitelisted read-only AI tool, `answer_financial_question`.
- Added typed financial question schema validation for the approved intents.
- Added ownership-scoped read policy helper for transaction summaries.
- Added service-layer read-model builders for financial question answers.
- Routed natural-language spending questions through the approved tool executor and runtime logging path.
- Kept answers short and transparent with tracked-data wording.
- Preserved unsupported handling for bank, card, available balance, advice, and out-of-scope requests.
- Kept Assistant reads isolated to `TransactionService.listTransactions(userId, filters)`.

## Intentionally not shipped
- New primary pages
- PDF imports
- Bank or card linking
- Available-balance language
- Financial advice
- Arbitrary SQL or model-directed querying
- Direct assistant database reads or writes
- Generic autonomous agent behavior

## Files changed summary

### Assistant read intents and runtime
- `C:\xw\src\domain\assistant\natural-language-parser.ts`
- `C:\xw\src\domain\ai\tool-types.ts`
- `C:\xw\src\domain\ai\tool-schemas.ts`
- `C:\xw\src\domain\ai\tool-registry.ts`
- `C:\xw\src\domain\ai\runtime-log.ts`
- `C:\xw\src\lib\server\assistant.ts`
- `C:\xw\src\lib\actions\assistant.ts`

### Read model and policy
- `C:\xw\src\domain\transactions\policy.ts`
- `C:\xw\src\lib\server\transactions-read-model.ts`
- `C:\xw\tsconfig.json`

### Tests
- `C:\xw\src\tests\unit\ai-tools.test.ts`
- `C:\xw\src\tests\unit\assistant-natural-language-parser.test.ts`
- `C:\xw\src\tests\unit\assistant-server.test.ts`
- `C:\xw\src\tests\unit\transactions-read-model.test.ts`

## Validation results

Final Sprint 10 validation on 2026-05-02:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `41` test files passed
  - `331` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - unauthenticated direct run: `4` passed, `1` authenticated test skipped without env
  - authenticated env run: `5` Playwright tests passed
  - Sprint 8 restore regression executed and passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 10 closeout.

### Known risks and seams
- Category spending questions require a controlled category match; ambiguous or unknown categories do not run a summary.
- The answers are simple tracked-data summaries, not financial advice.
- Multi-currency answers are preserved by currency rather than converted.
- Receipt OCR, PDF import, bank/card linking, and richer dashboards remain out of scope.

## xw update instruction
Update now.

Sprint 10 is safe to freeze as `xw-sprint-10-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-10-ready`.
2. Start Sprint 11 only from the frozen Sprint 10 baseline.
3. Keep Assistant financial questions read-only and tracked-data-only.
4. Do not add PDF import, bank/card linking, new primary pages, financial advice, arbitrary SQL, or uncontrolled AI behavior.
