# Sprint 13 Plan Recommendation

## Recommended Objective
Harden Budget Setup v1 and Insights budget ergonomics without expanding into planning-system scope.

## Recommended Scope
- Add an authenticated e2e smoke test for creating and removing one category budget if test data setup is stable.
- Improve budget form affordances for users with no expense categories available.
- Add clearer copy for over-budget and no-spend budget states.
- Consider linking budget review prompts to existing Transactions filters only if it stays compact.
- Keep all budget behavior inside the existing Insights page.

## Guardrails
- No new primary page.
- No custom categories.
- No rollover budgets.
- No envelope budgeting system.
- No forecasting.
- No Assistant budget-writing tool.
- No PDF import support.
- No bank/card linking.
- No Available balance wording.
- No bank-balance claims.
- No uncontrolled AI behavior.

## Suggested Done Criteria
- Budget setup remains optional and lightweight.
- Budget progress remains based only on tracked current-month transactions.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant read questions, and Sprint 11 Insights regressions remain green.
- Full validation passes before packaging.
