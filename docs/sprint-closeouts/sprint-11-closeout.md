# Sprint 11 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Insights Page v1 as a monthly clarity layer on top of `xw-sprint-10-ready`, using tracked user-owned data only and preserving the accepted Sprint 8 restore, Sprint 9 receipt import, and Sprint 10 Assistant spending question baselines.

Sprint 11 stayed limited to:
- monthly tracked spending total
- monthly tracked income total
- Tracked balance from tracked transactions
- category breakdown
- largest recent expenses
- Needs Review count
- empty and low-data states
- existing Insights primary page only

## What shipped
- Expanded the shared transaction read model used by Insights.
- Added current-month transaction counts and tracked transaction counts.
- Added Needs Review count to the Insights data.
- Added category totals with transaction counts.
- Added largest recent tracked expenses.
- Rebuilt the Insights page into a calm mobile-first monthly clarity view.
- Added empty-state and low-data-state copy.
- Kept copy transparent that Insights are based only on tracked data.
- Preserved Sprint 10 Assistant financial question behavior.
- Preserved Sprint 9 receipt image import behavior.
- Preserved Sprint 8 restore regression.

## Intentionally not shipped
- New primary pages
- PDF imports
- Bank or card linking
- Available-balance wording
- Bank-balance claims
- Accounting dashboard
- Financial advice
- Direct assistant database access
- Uncontrolled AI behavior

## Files changed summary

### Insights read model and UI
- `C:\xw\src\lib\server\transactions-read-model.ts`
- `C:\xw\src\components\screens\insights-overview.tsx`

### Tests
- `C:\xw\src\tests\unit\transactions-read-model.test.ts`
- `C:\xw\src\tests\unit\insights-overview.test.tsx`
- `C:\xw\src\tests\unit\insights-read-model-server.test.ts`

## Validation results

Final Sprint 11 validation on 2026-05-03:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `43` test files passed
  - `338` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - authenticated env run passed `5` Playwright tests
  - Sprint 8 restore regression executed and passed

Focused Sprint 11 regression validation also passed:
- `7` test files passed
- `81` tests passed
- covered Insights, Sprint 10 Assistant read questions, Sprint 9 receipt import, and related read-model behavior

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 11 closeout.

### Known risks and seams
- Multi-currency Insights still display in the profile/default currency for page-level summaries.
- Largest recent expenses are simple tracked transaction ordering by amount, not anomaly detection.
- Category breakdown uses controlled category labels where available and falls back to Uncategorized or Controlled category.
- Insights remains intentionally lightweight and not a finance dashboard.

## xw update instruction
Update now.

Sprint 11 is safe to freeze as `xw-sprint-11-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-11-ready`.
2. Start Sprint 12 only from the frozen Sprint 11 baseline.
3. Keep Insights practical, tracked-data-only, and mobile-first.
4. Do not add PDF import, bank/card linking, new primary pages, financial advice, Available balance wording, accounting dashboards, or uncontrolled AI behavior.
