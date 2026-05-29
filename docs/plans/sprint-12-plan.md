# Sprint 12 Plan Recommendation

## Recommended Objective
Harden the monthly clarity experience with small user-facing refinements while preserving tracked-data-only Insights, read-only Assistant questions, receipt import safety, and restore regression coverage.

## Recommended Scope
- Add one authenticated e2e smoke test for the Insights page if stable test data can be prepared cleanly.
- Improve low-data copy for users with only income or only expenses.
- Add explicit multi-currency copy if mixed-currency tracked data appears.
- Consider a compact link from Needs Review prompt to the existing Transactions needs-review view.
- Keep the existing three primary pages only.

## Guardrails
- No new primary page.
- No PDF import support.
- No bank/card linking.
- No Available balance wording.
- No bank-balance claims.
- No financial advice.
- No accounting dashboard.
- No direct assistant database access.
- No uncontrolled AI behavior.

## Suggested Done Criteria
- Insights remains mobile-first, calm, and practical.
- Monthly clarity remains sourced only from user-owned tracked transactions.
- Sprint 8 restore, Sprint 9 receipt import, and Sprint 10 Assistant read question regressions remain green.
- Full validation passes before packaging.
