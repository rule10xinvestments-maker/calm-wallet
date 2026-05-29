# Sprint 12 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Budget Setup v1 on top of `xw-sprint-11-ready`, preserving accepted restore, receipt import, Assistant spending questions, and Insights monthly clarity baselines.

Sprint 12 stayed limited to:
- optional monthly category budgets
- controlled expense/both categories only
- existing Insights page only
- compact add/edit/remove controls
- budget progress math in the Insights read model

## What shipped
- Added budget domain schemas, policy helpers, and service-layer functions.
- Added authenticated budget server actions for save and remove.
- Added own-row budget delete RLS policy, because the existing table had select/insert/update policies but no delete policy.
- Extended Insights data with budget category options and current-month budget progress.
- Added progress values for amount, actual spending, remaining amount, percent used, and over-budget state.
- Added compact budget setup controls inside the existing Insights page.
- Added budget empty state: `Set a monthly category budget to track progress here.`
- Preserved Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant read questions, and Sprint 11 monthly clarity behavior.

## Intentionally not shipped
- New primary pages
- Custom categories
- Rollover budgets
- Envelope budgeting system
- Forecasting
- Bank or card linking
- PDF import support
- Bank-balance language
- Available balance wording
- Assistant budget-writing tool
- Uncontrolled AI behavior

## Files changed summary

### Budget domain and actions
- `C:\xw\src\domain\budgets\schemas.ts`
- `C:\xw\src\domain\budgets\policy.ts`
- `C:\xw\src\domain\budgets\service.ts`
- `C:\xw\src\domain\budgets\types.ts`
- `C:\xw\src\lib\actions\budgets.ts`
- `C:\xw\src\lib\actions\budgets-state.ts`
- `C:\xw\src\supabase\migrations\20260503001000_sprint12_budget_delete_policy.sql`

### Insights
- `C:\xw\src\app\(protected)\insights\page.tsx`
- `C:\xw\src\components\screens\insights-overview.tsx`
- `C:\xw\src\lib\server\transactions-read-model.ts`

### Tests
- `C:\xw\src\tests\unit\budgets-domain.test.ts`
- `C:\xw\src\tests\unit\budgets-action.test.ts`
- `C:\xw\src\tests\unit\transactions-read-model.test.ts`
- `C:\xw\src\tests\unit\insights-overview.test.tsx`
- `C:\xw\src\tests\unit\insights-read-model-server.test.ts`

## Validation results

Final Sprint 12 validation on 2026-05-03:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `45` test files passed
  - `351` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - authenticated env run passed `5` Playwright tests
  - Sprint 8 restore regression executed and passed

Focused Sprint 12 validation also passed:
- `5` test files passed
- `26` tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 12 closeout.

### Known risks and seams
- Budget removal deletes the budget row because the existing schema has no soft-delete or active-state column.
- Budgets are scoped to a single month and category; no rollover or envelope budgeting exists.
- Budget progress uses tracked current-month expenses only.
- Multi-currency budget behavior is kept simple through each budget row currency.
- The Insights UI remains lightweight and not a planning dashboard.

## xw update instruction
Update now.

Sprint 12 is safe to freeze as `xw-sprint-12-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-12-ready`.
2. Start Sprint 13 only from the frozen Sprint 12 baseline.
3. Keep budgets optional, controlled-category-only, and Insights-scoped.
4. Do not add PDF import, bank/card linking, new primary pages, custom categories, rollover budgets, envelope budgeting, forecasting, Assistant budget-writing tools, Available balance wording, or uncontrolled AI behavior.
